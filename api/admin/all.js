const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Erreur", error: e.message });
  }
};
