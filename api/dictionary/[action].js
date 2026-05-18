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
          // 2. Look up translations for individual words (case-insensitive)
          const orQuery = wordsArray.map(w => `french.ilike.${w},fon.ilike.${w}`).join(',');
          const { data: wordTranslations } = await supabase
            .from('words')
            .select('french, fon, phonetic, category')
            .eq('status', 'approved')
            .or(orQuery);

          const wordByWord = wordsArray.map(word => {
            const matches = wordTranslations?.filter(t => 
              (t.french && t.french.toLowerCase() === word) || (t.fon && t.fon.toLowerCase() === word)
            ) || [];

            if (matches.length > 0) {
              // Smart sort:
              // 1. Prefer Vocabulaire category first
              // 2. Prefer shorter translations (single words) over long phrase matches
              matches.sort((a, b) => {
                const scoreA = a.category === 'Vocabulaire' ? 0 : 1;
                const scoreB = b.category === 'Vocabulaire' ? 0 : 1;
                if (scoreA !== scoreB) return scoreA - scoreB;
                return (a.fon || '').length - (b.fon || '').length;
              });

              const match = matches[0];
              const isFrenchWord = match.french && match.french.toLowerCase() === word;
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

          // 3. Find example sentences containing the words (excluding grammatical noise)
          const COMMON_GRAMMAR_WORDS = new Set([
            'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
            'me', 'te', 'se', 'le', 'la', 'les', 'un', 'une', 'des', 'du',
            'mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses',
            'notre', 'votre', 'leur', 'nos', 'vos', 'leurs',
            'ce', 'cet', 'cette', 'ces', 'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car',
            'qui', 'que', 'quoi', 'dont', 'ou', 'où', 'qu', 'dans', 'sur', 'sous', 'pour',
            'avec', 'par', 'pour', 'dans', 'en', 'aux', 'des', 'les', 'au', 'aux', 'a', 'est', 'ont', 'sont'
          ]);

          const significantWords = wordsArray.filter(w => w.length > 2 && !COMMON_GRAMMAR_WORDS.has(w));
          let exampleSentences = [];

          if (significantWords.length > 0) {
            // Query Supabase for each significant word in parallel to avoid common terms dominating the results
            const queries = significantWords.map(w => 
              supabase
                .from('words')
                .select('*')
                .eq('status', 'approved')
                .or(`french.ilike.%${w}%,fon.ilike.%${w}%`)
                .limit(20)
            );

            const queryResults = await Promise.all(queries);
            let allSentences = [];
            const seenIds = new Set();

            // Interleave query results (round-robin) to guarantee equal representation of all search terms
            const maxLength = Math.max(...queryResults.map(r => r.data ? r.data.length : 0));
            for (let i = 0; i < maxLength; i++) {
              queryResults.forEach(res => {
                if (res.data && res.data[i]) {
                  const s = res.data[i];
                  if (!seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    allSentences.push(s);
                  }
                }
              });
            }

            if (allSentences.length > 0) {
              // Filter out exactMatches duplicates, then rank by relevance score (number of matched significant words)
              exampleSentences = allSentences
                .filter(s => !exactMatches.some(em => em.id === s.id))
                .map(s => {
                  const content = `${s.french || ''} ${s.fon || ''}`.toLowerCase();
                  let score = 0;
                  significantWords.forEach(w => {
                    if (content.includes(w)) score++;
                  });
                  return { ...s, relevanceScore: score };
                })
                .sort((a, b) => b.relevanceScore - a.relevanceScore)
                .slice(0, 30); // Return top 30 most relevant sentences
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
        .eq('status', 'approved')
        .not('category', 'in', '("Bible","Phrase")');

      if (error) throw error;
      
      if (!data || data.length === 0) {
        // Fallback to any approved entry if no short words found
        const { data: fallbackData, error: fallbackErr } = await supabase
          .from('words')
          .select('*')
          .eq('status', 'approved')
          .limit(100);
          
        if (fallbackErr) throw fallbackErr;
        if (!fallbackData || fallbackData.length === 0) return res.status(200).json(null);
        
        const randomWord = fallbackData[Math.floor(Math.random() * fallbackData.length)];
        return res.status(200).json(randomWord);
      }
      
      const randomWord = data[Math.floor(Math.random() * data.length)];
      return res.status(200).json(randomWord);
    }

    return res.status(404).json({ error: `Dictionary action '${action}' not found` });
  } catch (e) {
    console.error(`Dictionary Error (${action}):`, e);
    return res.status(500).json({ success: false, message: e.message || "Erreur interne" });
  }
};
