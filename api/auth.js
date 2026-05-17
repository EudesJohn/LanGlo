const supabase = require('./lib/supabase');

module.exports = async (req, res) => {
  const action = req.params?.action || req.url.split('/').pop().split('?')[0];

  try {
    // 1. LOGIN
    if (action === 'login') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { email, password } = req.body;
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        return res.status(200).json({ success: false, message: "Email ou mot de passe incorrect." });
      }

      const userRef = authData.user;
      const { data: dbUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      const { count: contributions_count } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('added_by', dbUser?.id || 0);

      res.cookie('token', authData.session.access_token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      return res.status(200).json({
        success: true,
        user: {
          ...userRef,
          ...userRef.user_metadata,
          db_id: dbUser?.id,
          contributions_count: contributions_count || 0
        }
      });
    }

    // 2. REGISTER
    if (action === 'register') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { name, email, password, nationality, ethnicity } = req.body;
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name, nationality, ethnicity, role: 'user' }
        }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase
        .from('users')
        .insert([{
          id: authData.user.id,
          name,
          email,
          role: 'user',
          nationality,
          ethnicity
        }])
        .select();

      if (dbError) {
        console.error("Database sync error (public.users):", dbError);
        if (dbError.code === '23505') {
          return res.status(400).json({ success: false, message: "Cet email est déjà enregistré." });
        }
      }

      if (authData.session) {
        res.cookie('token', authData.session.access_token, {
          httpOnly: true,
          sameSite: 'strict',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });
      }

      return res.status(200).json({
        success: true,
        user: authData.user,
        message: "Vérifiez vos emails pour confirmer l'inscription !"
      });
    }

    // 3. PROFILE UPDATE
    if (action === 'profile-update') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { id, email, name, pseudo, nationality, ethnicity, role, avatar_base64 } = req.body;
      
      if (!id) return res.status(400).json({ success: false, message: "Échec : Identifiant utilisateur manquant." });
      if (!email) return res.status(400).json({ success: false, message: "Échec : Adresse Email manquante." });

      let avatar_url = req.body.avatar_url || null;

      if (avatar_base64) {
        try {
          const fileName = `${id}_${Date.now()}.jpg`;
          const fileBuffer = Buffer.from(avatar_base64, 'base64');
          const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, fileBuffer, { contentType: 'image/jpeg', upsert: true });

          if (uploadError) {
            console.warn("Storage Error (Avatars):", uploadError.message);
          } else {
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
            avatar_url = urlData.publicUrl;
          }
        } catch (err) {
          console.error("Avatar Process Error:", err);
        }
      }

      const safeData = {
        email,
        name: name || "Utilisateur Gbé Tché",
        pseudo: pseudo || null,
        nationality: nationality || "Béninoise",
        ethnicity: ethnicity || "Fon",
        role: role || 'user',
        avatar_url
      };

      const { data, error } = await supabase
        .from('users')
        .upsert({ id, ...safeData })
        .select()
        .single();

      if (error) {
        console.error("Supabase UPSERT Error:", error);
        if (error.code === '42703') {
          throw new Error(`Erreur Schema : Une colonne est manquante dans la base de données.`);
        }
        throw new Error(`Erreur Base de Données : ${error.message}`);
      }

      let contributions_count = 0;
      try {
        const { count } = await supabase
          .from('words')
          .select('*', { count: 'exact', head: true })
          .eq('added_by', id);
        contributions_count = count || 0;
      } catch (statError) {
        console.error("Stats fetch error:", statError);
      }

      return res.status(200).json({ 
        success: true, 
        user: { ...data, contributions_count } 
      });
    }

    // 4. FORGOT PASSWORD
    if (action === 'forgot-password') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: "Email requis." });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${req.headers.origin}/reset-password`, 
      });

      if (error) throw error;

      return res.status(200).json({ 
        success: true, 
        message: "Lien de réinitialisation envoyé ! Vérifiez vos emails." 
      });
    }

    // 5. RESET PASSWORD
    if (action === 'reset-password') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis.' });
      }

      const { error: sessionErr } = await supabase.auth.setSession({ access_token: token, refresh_token: '' });
      if (sessionErr) throw sessionErr;

      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw updateErr;

      return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
    }

    return res.status(404).json({ error: `Auth action '${action}' not found` });
  } catch (e) {
    console.error(`Auth Error (${action}):`, e);
    return res.status(500).json({ success: false, message: e.message || "Erreur interne" });
  }
};
