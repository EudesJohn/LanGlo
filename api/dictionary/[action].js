const supabase = require('../lib/supabase');

// ============================================================
// Moteur de Règles Grammaticales (Fon Rule-Based Syntax)
// ============================================================
function applyFonGrammarRules(wordByWordArray) {
  // Règle 1 : Adjectifs possessifs en français
  const POSSESSIVES = new Set(['mon', 'ton', 'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'notre', 'votre', 'leur', 'nos', 'vos', 'leurs']);
  // Règle 2 : Articles et quantités
  const ARTICLES_QUANTITIES = new Set(['un', 'une', 'des', 'le', 'la', 'les', 'ce', 'cet', 'cette', 'ces', 'deux', 'trois', 'quatre', 'cinq', 'plusieurs', 'quelques']);

  // Copie pour ne pas muter l'original pendant le traitement
  let assembled = [...wordByWordArray];

  for (let i = 0; i < assembled.length - 1; i++) {
    const currentWord = assembled[i].original.toLowerCase();
    
    if (POSSESSIVES.has(currentWord) || ARTICLES_QUANTITIES.has(currentWord)) {
      // Inverser avec le mot suivant (ex: "mon" [i] "papa" [i+1] -> "papa" "mon")
      const temp = assembled[i];
      assembled[i] = assembled[i+1];
      assembled[i+1] = temp;
      
      i++; // Sauter le mot suivant puisqu'il a déjà été traité
    }
  }

  // Joindre les traductions valides
  return assembled
    .filter(w => w.found && w.translation)
    .map(w => w.translation)
    .join(' ');
}

// Fonction utilitaire pour le surlignage croisé
function highlightCrossLingual(sentenceObj, frenchTarget, fonTarget) {
  let fr = sentenceObj.french || '';
  let fo = sentenceObj.fon || '';

  if (frenchTarget) {
    const regexFr = new RegExp(`(${frenchTarget})`, 'gi');
    fr = fr.replace(regexFr, '<mark class="highlight-premium">$1</mark>');
  }
  
  if (fonTarget) {
    // Échapper les caractères spéciaux du mot fon si nécessaire
    const safeFonTarget = fonTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexFo = new RegExp(`(${safeFonTarget})`, 'gi');
    fo = fo.replace(regexFo, '<mark class="highlight-premium">$1</mark>');
  }

  return { 
    ...sentenceObj, 
    french_highlighted: fr, 
    fon_highlighted: fo 
  };
}

module.exports = async (req, res) => {
  const action = req.params?.action || req.query?.action || req.url.split('/').pop().split('?')[0];

  try {
    // ============================================================
    // 1. ADD WORD
    // ============================================================
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
          console.error('Critical Upload Error:', uploadErr.message);
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
        return res.status(400).json({ success: false, message: 'Les champs Français et Fon sont obligatoires.' });
      }

      // Check for duplicate French & Fon case-insensitive
      const { data: existingWord, error: checkError } = await supabase
        .from('words')
        .select('id, status')
        .ilike('french', frenchWord)
        .ilike('fon', fonWord)
        .maybeSingle();

      if (checkError) {
        console.error('Duplicate check error:', checkError.message);
      }

      if (existingWord) {
        const state = existingWord.status === 'approved' ? 'déjà approuvé et publié' : 'déjà suggéré et en attente de validation';
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
        console.error('DB Insert Error:', error.message);
        throw new Error(`Base de données : ${error.message}`);
      }

      return res.status(200).json({ success: true, data: data ? data[0] : null });
    }

    // ============================================================
    // 2. SEARCH WORDS — Moteur style Glosbe
    // ============================================================
    if (action === 'search') {
      const { q } = req.query;
      const searchTerm = (q || '').trim();

      if (!searchTerm) {
        return res.status(200).json({ isSentence: false, exactMatches: [], wordByWord: [], exampleSentences: [] });
      }

      // Tokenize ALL words (including grammatical words — Glosbe les traduit aussi !)
      const wordsArray = searchTerm
        .toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"]/g, '')
        .split(/\s+/)
        .filter(w => w.trim().length > 0);

      // ----------------------------------------------------------
      // ÉTAPE 1 : Recherche exacte de la phrase ou du mot complet
      // ----------------------------------------------------------
      const { data: exactMatchesRaw, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .or(`french.ilike.%${searchTerm}%,fon.ilike.%${searchTerm}%`)
        .limit(50);

      if (error) throw error;

      // Tri intelligent des exactMatches pour mettre les VRAIES correspondances exactes en premier
      const exactMatches = (exactMatchesRaw || []).sort((a, b) => {
        const aFr = (a.french || '').toLowerCase().trim();
        const bFr = (b.french || '').toLowerCase().trim();
        const searchLow = searchTerm.toLowerCase().trim();
        
        // 1. Correspondance exacte absolue (ex: taper "moto" trouve "moto")
        const aExact = aFr === searchLow ? 1 : 0;
        const bExact = bFr === searchLow ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        
        // 2. Vocabulaire en priorité
        const aVocab = a.category === 'Vocabulaire' ? 1 : 0;
        const bVocab = b.category === 'Vocabulaire' ? 1 : 0;
        if (aVocab !== bVocab) return bVocab - aVocab;
        
        // 3. Plus court en premier
        return aFr.length - bFr.length;
      });

      // ----------------------------------------------------------
      // ÉTAPE 2 : Si phrase → traduction mot-à-mot (style Glosbe)
      // ----------------------------------------------------------
      if (wordsArray.length > 1) {
        try {
          // Chercher chaque mot individuellement en parallèle
          // Glosbe utilise uniquement les entrées de dictionnaire (Vocabulaire)
          // et préfère les traductions d'un seul mot
          const wordLookupQueries = wordsArray.map(w =>
            supabase
              .from('words')
              .select('french, fon, phonetic, category')
              .eq('status', 'approved')
              .ilike('french', w)
              .order('category', { ascending: false })  // Vocabulaire > Phrase > Bible (V > P > B)
              .order('created_at', { ascending: false }) // entrées récentes (corrigées) en priorité
              .limit(20)
          );

          const wordLookupResults = await Promise.all(wordLookupQueries);

          const wordByWord = wordsArray.map((word, idx) => {
            const candidates = wordLookupResults[idx]?.data || [];

            if (candidates.length === 0) {
              return { original: word, translation: null, phonetic: null, found: false };
            }

            // Tri : Vocabulaire en premier, puis traduction Fon la plus courte
            candidates.sort((a, b) => {
              const scoreA = a.category === 'Vocabulaire' ? 0 : 1;
              const scoreB = b.category === 'Vocabulaire' ? 0 : 1;
              if (scoreA !== scoreB) return scoreA - scoreB;
              const fonLenA = (a.fon || '').trim().split(/\s+/).length;
              const fonLenB = (b.fon || '').trim().split(/\s+/).length;
              if (fonLenA !== fonLenB) return fonLenA - fonLenB;
              return (a.fon || '').length - (b.fon || '').length;
            });

            const best = candidates[0];
            // Ne garder que le premier mot si la traduction Fon est trop longue
            const fonWords = (best.fon || '').trim().split(/\s+/);
            const translation = fonWords.length <= 2 ? best.fon : fonWords[0];

            return {
              original: word,
              translation,
              phonetic: best.phonetic || null,
              found: true
            };
          });

          // ----------------------------------------------------------
          // ÉTAPE 3 : Phrases d'exemples — uniquement vraies phrases
          // (Glosbe ne montre jamais des mots isolés comme exemples)
          // ----------------------------------------------------------

          // Mots fonctionnels purs à exclure de la recherche de phrases
          const PURE_FUNCTION_WORDS = new Set([
            'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en',
            'a', 'au', 'aux', 'ce', 'cet', 'cette', 'ces',
            'qui', 'que', 'qu', 'ou', 'ou'
          ]);

          // Mots de contenu (longueur >= 3 et pas mot fonctionnel pur)
          const searchableWords = wordsArray.filter(w =>
            w.length >= 3 && !PURE_FUNCTION_WORDS.has(w)
          );

          let exampleSentences = [];

          if (searchableWords.length > 0) {
            // Concordance parallèle : requête par mot, comme Glosbe
            // Simulation des frontières de mots avec les espaces
            const sentenceQueries = searchableWords.map(w =>
              supabase
                .from('words')
                .select('*')
                .eq('status', 'approved')
                .or(
                  `french.ilike.% ${w} %,` +
                  `french.ilike.${w} %,` +
                  `french.ilike.% ${w},` +
                  `fon.ilike.% ${w} %,` +
                  `fon.ilike.${w} %,` +
                  `fon.ilike.% ${w}`
                )
                .limit(25)
            );

            const sentenceResults = await Promise.all(sentenceQueries);
            const seenIds = new Set();
            const allCandidates = [];

            // Entrelacement round-robin pour représentation équitable de chaque mot
            const maxLen = Math.max(...sentenceResults.map(r => r.data ? r.data.length : 0));
            for (let i = 0; i < maxLen; i++) {
              sentenceResults.forEach(res => {
                if (res.data && res.data[i]) {
                  const s = res.data[i];
                  if (!seenIds.has(s.id)) {
                    seenIds.add(s.id);
                    allCandidates.push(s);
                  }
                }
              });
            }

            // Filtre : uniquement les vraies phrases (>= 2 mots en français)
            // + score de pertinence + pénalité de longueur (Glosbe préfère les phrases courtes)
            exampleSentences = allCandidates
              .filter(s => {
                if (exactMatches.some(em => em.id === s.id)) return false;
                const frWordCount = (s.french || '').trim().split(/\s+/).length;
                return frWordCount >= 2;
              })
              .map(s => {
                const frContent = (s.french || '').toLowerCase();
                const fonContent = (s.fon || '').toLowerCase();

                let score = 0;
                searchableWords.forEach(w => {
                  if (frContent.includes(w)) score += 2;
                  else if (fonContent.includes(w)) score += 1;
                });

                // Pénalité pour les phrases trop longues (versets bibliques de 300 chars)
                const lengthPenalty = Math.min((s.french || '').length / 200, 1);
                const finalScore = score - lengthPenalty;

                return { ...s, relevanceScore: parseFloat(finalScore.toFixed(3)) };
              })
              .filter(s => s.relevanceScore > 0)
              .sort((a, b) => b.relevanceScore - a.relevanceScore)
              .slice(0, 25);
          }

          return res.status(200).json({
            isSentence: true,
            exactMatches: exactMatches || [],
            wordByWord,
            assembledSentence: applyFonGrammarRules(wordByWord),
            exampleSentences
          });

        } catch (innerErr) {
          console.error('Search Error (phrase):', innerErr);
        }
      }

      // ----------------------------------------------------------
      // Recherche d'un seul mot : isolation & surlignage croisé
      // ----------------------------------------------------------
      let singleWordExamples = [];
      let exactWord = null;
      let leftoverExactAsExamples = [];

      // Si le tri a trouvé une vraie correspondance (Vocabulaire et mot français exact)
      if (exactMatches.length > 0) {
        const first = exactMatches[0];
        if (first.french.toLowerCase().trim() === searchTerm.toLowerCase().trim() && first.category === 'Vocabulaire') {
          exactWord = first;
          leftoverExactAsExamples = exactMatches.slice(1);
        } else if (first.french.toLowerCase().trim() === searchTerm.toLowerCase().trim()) {
          exactWord = first; // Même si c'est Phrase, c'est exactement le mot
          leftoverExactAsExamples = exactMatches.slice(1);
        } else {
          leftoverExactAsExamples = exactMatches;
        }
      }

      if (wordsArray.length === 1 && wordsArray[0].length >= 2) {
        const w = wordsArray[0];
        const { data: exData } = await supabase
          .from('words')
          .select('*')
          .eq('status', 'approved')
          .or(
            `french.ilike.% ${w} %,` +
            `french.ilike.${w} %,` +
            `french.ilike.% ${w},` +
            `fon.ilike.% ${w} %,` +
            `fon.ilike.${w} %,` +
            `fon.ilike.% ${w}`
          )
          .limit(30);

        if (exData) {
          singleWordExamples = exData
            .filter(s => {
              // Exclure si déjà présent dans leftoverExactAsExamples ou exactWord
              if (exactWord && exactWord.id === s.id) return false;
              if (leftoverExactAsExamples.some(em => em.id === s.id)) return false;
              return (s.french || '').trim().split(/\s+/).length >= 2;
            })
            .slice(0, 20);
        }
      }

      // Concaténer tous les exemples et appliquer le surlignage
      const allExamplesForSingleWord = [...leftoverExactAsExamples, ...singleWordExamples].filter(s => {
        return (s.french || '').trim().split(/\s+/).length >= 2; // Ne garder que de vraies phrases en exemple
      }).map(s => {
        return highlightCrossLingual(s, searchTerm, exactWord ? exactWord.fon : null);
      });

      return res.status(200).json({
        isSentence: false,
        exactWord: exactWord, // Le mot isolé et traduit parfaitement
        exactMatches: exactWord ? [exactWord] : [], // Rétro-compatibilité
        wordByWord: [],
        exampleSentences: allExamplesForSingleWord
      });
    }

    // ============================================================
    // 3. RANDOM WORD
    // ============================================================
    if (action === 'random') {
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .not('category', 'in', '("Bible","Phrase")');

      if (error) throw error;

      if (!data || data.length === 0) {
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
    return res.status(500).json({ success: false, message: e.message || 'Erreur interne' });
  }
};
