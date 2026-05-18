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
      const searchTerm = (q || '').trim();

      if (!searchTerm) {
        return res.status(200).json({ isSentence: false, exactMatches: [], wordByWord: [], exampleSentences: [] });
      }

      // 1. Fetch exact or substring matches
      const { data: exactMatches, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .or(`french.ilike.%${searchTerm}%,fon.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) throw error;

      // Clean and tokenize the search term
      const wordsArray = searchTerm
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, "") // remove punctuation
        .split(/\s+/)
        .filter(w => w.trim().length > 0);

      // If the query is a multi-word phrase
      if (wordsArray.length > 1) {
        try {
          // 2. Look up translations for individual words
          const orQuery = wordsArray.map(w => `french.eq.${w},fon.eq.${w}`).join(',');
          const { data: wordTranslations } = await supabase
            .from('words')
            .select('french, fon, phonetic, category')
            .eq('status', 'approved')
            .or(orQuery);

          const wordByWord = wordsArray.map(word => {
            const match = wordTranslations?.find(t => 
              t.french.toLowerCase() === word || t.fon.toLowerCase() === word
            );
            if (match) {
              const isFrenchWord = match.french.toLowerCase() === word;
              return {
                original: word,
                translation: isFrenchWord ? match.fon : match.french,
                phonetic: match.phonetic || null,
                found: true
              };
            } else {
              return {
                original: word,
                translation: null,
                found: false
              };
            }
          });

          // 3. Find example sentences containing the words
          const significantWords = wordsArray.filter(w => w.length > 2);
          let exampleSentences = [];

          if (significantWords.length > 0) {
            const sentenceOrQuery = significantWords
              .map(w => `french.ilike.%${w}%,fon.ilike.%${w}%`)
              .join(',');

            const { data: sentences } = await supabase
              .from('words')
              .select('*')
              .eq('status', 'approved')
              .or(sentenceOrQuery)
              .limit(30);

            if (sentences) {
              // Filter out exactMatches duplicates
              exampleSentences = sentences.filter(s => 
                !exactMatches.some(em => em.id === s.id)
              );
            }
          }

          return res.status(200).json({
            isSentence: true,
            exactMatches: exactMatches || [],
            wordByWord,
            exampleSentences
          });
        } catch (innerErr) {
          console.error("Glosbe Fallback Error:", innerErr);
        }
      }

      // Default single-word return
      return res.status(200).json({
        isSentence: false,
        exactMatches: exactMatches || [],
        wordByWord: [],
        exampleSentences: []
      });
    }
    
    // 3. RANDOM WORD
    if (action === 'random') {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved');

      if (error) throw error;
      if (!data || data.length === 0) return res.status(200).json(null);
      
      const randomWord = data[Math.floor(Math.random() * data.length)];
      return res.status(200).json(randomWord);
    }

    return res.status(404).json({ error: `Dictionary action '${action}' not found` });
  } catch (e) {
    console.error(`Dictionary Error (${action}):`, e);
    return res.status(500).json({ success: false, message: e.message || "Erreur interne" });
  }
};
