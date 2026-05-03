const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { id, email, name, pseudo, nationality, ethnicity, role, avatar_base64 } = req.body;
  
  if (!id) return res.status(400).json({ success: false, message: "Échec : Identifiant utilisateur manquant dans la requête." });
  if (!email) return res.status(400).json({ success: false, message: "Échec : Adresse Email manquante." });

  let avatar_url = req.body.avatar_url || null;

  // Handle Avatar Upload if base64 provided
  if (avatar_base64) {
    try {
      const fileName = `${id}_${Date.now()}.jpg`;
      const fileBuffer = Buffer.from(avatar_base64, 'base64');
      
      const { data: uploadData, error: uploadError } = await supabase.storage
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

  // Filter and provide defaults to avoid NOT NULL constraints in DB
  const safeData = {
    email,
    name: name || "Utilisateur Gbé Tché",
    pseudo: pseudo || null,
    nationality: nationality || "Béninoise",
    ethnicity: ethnicity || "Fon",
    role: role || 'user',
    avatar_url
  };

  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({ id, ...safeData })
      .select()
      .single();

    if (error) {
       console.error("Supabase UPSERT Error:", error);
       if (error.code === '42703') {
         throw new Error(`Erreur Schema : Une colonne est manquante dans la base de données. Veuillez exécuter le script de migration dans votre SQL Editor.`);
       }
       throw new Error(`Erreur Base de Données : ${error.message} (Code: ${error.code})`);
    }
    if (!data) throw new Error("Erreur lors de la synchronisation des données (aucune donnée retournée).");

    // Fetch refreshed stats safely
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
  } catch (e) {
    console.error("Profile Update Error:", e.message);
    return res.status(500).json({ success: false, message: e.message || "Erreur serveur lors de la mise à jour." });
  }
};
