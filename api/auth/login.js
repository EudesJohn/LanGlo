const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Missing credentials' });

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(200).json({ success: false, message: "Identifiants incorrects." });
    }

    return res.status(200).json({ 
      success: true, 
      user, 
      token: "sb-token-" + Date.now() 
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
};
