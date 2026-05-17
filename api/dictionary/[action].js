const supabase = require('../lib/supabase');

module.exports = async (req, res) => {
  const action = req.params?.action || req.query?.action || req.url.split('/').pop().split('?')[0];

  try {
    // 1. ADD WORD
    if (action === 'add') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { audio_base64, example_audio_base64, ...wordData } = req.body;

      const uploadAudio = async (base64, name) => {
        if (!base64) return null;
        try {
          const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          const fileName = `${Date.now()}_${name}.ogg`;
          
          const { error } = await supabase.storage
            .from('audios')
            .upload(fileName, buffer, { contentType: 'audio/ogg' });
          
          if (error) {
            console.error(`Storage Upload Error (${name}):`, error.message);
            return null;
          }
          
          const { data: { publicUrl } } = supabase.storage
            .from('audios')
            .getPublicUrl(fileName);
          
          return publicUrl;
        } catch (uploadErr) {
          console.error("Critical Upload Error:", uploadErr.message);
          return null;
        }
      };

      const audio_url = await uploadAudio(audio_base64, 'word');
      const example_audio_url = await uploadAudio(example_audio_base64, 'example');

      const { 
        audio_base64: _a, 
        example_audio_base64: _e, 
        wordAudioBlob: _w, 
        phraseAudioBlob: _p, 
        ...cleanRecord 
      } = wordData;

      const frenchWord = cleanRecord.french?.trim();
      const fonWord = cleanRecord.fon?.trim();

      if (!frenchWord || !fonWord) {
        return res.status(400).json({ success: false, message: "Les champs Français et Fon sont obligatoires." });
      }

      // Check for duplicate French & Fon case-insensitive
      const { data: existingWord, error: checkError } = await supabase
        .from('words')
        .select('id, status')
        .ilike('french', frenchWord)
        .ilike('fon', fonWord)
        .maybeSingle();

      if (checkError) {
        console.error("Duplicate check error:", checkError.message);
      }

      if (existingWord) {
        const state = existingWord.status === 'approved' ? "déjà approuvé et publié" : "déjà suggéré et en attente de validation";
        return res.status(400).json({
          success: false,
          message: `Ce mot ('${frenchWord}' - '${fonWord}') est ${state} dans le dictionnaire.`
        });
      }

      const { data, error } = await supabase
        .from('words')
        .insert([{
          ...cleanRecord,
          french: frenchWord,
          fon: fonWord,
          audio_url,
          example_audio_url,
          status: 'pending'
        }])
        .select();

      if (error) {
        console.error("DB Insert Error:", error.message);
        throw new Error(`Base de données : ${error.message}`);
      }
      
      return res.status(200).json({ success: true, data: data ? data[0] : null });
    }

    // 2. SEARCH WORDS
    if (action === 'search') {
      const { q } = req.query;
      const searchTerm = q || '';

      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .or(`french.ilike.%${searchTerm}%,fon.ilike.%${searchTerm}%`);

      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(404).json({ error: `Dictionary action '${action}' not found` });
  } catch (e) {
    console.error(`Dictionary Error (${action}):`, e);
    return res.status(500).json({ success: false, message: e.message || "Erreur interne" });
  }
};
