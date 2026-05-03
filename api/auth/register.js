const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { name, email, password, nationality, ethnicity } = req.body;
  
  try {
    // 1. Create User in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          nationality,
          ethnicity,
          role: 'user'
        }
      }
    });

    if (authError) throw authError;

    // 2. Sync with our public 'users' table (to allow for public profiles, relations, etc.)
    const { data: dbData, error: dbError } = await supabase
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
      // If user already exists in public.users but we are registering, we might need to handle it.
      // For now, we log it and return a message if it's a conflict.
      if (dbError.code === '23505') {
         return res.status(400).json({ success: false, message: "Cet email est déjà enregistré." });
      }
    }

    // Set httpOnly cookie with access token
      res.cookie('token', authData.session.access_token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      });
      return res.status(200).json({
        success: true,
        user: authData.user,
        message: "Vérifiez vos emails pour confirmer l'inscription !"
        // No token in body
      });
  } catch (e) {
    console.error("Registration Crash Error:", e);
    return res.status(500).json({ success: false, message: e.message || "Une erreur interne s'est produite." });
  }
};
