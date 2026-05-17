const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  const action = req.params?.action || req.query?.action || req.url.split('/').pop().split('?')[0];

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("ADMIN ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from environment variables!");
    return res.status(500).json({
      success: false,
      message: "Erreur de configuration : la clé secrète SUPABASE_SERVICE_ROLE_KEY est manquante dans les variables d'environnement de Vercel. Cette clé est indispensable pour valider, supprimer ou modifier des mots en tant qu'administrateur en contournant les politiques de sécurité (RLS) de Supabase."
    });
  }

  try {
    if (action === 'all') {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    } 
    
    if (action === 'pending') {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    } 
    
    if (action === 'approve') {
      const { id } = req.body;
      const { data, error } = await supabase
        .from('words')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } 
    
    if (action === 'delete') {
      const { id } = req.body;
      const { data, error } = await supabase
        .from('words')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    } 
    
    if (action === 'update') {
      const { id, french, fon, phonetic, category, example } = req.body;
      const { data, error } = await supabase
        .from('words')
        .update({ french, fon, phonetic, category, example })
        .eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true, data });
    }

    return res.status(404).json({ error: `Admin action '${action}' not found` });
  } catch (e) {
    return res.status(500).json({ message: "Erreur", error: e.message });
  }
};
