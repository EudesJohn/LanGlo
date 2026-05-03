const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: "Email requis." });

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.origin}/reset-password`, 
    });

    if (error) throw error;

    return res.status(200).json({ 
      success: true, 
      message: "Lien de réinitialisation envoyé ! Vérifiez vos emails." 
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
