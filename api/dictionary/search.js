const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  const { q } = req.query;
  const searchTerm = q || '';

  try {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .eq('status', 'approved')
      .or(`french.ilike.%${searchTerm}%,fon.ilike.%${searchTerm}%`);

    if (error) throw error;
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ message: "Erreur de recherche", error: e.message });
  }
};
