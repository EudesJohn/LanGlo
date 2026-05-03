const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const { id } = req.body;
  
  try {
    const { error } = await supabase
      .from('words')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return res.status(200).json({ success: true, message: "Mot supprimé définitivement." });
  } catch (e) {
    console.error("Delete Error:", e.message);
    return res.status(500).json({ success: false, message: e.message });
  }
};
