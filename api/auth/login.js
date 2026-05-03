const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { email, password } = req.body;
  
  try {
    // 1. Authenticate with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return res.status(200).json({ success: false, message: "Email ou mot de passe incorrect." });
    }

    // 2. Fetch stats and profile from our custom table or metadata
    const userRef = authData.user;
    
    // Check our users table for extra info
    const { data: dbUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    // Fetch stats
    const { count: contributions_count } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('added_by', dbUser?.id || 0);

    // Set httpOnly cookie with access token
      res.cookie('token', authData.session.access_token, {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
      });
      return res.status(200).json({
        success: true,
        user: {
          ...userRef,
          ...userRef.user_metadata,
          db_id: dbUser?.id,
          contributions_count: contributions_count || 0
        }
        // No token sent in body for security
      });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
};
