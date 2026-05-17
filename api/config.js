require('dotenv').config();

module.exports = async (req, res) => {
  const action = req.params?.action || req.url.split('/').pop().split('?')[0];

  if (action === 'supabase') {
    return res.status(200).json({
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY
    });
  }

  return res.status(404).json({ error: `Config action '${action}' not found` });
};
