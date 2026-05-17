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

      // Check current status to prevent double-approval
      const { data: currentWord, error: getError } = await supabase
        .from('words')
        .select('french, fon, status')
        .eq('id', id)
        .maybeSingle();

      if (getError) throw getError;
      if (!currentWord) {
        return res.status(404).json({ success: false, message: "Ce mot n'existe pas." });
      }
      
      if (currentWord.status === 'approved') {
        return res.status(400).json({ 
          success: false, 
          message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a déjà été approuvé et publié !` 
        });
      }

      const { data, error } = await supabase
        .from('words')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a été approuvé et publié !`,
        data 
      });
    } 
    
    if (action === 'delete') {
      const { id } = req.body;

      // Check if word exists before deleting
      const { data: currentWord, error: getError } = await supabase
        .from('words')
        .select('french, fon')
        .eq('id', id)
        .maybeSingle();

      if (getError) throw getError;
      if (!currentWord) {
        return res.status(404).json({ success: false, message: "Ce mot n'existe pas ou a déjà été supprimé." });
      }

      const { error } = await supabase
        .from('words')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      return res.status(200).json({ 
        success: true, 
        message: `Le mot ('${currentWord.french}' - '${currentWord.fon}') a été supprimé définitivement.` 
      });
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
