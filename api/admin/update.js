const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
  const word = req.body;
  
  try {
    const { data, error } = await supabase
      .from('words')
      .update(word)
      .eq('id', word.id)
      .select();

    if (error) throw error;
    return res.status(200).json({ success: true, word: data[0] });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};
