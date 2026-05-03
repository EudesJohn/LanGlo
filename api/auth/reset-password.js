const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { token, password } = req.body;
  if (!token || !password) {
    return res.status(400).json({ success: false, message: 'Token et nouveau mot de passe requis.' });
  }

  try {
    // Initialise la session avec le token fourni (refresh_token not needed for password change)
    const { error: sessionErr } = await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    if (sessionErr) throw sessionErr;

    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) throw updateErr;

    return res.status(200).json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
  } catch (e) {
    console.error('Reset password error:', e);
    return res.status(500).json({ success: false, message: e.message || 'Erreur serveur.' });
  }
};
