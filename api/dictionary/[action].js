const supabase = require('../lib/supabase');
const { verifyAdmin } = require('../lib/auth');
const { logActivity } = require('../lib/activity');

function applyFonGrammarRules(wordByWordArray) {
  const POSSESSIVES_MAP = {
    'mon': 'ce', 'ma': 'ce', 'mes': 'ce',
    'ton': 'towe', 'ta': 'towe', 'tes': 'towe',
    'son': 'tɔn', 'sa': 'tɔn', 'ses': 'tɔn',
    'notre': 'mitɔn', 'nos': 'mitɔn',
    'votre': 'mitɔn', 'vos': 'mitɔn',
    'leur': 'yetɔn', 'leurs': 'yetɔn'
  };

  const ARTICLES_MAP = {
    'le': 'ɔ', 'la': 'ɔ', 'les': 'lɛ',
    'ce': 'élɔ', 'cet': 'élɔ', 'cette': 'élɔ', 'ces': 'élɔ lɛ',
    'un': 'ɖokpo', 'une': 'ɖokpo', 'des': 'ɖé lɛ'
  };

  const LINKING_MAP = {
    'et': 'kpo',
    'ou': 'aloo',
    'avec': 'kpɔdo',
    'dans': 'mɛ',
    'sur': 'jí',
    'sous': 'glɔ',
    'pour': 'nú',
    'est': 'nyí',
    'sont': 'nyí',
    'mais': 'ka',
    'de': 'sin'
  };

  let assembled = wordByWordArray.map(w => {
    let wordLower = w.original.toLowerCase();
    let translation = w.translation;
    let found = w.found;

    // Si on a un mot de liaison directement traduisible localement
    if (!found && LINKING_MAP[wordLower]) {
      translation = LINKING_MAP[wordLower];
      found = true;
    }

    return {
      original: w.original,
      translation: translation || w.original,
      found: found,
      isPossessive: POSSESSIVES_MAP.hasOwnProperty(wordLower),
      isArticle: ARTICLES_MAP.hasOwnProperty(wordLower),
      fonGrammarWord: POSSESSIVES_MAP[wordLower] || ARTICLES_MAP[wordLower] || null
    };
  });

  // Appliquer les inversions Fon (le déterminant se place APRÈS le nom)
  for (let i = 0; i < assembled.length - 1; i++) {
    if (assembled[i].isPossessive || assembled[i].isArticle) {
      // Le mot de grammaire prend sa traduction Fon spécifique
      assembled[i].translation = assembled[i].fonGrammarWord;
      
      // On l'inversera avec le mot suivant
      const temp = assembled[i];
      assembled[i] = assembled[i+1];
      assembled[i+1] = temp;
      
      i++; // Sauter le mot suivant puisqu'il a déjà été traité
    }
  }

  // Si le dernier mot est un possessif/article non inversé
  if (assembled.length > 0) {
    let last = assembled[assembled.length - 1];
    if ((last.isPossessive || last.isArticle) && last.translation === last.original) {
      last.translation = last.fonGrammarWord;
    }
  }

  return assembled
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

// Seeded random generator
function getSeededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// Function to get deterministic daily words indices
function getDailyIndices(count, numWords = 5) {
  const todayStr = new Date().toISOString().split('T')[0]; // e.g. "2026-05-19"
  let seed = 0;
  for (let i = 0; i < todayStr.length; i++) {
    seed += todayStr.charCodeAt(i);
  }

  const indices = [];
  for (let i = 0; i < numWords; i++) {
    const rand = getSeededRandom(seed + i * 17); // spread seeds
    const idx = Math.floor(rand * count);
    if (!indices.includes(idx)) {
      indices.push(idx);
    } else {
      indices.push((idx + 1) % count);
    }
  }
  return indices;
}

async function getDailyWords(numWords = 5) {
  try {
    const { count, error: countErr } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved')
      .eq('category', 'Mot');

    if (countErr || !count) {
      const { data } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .limit(numWords);
      return data || [];
    }

    const indices = getDailyIndices(count, numWords);
    const queries = indices.map(idx =>
      supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .eq('category', 'Mot')
        .range(idx, idx)
        .maybeSingle()
    );

    const results = await Promise.all(queries);
    return results.map(r => r.data).filter(Boolean);
  } catch (err) {
    console.error("Error in getDailyWords:", err);
    return [];
  }
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

      // Enregistrer l'activité si c'est un admin qui a ajouté le mot
      const adminUser = await verifyAdmin(req).catch(() => null);
      if (adminUser && data && data[0]) {
        await logActivity(adminUser, 'add', data[0].id, frenchWord, fonWord);
        if (audio_url || example_audio_url) {
          await logActivity(adminUser, 'audio_added', data[0].id, frenchWord, fonWord);
        }
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
        const dailyWords = await getDailyWords(5);
        return res.status(200).json({ 
          isSentence: false, 
          exactMatches: dailyWords, 
          wordByWord: [], 
          exampleSentences: [] 
        });
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
      const escapedSearchTerm = searchTerm.replace(/"/g, '\\"');
      const { data: exactMatchesRaw, error } = await supabase
        .from('words')
        .select('*')
        .eq('status', 'approved')
        .neq('category', 'Bible') // Les phrases bibliques ne sont pas affichées comme résultats directs
        .or(`french.ilike."%${escapedSearchTerm}%",fon.ilike."%${escapedSearchTerm}%"`)
        .order('category', { ascending: false }) // Prioritize Vocabulaire > Phrase
        .limit(50);

      if (error) throw error;

      // Tri intelligent des exactMatches pour mettre les VRAIES correspondances exactes en premier
      const exactMatches = (exactMatchesRaw || []).sort((a, b) => {
        const aFr = (a.french || '').toLowerCase().trim();
        const bFr = (b.french || '').toLowerCase().trim();
        const aFon = (a.fon || '').toLowerCase().trim();
        const bFon = (b.fon || '').toLowerCase().trim();
        const searchLow = searchTerm.toLowerCase().trim();
        
        // 1. Correspondance exacte absolue (Français ou Fon)
        const aExact = (aFr === searchLow || aFon === searchLow) ? 1 : 0;
        const bExact = (bFr === searchLow || bFon === searchLow) ? 1 : 0;
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
              .neq('category', 'Bible') // Exclure la Bible pour les traductions mot-à-mot directes
              .ilike('french', w)
              .order('category', { ascending: false })  // Vocabulaire > Phrase
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
                .neq('category', 'Bible') // Censure des phrases bibliques pour laïcité
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
                return frWordCount >= 2 && frWordCount <= 15 && (s.french || '').length <= 100;
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

      // Si le tri a trouvé une vraie correspondance (Vocabulaire et mot français ou fon exact)
      if (exactMatches.length > 0) {
        const first = exactMatches[0];
        const firstFr = (first.french || '').toLowerCase().trim();
        const firstFon = (first.fon || '').toLowerCase().trim();
        const searchLow = searchTerm.toLowerCase().trim();

        if ((firstFr === searchLow || firstFon === searchLow) && first.category === 'Vocabulaire') {
          exactWord = first;
        } else if (firstFr === searchLow || firstFon === searchLow) {
          exactWord = first; // Même si c'est Phrase, c'est exactement le mot
        }
      }

      // Trouver tous les mots de vocabulaire qui correspondent (pour ne pas cacher les mots dérivés ou proches)
      const allMatchingVocab = exactMatches.filter(item => item.category === 'Vocabulaire');
      if (exactWord && !allMatchingVocab.some(x => x.id === exactWord.id)) {
        allMatchingVocab.unshift(exactWord);
      }

      // Ce qui n'est pas dans le vocabulaire principal va dans les exemples
      const leftoverExactAsExamples = exactMatches.filter(item => {
        return !allMatchingVocab.some(v => v.id === item.id);
      });

      if (wordsArray.length === 1 && wordsArray[0].length >= 2) {
        const w = wordsArray[0];
        const { data: exData } = await supabase
          .from('words')
          .select('*')
          .eq('status', 'approved')
          .neq('category', 'Bible') // Censure des phrases bibliques pour laïcité
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
          const filteredEx = exData.filter(s => {
            // Exclure si déjà affiché dans les cartes de vocabulaire en haut
            if (allMatchingVocab.some(em => em.id === s.id)) return false;
            const frWordCount = (s.french || '').trim().split(/\s+/).length;
            return frWordCount >= 2 && frWordCount <= 15 && (s.french || '').length <= 100;
          });
          singleWordExamples = [...singleWordExamples, ...filteredEx];
        }
      }

      // Concaténer tous les exemples et appliquer le surlignage
      const allExamplesForSingleWord = [...leftoverExactAsExamples, ...singleWordExamples]
        .filter(s => {
          const frWordCount = (s.french || '').trim().split(/\s+/).length;
          return frWordCount >= 2 && frWordCount <= 15 && (s.french || '').length <= 100; // Ne garder que de vraies phrases courtes en exemple
        })
        .map(s => {
          return highlightCrossLingual(s, searchTerm, exactWord ? exactWord.fon : null);
        });

      return res.status(200).json({
        isSentence: false,
        exactWord: exactWord, // Le mot isolé et traduit parfaitement
        exactMatches: allMatchingVocab, // Liste complète des mots de vocabulaire trouvés
        wordByWord: [],
        exampleSentences: allExamplesForSingleWord
      });
    }

    // ============================================================
    // NOUVELLES ACTIONS POUR LE STUDIO D'ENREGISTREMENT
    // ============================================================
    let adminUser = null;
    if (action === 'studio-list' || action === 'studio-update') {
      adminUser = await verifyAdmin(req);
      if (!adminUser) {
        return res.status(403).json({
          success: false,
          message: "Accès refusé. Vous devez être connecté en tant qu'administrateur pour effectuer cette action."
        });
      }
    }

    if (action === 'studio-list') {
      // 1. Récupérer toutes les combinaisons français/fon qui ont déjà un audio (seulement 81 actuellement)
      const { data: audioWords, error: audioErr } = await supabase
        .from('words')
        .select('french, fon')
        .not('audio_url', 'is', null);

      if (audioErr) throw audioErr;

      const audioKeys = new Set(
        (audioWords || []).map(w => `${(w.french || '').toLowerCase().trim()}|${(w.fon || '').toLowerCase().trim()}`)
      );

      // 2. Obtenir le nombre total de mots sans audio (hors alignement biblique)
      const { count, error: countErr } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .is('audio_url', null)
        .neq('source', 'bible_alignment');

      if (countErr) throw countErr;

      // 3. Obtenir un lot de mots sans audio (100 mots pour compenser les doublons potentiels)
      const { data, error } = await supabase
        .from('words')
        .select('*')
        .is('audio_url', null)
        .neq('source', 'bible_alignment') // Exclure les entrées issues de l'alignement biblique
        .order('category', { ascending: false }) // 'Vocabulaire' avant 'Phrase' et 'Bible'
        .order('french', { ascending: true })
        .order('id', { ascending: true }) // deterministic ordering
        .limit(100);

      if (error) throw error;

      // Pronoms personnels à exclure du studio (inutiles à enregistrer)
      const PRONOUNS = new Set(['je','tu','il','elle','nous','vous','ils','elles','on','me','te','se','lui','y','en']);

      // 4. Filtrer les entrées où le champ Fon est trop court ou le français est vide,
      // tout en éliminant les doublons (intra-lot et ceux possédant déjà un audio ailleurs)
      const seenInBatch = new Set();
      const filtered = (data || [])
        .filter(w => {
          const fon = (w.fon || '').trim();
          const french = (w.french || '').trim();
          
          // Exclure Fon trop court (1 lettre ou ponctuation seule)
          if (fon.length <= 1 || french.length === 0) return false;
          // Exclure mots français d'une seule lettre (A, B, etc.)
          if (french.length <= 1) return false;
          // Exclure les pronoms personnels
          if (PRONOUNS.has(french.toLowerCase())) return false;
          // Exclure si le Fon ne contient que des caractères spéciaux/ponctuation
          if (!/[a-zA-Zɖɛɔáàâéèêíìóòúùǐǒǔ]/i.test(fon)) return false;

          const key = `${french.toLowerCase()}|${fon.toLowerCase()}`;
          
          // Éliminer s'il y a déjà un enregistrement audio pour ce couple français/fon
          if (audioKeys.has(key)) return false;
          
          // Éliminer les doublons de mots identiques à l'intérieur du lot fetched
          if (seenInBatch.has(key)) return false;
          
          seenInBatch.add(key);
          return true;
        })
        .slice(0, 20); // Garder les 20 premiers uniques

      return res.status(200).json({
        words: filtered,
        totalRemaining: count || 0
      });
    }

    if (action === 'bulk-delete-bible') {
      const adminUser = await verifyAdmin(req).catch(() => null);
      if (!adminUser) return res.status(403).json({ success: false, message: "Accès refusé" });

      const { error, count } = await supabase
        .from('words')
        .delete()
        .eq('source', 'bible_alignment');
      if (error) throw error;
      return res.status(200).json({ success: true, deleted: count || 0 });
    }

    if (action === 'bulk-delete-pronouns') {
      const adminUser = await verifyAdmin(req).catch(() => null);
      if (!adminUser) return res.status(403).json({ success: false, message: "Accès refusé" });

      const pronouns = ['je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on'];
      const { error, count } = await supabase
        .from('words')
        .delete()
        .in('french', pronouns);
      if (error) throw error;
      return res.status(200).json({ success: true, deleted: count || 0 });
    }

    if (action === 'studio-update') {
      if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });
      const { id, phonetic, audio_base64 } = req.body;

      if (!id) {
        return res.status(400).json({ success: false, message: "ID du mot manquant" });
      }

      let audio_url = null;
      if (audio_base64) {
        try {
          const cleanBase64 = audio_base64.replace(/^data:.*?;base64,/, '');
          const buffer = Buffer.from(cleanBase64, 'base64');
          const fileName = `${Date.now()}_studio_${id}.ogg`;

          const { error: uploadError } = await supabase.storage
            .from('audios')
            .upload(fileName, buffer, { contentType: 'audio/ogg' });

          if (uploadError) {
            console.error(`Storage Upload Error (studio):`, uploadError.message);
            return res.status(500).json({ success: false, message: `Storage Error: ${uploadError.message}` });
          }

          const { data: { publicUrl } } = supabase.storage
            .from('audios')
            .getPublicUrl(fileName);

          audio_url = publicUrl;
        } catch (err) {
          console.error("Audio recording conversion/upload failed:", err);
          return res.status(500).json({ success: false, message: "Échec de conversion de l'audio." });
        }
      }

      // Récupérer d'abord les détails du mot pour enregistrer l'activité et propager aux doublons
      let wordDetails = null;
      try {
        const { data } = await supabase
          .from('words')
          .select('french, fon')
          .eq('id', id)
          .maybeSingle();
        wordDetails = data;
      } catch (err) {
        console.error("Failed to fetch details before update:", err);
      }

      const updatePayload = {
        status: 'approved' // Automatiquement approuvé puisqu'il passe par le studio
      };
      if (phonetic) updatePayload.phonetic = phonetic;
      if (audio_url) updatePayload.audio_url = audio_url;

      const { error: updateError } = await supabase
        .from('words')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        return res.status(500).json({ success: false, message: updateError.message });
      }

      // Propager automatiquement le nouvel audio à tous les doublons exacts (même français et même fon) sans audio
      if (audio_url && wordDetails && wordDetails.french && wordDetails.fon) {
        try {
          const { error: propErr } = await supabase
            .from('words')
            .update({ audio_url })
            .ilike('french', wordDetails.french.trim())
            .ilike('fon', wordDetails.fon.trim())
            .is('audio_url', null);
          if (propErr) console.error("Propagation error:", propErr.message);
        } catch (err) {
          console.error("Propagation failed:", err);
        }
      }

      if (wordDetails) {
        try {
          await logActivity(adminUser, 'audio_added', id, wordDetails.french, wordDetails.fon);
        } catch (err) {
          console.error("Failed to log activity in studio-update:", err);
        }
      }

      return res.status(200).json({ success: true, audio_url });
    }

    // ============================================================
    // 3. RANDOM WORD
    // ============================================================
    if (action === 'random') {
      const dailyWords = await getDailyWords(1);
      if (dailyWords.length > 0) {
        return res.status(200).json(dailyWords[0]);
      }
      return res.status(200).json(null);
    }

    if (action === 'translate') {
      const text = (req.query.text || req.body?.text || '').trim();
      if (!text) {
        return res.status(400).json({ success: false, message: 'Le paramètre "text" est requis.' });
      }
      const { translate } = require('../../lib/fonBrain');
      const result = await translate(text);
      return res.status(200).json({
        success: true,
        translation: result.fon,
        fon: result.fon,
        phonetic: result.phonetic || '',
        coverage: result.confidence,
        confidence: result.confidence,
        unknownWords: result.unknownWords,
        audioPlaylist: result.audioPlaylist,
        segments: result.segments,
        analysis: result.analysis,
      });
    }

    return res.status(404).json({ error: `Dictionary action '${action}' not found` });

  } catch (e) {
    console.error(`Dictionary Error (${action}):`, e);
    return res.status(500).json({ success: false, message: e.message || 'Erreur interne' });
  }
};
