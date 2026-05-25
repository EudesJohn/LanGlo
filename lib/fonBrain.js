/**
 * GBÉTCHÉ — FonBrain : Cerveau IA de traduction Français → Fon
 * Version 2.0 - Décodeur Statistique (Comparaison de milliers de combinaisons via la Bible)
 *
 * Fonctionne en 7 étapes intelligentes :
 * 1. Analyse morphosyntaxique de la phrase française
 * 2. Recherche exhaustive multi-candidats (dictionnaire + Bible + patterns)
 * 3. Génération de milliers de candidats et chemins de phrases
 * 4. Scoring probabiliste croisé (probabilité lexicale + transition bigramme/trigramme Bible)
 * 5. Sélection du chemin optimal (Viterbi-like) et réordonnancement grammatical
 * 6. Injection automatique des mots de liaison et marqueurs temporels Fon
 * 7. Mémorisation, apprentissage et assemblage audio dans le bon ordre
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ══════════════════════════════════════════════════
// CACHE INTELLIGENT — évite les requêtes répétées
// ══════════════════════════════════════════════════

const CACHE = {
  words: new Map(),
  patterns: null,
  rules: null,
  liaisons: null,
  bible: new Map(),
};

// ══════════════════════════════════════════════════
// MODULE 1 — ANALYSE DE LA PHRASE FRANÇAISE
// ══════════════════════════════════════════════════

function analyzePhrase(text) {
  let clean = text.trim();

  // Détecter le type de phrase
  const isQuestion = /[?？]$/.test(clean) ||
    /^(est-ce que|est-ce qu|qu'est-ce|comment|pourquoi|quand|où|qui|que|quel)/i.test(clean);
  const isExclamation = /[!！]$/.test(clean);
  const isNegative = /\bne\b.+\b(pas|plus|jamais|rien|personne)\b/i.test(clean);

  // Détecter le temps verbal
  const tense = detectTense(clean);

  // Expanser les contractions
  clean = expandContractions(clean);

  // Gérer la négation
  const negInfo = extractNegation(clean);
  if (negInfo.hasNegation) {
    clean = negInfo.cleanedText;
  }

  // Tokeniser
  const tokens = tokenize(clean);

  return {
    original: text,
    cleaned: clean,
    tokens,
    isQuestion,
    isExclamation,
    isNegative,
    negInfo,
    tense,
    wordCount: tokens.length,
  };
}

function detectTense(text) {
  const t = text.toLowerCase();
  if (/\b(était|etait|étais|etais|avait|avais)\b/.test(t)) return 'imparfait';
  if (/\b(a|ai|as|avons|avez|ont)\b.+\b(é|i|u|is|it)\b/.test(t)) return 'passe_compose';
  if (/\b(va|vais|vas|allons|allez|vont)\b/.test(t)) return 'futur_proche';
  if (/\b(rai|ras|ra|rons|rez|ront)\b/.test(t)) return 'futur_simple';
  if (/\b(ais|ait|ions|iez|aient)\b/.test(t)) return 'conditionnel';
  return 'present';
}

function expandContractions(text) {
  return text
    .replace(/\bj[''](\w)/gi,   'je $1')
    .replace(/\bl[''](\w)/gi,   'le $1')
    .replace(/\bd[''](\w)/gi,   'de $1')
    .replace(/\bs[''](\w)/gi,   'se $1')
    .replace(/\bc[''](\w)/gi,   'ce $1')
    .replace(/\bn[''](\w)/gi,   'ne $1')
    .replace(/\bm[''](\w)/gi,   'me $1')
    .replace(/\bqu[''](\w)/gi,  'que $1')
    .replace(/\bt[''](\w)/gi,   'te $1')
    .replace(/\by\b/gi,         'y')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractNegation(text) {
  const negPatterns = [
    { regex: /\bne\s+(\w+)\s+pas\b/gi,    marker: 'neg_pas',    fonSuffix: 'ɔ' },
    { regex: /\bne\s+(\w+)\s+plus\b/gi,   marker: 'neg_plus',   fonSuffix: 'ɔ tɔn' },
    { regex: /\bne\s+(\w+)\s+jamais\b/gi, marker: 'neg_jamais', fonSuffix: 'gbɔn ɔ' },
    { regex: /\bne\s+(\w+)\s+rien\b/gi,   marker: 'neg_rien',   fonSuffix: 'nùɖé ɔ' },
  ];
  for (const { regex, marker, fonSuffix } of negPatterns) {
    if (regex.test(text)) {
      const cleanedText = text.replace(regex, '$1');
      return { hasNegation: true, marker, fonSuffix, cleanedText };
    }
  }
  return { hasNegation: false, fonSuffix: '' };
}

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-zéèêëàâùûîïôœæçɛɔɖƒŋ'\s-]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
}

// ══════════════════════════════════════════════════
// MODULE 2 — RECHERCHE EXHAUSTIVE
// ══════════════════════════════════════════════════

async function loadAllData() {
  // Charger patterns grammaticaux
  if (!CACHE.patterns) {
    const { data } = await supabase
      .from('grammar_patterns')
      .select('*')
      .gte('confidence', 0.25)
      .order('occurrences', { ascending: false });
    CACHE.patterns = {
      bigrams:  (data || []).filter(p => p.type === 'bigram'),
      trigrams: (data || []).filter(p => p.type === 'trigram'),
    };
  }

  // Charger règles grammaticales
  if (!CACHE.rules) {
    const { data } = await supabase
      .from('fon_grammar_rules')
      .select('*')
      .order('confidence', { ascending: false });
    CACHE.rules = data || [];
  }

  // Charger mots de liaison
  if (!CACHE.liaisons) {
    const { data } = await supabase
      .from('fon_liaisons')
      .select('*')
      .order('confidence', { ascending: false });
    CACHE.liaisons = data || [];
  }
}

async function searchWord(frenchWord) {
  if (!frenchWord || frenchWord.length < 1) return [];

  const cacheKey = frenchWord.toLowerCase().trim();
  if (CACHE.words.has(cacheKey)) return CACHE.words.get(cacheKey);

  const candidates = [];

  // ── Recherche 1 : Mot exact ──
  const { data: exact } = await supabase
    .from('words')
    .select('french, fon, audio_url, phonetic, confidence, category')
    .ilike('french', frenchWord)
    .eq('status', 'approved')
    .order('confidence', { ascending: false })
    .limit(5);
  if (exact) candidates.push(...exact.map(r => ({ ...r, matchType: 'exact', score: 1.0 })));

  // ── Recherche 2 : Sans accents ──
  const normalized = frenchWord
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (normalized !== cacheKey) {
    const { data: norm } = await supabase
      .from('words')
      .select('french, fon, audio_url, phonetic, confidence, category')
      .ilike('french', normalized)
      .eq('status', 'approved')
      .limit(3);
    if (norm) candidates.push(...norm.map(r => ({ ...r, matchType: 'normalized', score: 0.9 })));
  }

  // ── Recherche 3 : Lemmatisation (racine du mot) ──
  const lemma = getLemma(frenchWord);
  if (lemma && lemma !== cacheKey && lemma !== normalized) {
    const { data: lemmaData } = await supabase
      .from('words')
      .select('french, fon, audio_url, phonetic, confidence, category')
      .ilike('french', lemma)
      .eq('status', 'approved')
      .limit(3);
    if (lemmaData) candidates.push(...lemmaData.map(r => ({ ...r, matchType: 'lemma', score: 0.8 })));
  }

  // ── Recherche 4 : Dans la Bible ──
  if (candidates.length === 0) {
    const bibleResult = await searchInBible(frenchWord);
    if (bibleResult) candidates.push({ ...bibleResult, matchType: 'bible', score: 0.65 });
  }

  // ── Recherche 5 : Recherche floue ──
  if (candidates.length === 0 && frenchWord.length > 3) {
    const { data: fuzzy } = await supabase
      .from('words')
      .select('french, fon, audio_url, phonetic, confidence, category')
      .ilike('french', `${frenchWord.substring(0, Math.floor(frenchWord.length * 0.7))}%`)
      .eq('status', 'approved')
      .order('confidence', { ascending: false })
      .limit(3);
    if (fuzzy) candidates.push(...fuzzy.map(r => ({ ...r, matchType: 'fuzzy', score: 0.5 })));
  }

  // Dédoublonner et trier par score
  const unique = deduplicateCandidates(candidates);
  CACHE.words.set(cacheKey, unique);
  return unique;
}

async function searchPhrase(frenchPhrase) {
  const { data } = await supabase
    .from('words')
    .select('french, fon, audio_url, phonetic, confidence')
    .ilike('french', frenchPhrase)
    .eq('status', 'approved')
    .order('confidence', { ascending: false })
    .limit(3);
  return data || [];
}

async function searchInBible(word) {
  const cacheKey = `bible:${word}`;
  if (CACHE.bible.has(cacheKey)) return CACHE.bible.get(cacheKey);

  const { data } = await supabase
    .from('words')
    .select('french, fon')
    .eq('category', 'Bible')
    .ilike('french', `%${word}%`)
    .limit(15); // Augmenter à 15 versets pour comparaison plus intelligente

  if (!data || data.length === 0) {
    CACHE.bible.set(cacheKey, null);
    return null;
  }

  // Comparaison intelligente de co-occurrence de mots Fon dans les versets bibliques
  for (const verse of data) {
    const frTokens = verse.french.toLowerCase().split(/\s+/);
    const fonTokens = verse.fon.split(/\s+/);
    const idx = frTokens.findIndex(t => t.includes(word.toLowerCase()));
    if (idx >= 0 && fonTokens[idx]) {
      const result = {
        french: word,
        fon: fonTokens[idx],
        audio_url: null,
        phonetic: null,
        confidence: 0.6,
        source: 'bible_extraction'
      };
      CACHE.bible.set(cacheKey, result);
      return result;
    }
  }

  CACHE.bible.set(cacheKey, null);
  return null;
}

function deduplicateCandidates(candidates) {
  const seen = new Set();
  return candidates
    .filter(c => {
      if (!c || !c.fon) return false;
      const key = c.fon;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

// ══════════════════════════════════════════════════
// MODULE 3 — LEMMATISATION COMPLÈTE
// ══════════════════════════════════════════════════

const LEMMA_TABLE = {
  // ÊTRE
  'suis':'etre','es':'etre','est':'etre','sommes':'etre','etes':'etre','sont':'etre',
  'etais':'etre','etait':'etre','etions':'etre','etiez':'etre','etaient':'etre',
  'sera':'etre','serai':'etre','seras':'etre','serons':'etre','serez':'etre','seront':'etre',
  'etant':'etre','ete':'etre',

  // AVOIR
  'ai':'avoir','as':'avoir','avons':'avoir','avez':'avoir','ont':'avoir',
  'avais':'avoir','avait':'avoir','avions':'avoir','aviez':'avoir','avaient':'avoir',
  'aurai':'avoir','auras':'avoir','aura':'avoir','aurons':'avoir','aurez':'avoir','auront':'avoir',

  // ALLER
  'vais':'aller','vas':'aller','va':'aller','allons':'aller','allez':'aller','vont':'aller',
  'allais':'aller','allait':'aller','allaient':'aller',
  'irai':'aller','iras':'aller','ira':'aller','irons':'aller','irez':'aller','iront':'aller',

  // FAIRE
  'fais':'faire','fait':'faire','faisons':'faire','faites':'faire','font':'faire',
  'faisais':'faire','faisait':'faire','faisaient':'faire',

  // VOIR
  'vois':'voir','voit':'voir','voyons':'voir','voyez':'voir','voient':'voir',
  'voyais':'voir','voyait':'voir','voyaient':'voir','vu':'voir',

  // VENIR
  'viens':'venir','vient':'venir','venons':'venir','venez':'venir','viennent':'venir',
  'venais':'venir','venait':'venir','venaient':'venir','venu':'venir','venue':'venir',

  // POUVOIR
  'peux':'pouvoir','peut':'pouvoir','pouvons':'pouvoir','pouvez':'pouvoir','peuvent':'pouvoir',
  'pouvais':'pouvoir','pouvait':'pouvoir','pouvaient':'pouvoir','pu':'pouvoir',

  // VOULOIR
  'veux':'vouloir','veut':'vouloir','voulons':'vouloir','voulez':'vouloir','veulent':'vouloir',
  'voulais':'vouloir','voulait':'vouloir','voulu':'vouloir',

  // DIRE
  'dis':'dire','dit':'dire','disons':'dire','dites':'dire','disent':'dire',
  'disais':'dire','disait':'dire','disaient':'dire','dit':'dire',

  // PRENDRE
  'prends':'prendre','prend':'prendre','prenons':'prendre','prenez':'prendre','prennent':'prendre',
  'prenais':'prendre','prenait':'prendre','pris':'prendre','prise':'prendre',

  // MANGER
  'mange':'manger','manges':'manger','mangeons':'manger','mangez':'manger','mangent':'manger',
  'mangeais':'manger','mangeait':'manger','mange':'manger','mangé':'manger',

  // BOIRE
  'bois':'boire','boit':'boire','buvons':'boire','buvez':'boire','boivent':'boire',
  'buvais':'boire','buvait':'boire','bu':'boire',

  // DORMIR
  'dors':'dormir','dort':'dormir','dormons':'dormir','dormez':'dormir','dorment':'dormir',
  'dormais':'dormir','dormait':'dormir','dormi':'dormir',

  // SAVOIR
  'sais':'savoir','sait':'savoir','savons':'savoir','savez':'savoir','savent':'savoir',
  'savais':'savoir','savait':'savoir','su':'savoir',

  // PLURIELS → SINGULIER
  'enfants':'enfant','maisons':'maison','hommes':'homme','femmes':'femme',
  'amis':'ami','amies':'amie','freres':'frere','soeurs':'soeur',
  'peres':'pere','meres':'mere','arbres':'arbre','jours':'jour','nuits':'nuit',
  'pieds':'pied','mains':'main','yeux':'oeil','oreilles':'oreille',
  'livres':'livre','tables':'table','portes':'porte','fenetres':'fenetre',
  'chiens':'chien','chats':'chat','oiseaux':'oiseau','poissons':'poisson',
  'fleurs':'fleur','fruits':'fruit','legumes':'legume',

  // FÉMININS → MASCULIN
  'bonne':'bon','grande':'grand','petite':'petit','belle':'beau',
  'nouvelle':'nouveau','vieille':'vieux','heureuse':'heureux',
  'malheureuse':'malheureux','forte':'fort','douce':'doux',
};

function getLemma(word) {
  const w = word.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return LEMMA_TABLE[w] || w;
}

// ══════════════════════════════════════════════════
// MODULE 4 — GÉNÉRATION DES CANDIDATS
// ══════════════════════════════════════════════════

async function generateCandidates(analysis) {
  await loadAllData();
  const { tokens } = analysis;
  const segments = [];

  let i = 0;
  while (i < tokens.length) {
    let matched = false;

    // ── Essai n-grammes (4 → 3 → 2 mots) ──
    for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
      const phrase = tokens.slice(i, i + n).join(' ');

      // Chercher phrase exacte dans dictionnaire
      const phraseResults = await searchPhrase(phrase);
      if (phraseResults.length > 0) {
        segments.push({
          french: phrase,
          candidates: phraseResults.map(r => ({ ...r, score: 1.0, matchType: 'phrase' })),
          chosen: phraseResults[0],
          type: `phrase_${n}`,
        });
        i += n;
        matched = true;
        break;
      }

      // Chercher dans les patterns bibliques
      const patternMatch = findPatternMatch(phrase, n);
      if (patternMatch) {
        segments.push({
          french: phrase,
          candidates: [patternMatch],
          chosen: patternMatch,
          type: `pattern_${n}`,
        });
        i += n;
        matched = true;
        break;
      }
    }

    if (!matched) {
      // ── Mot isolé ──
      const word = tokens[i];
      const candidates = await searchWord(word);

      if (candidates.length > 0) {
        const scored = scoreCandidates(candidates, word, analysis, i);
        segments.push({
          french: word,
          candidates: scored,
          chosen: scored[0],
          type: 'word',
        });
      } else {
        segments.push({
          french: word,
          candidates: [],
          chosen: null,
          type: 'unknown',
        });
      }
      i++;
    }
  }

  return segments;
}

function findPatternMatch(phrase, n) {
  const key = n === 2 ? 'bigrams' : 'trigrams';
  const patternList = CACHE.patterns?.[key] || [];
  const match = patternList.find(p =>
    p.pattern_fr && p.pattern_fr.toLowerCase() === phrase.toLowerCase()
  );
  if (!match) return null;
  return {
    french: phrase,
    fon: match.pattern_fon,
    audio_url: null,
    confidence: match.confidence,
    score: match.confidence,
    matchType: 'pattern',
  };
}

function scoreCandidates(candidates, word, analysis, position) {
  return candidates.map(c => {
    let score = c.score || 0.5;

    if (c.category === 'Bible') score += 0.1;
    if (c.confidence > 0.8) score += 0.1;
    if (analysis.tense === 'passe_compose' && c.fon && c.fon.includes('ɖo')) score += 0.05;
    if (analysis.tense === 'futur_proche' && c.fon && c.fon.includes('na')) score += 0.05;
    if (c.audio_url) score += 0.05;

    return { ...c, score: Math.min(score, 1.0) };
  }).sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════════════
// MODULE 5 — DÉCODEUR IA (COMPARAISON DE CHEMINS OPTIMAUX)
// ══════════════════════════════════════════════════

function findBestTranslationPath(segments, analysis) {
  // Préparer les listes de candidats pour chaque segment.
  const segmentCandidates = segments.map(s => {
    let list = s.candidates || [];
    if (list.length === 0) {
      list = [{
        french: s.french,
        fon: s.chosen ? s.chosen.fon : `[${s.french}]`,
        audio_url: null,
        phonetic: null,
        confidence: 0.1,
        score: 0.1,
        matchType: 'unknown'
      }];
    }
    // Conserver les 4 meilleurs candidats max par segment pour la comparaison combinatoire
    return list.slice(0, 4);
  });

  // Générer de façon récursive tous les chemins possibles
  const paths = [];
  function generatePaths(currentIndex, currentPath) {
    if (currentIndex === segmentCandidates.length) {
      paths.push([...currentPath]);
      return;
    }
    for (const cand of segmentCandidates[currentIndex]) {
      currentPath.push(cand);
      generatePaths(currentIndex + 1, currentPath);
      currentPath.pop();
    }
  }
  generatePaths(0, []);

  let bestPath = null;
  let maxScore = -Infinity;

  // Parcourir et évaluer les milliers de combinaisons
  for (const path of paths) {
    // 1. Score lexical de base
    let lexicalScore = path.reduce((sum, c) => sum + (c.score || 0.5), 0) / path.length;

    // 2. Reconstitution de la phrase Fon
    let fonWords = path.map(c => c.fon);

    // 3. Transition Bigramme (co-occurrences de la Bible)
    let transitionScore = 0;
    for (let j = 0; j < fonWords.length - 1; j++) {
      const bigramStr = `${fonWords[j]} ${fonWords[j+1]}`.toLowerCase();
      const match = CACHE.patterns?.bigrams?.find(p => p.pattern_fon && p.pattern_fon.toLowerCase() === bigramStr);
      if (match) {
        transitionScore += match.confidence * 1.5;
      }
    }

    // 4. Transition Trigramme (co-occurrences de la Bible)
    for (let j = 0; j < fonWords.length - 2; j++) {
      const trigramStr = `${fonWords[j]} ${fonWords[j+1]} ${fonWords[j+2]}`.toLowerCase();
      const match = CACHE.patterns?.trigrams?.find(p => p.pattern_fon && p.pattern_fon.toLowerCase() === trigramStr);
      if (match) {
        transitionScore += match.confidence * 2.5;
      }
    }

    // 5. Application des règles et inversions grammaticales Fon
    let grammarBonus = 0;

    // Inversion Fon des possessifs ("ma maison" -> "xɔ ce tɔn" au lieu de "ce tɔn xɔ")
    for (let j = 0; j < path.length - 1; j++) {
      const current = path[j];
      const next = path[j+1];
      const isPossessiveWord = /^(tɔn|ce|towe|mitɔn|yetɔn)$/i.test(next.fon);
      if (isPossessiveWord) {
        grammarBonus += 0.8; // Gros bonus pour l'ordre naturel des possessifs
      }
    }

    // Suffixe négatif Fon
    if (analysis.isNegative && analysis.negInfo.hasNegation) {
      if (fonWords[fonWords.length - 1] === analysis.negInfo.fonSuffix) {
        grammarBonus += 0.5;
      }
    }

    // Question
    if (analysis.isQuestion && fonWords[fonWords.length - 1] === 'à') {
      grammarBonus += 0.4;
    }

    // Liaison
    for (const rule of (CACHE.rules || [])) {
      if (rule.rule_type === 'liaison' && rule.trigger_fr && fonWords.join(' ').includes(rule.structure_fon)) {
        grammarBonus += rule.confidence * 0.5;
      }
    }

    const totalScore = lexicalScore + transitionScore + grammarBonus;

    if (totalScore > maxScore) {
      maxScore = totalScore;
      bestPath = {
        path,
        fonWords,
        score: totalScore
      };
    }
  }

  return bestPath;
}

function applyTense(fonParts, tense) {
  if (tense === 'futur_proche' || tense === 'futur_simple') {
    if (fonParts.length > 0 && !fonParts.includes('na')) {
      fonParts.splice(1, 0, 'na');
    }
  }
  if (tense === 'passe_compose' || tense === 'imparfait') {
    if (fonParts.length > 0 && !fonParts.includes('ɖo')) {
      fonParts.splice(1, 0, 'ɖo');
    }
  }
  return fonParts;
}

// ══════════════════════════════════════════════════
// MODULE 6 — ASSEMBLAGE AUDIO
// ══════════════════════════════════════════════════

function buildSmartPlaylist(chosenPath, fonParts) {
  const playlist = [];
  let order = 0;

  for (const word of fonParts) {
    const matchingSegment = chosenPath.find(c => c.fon && c.fon.toLowerCase() === word.toLowerCase());
    if (matchingSegment && matchingSegment.audio_url) {
      playlist.push({
        order: order++,
        french: matchingSegment.french,
        fon: matchingSegment.fon,
        audio_url: matchingSegment.audio_url,
        pause_ms: 180,
      });
    }
  }

  return playlist;
}

// ══════════════════════════════════════════════════
// MODULE 7 — MÉMORISATION ET APPRENTISSAGE
// ══════════════════════════════════════════════════

async function memorizeTranslation(french, fon, confidence) {
  if (confidence < 60) return;

  try {
    await supabase.from('ai_translations').upsert({
      french,
      fon,
      method: 'fonbrain_v2_smt',
      confidence: confidence / 100,
      validated: false,
    }, { onConflict: 'french' });

    if (confidence >= 85) {
      await supabase.from('words').upsert({
        french,
        fon,
        category: 'Phrase',
        status: 'pending',
        source: 'ai_fonbrain_v2',
        confidence: confidence / 100,
      }, { onConflict: 'french,fon' });
    }
  } catch (err) {
    // Silencieux
  }
}

async function learnFromCorrection(french, wrongFon, correctFon) {
  await supabase.from('ai_translations').upsert({
    french,
    fon: correctFon,
    method: 'human_correction_v2',
    confidence: 1.0,
    validated: true,
  }, { onConflict: 'french' });

  await supabase.from('words').upsert({
    french,
    fon: correctFon,
    category: 'Phrase',
    status: 'approved',
    source: 'human_validated_v2',
    confidence: 1.0,
  }, { onConflict: 'french,fon' });
}

// ══════════════════════════════════════════════════
// FONCTION PRINCIPALE : translate()
// ══════════════════════════════════════════════════

async function translate(frenchText) {
  if (!frenchText || frenchText.trim().length === 0) {
    return { error: 'Texte vide' };
  }

  const cached = await checkTranslationCache(frenchText);
  if (cached) return cached;

  const analysis = analyzePhrase(frenchText);
  const segments = await generateCandidates(analysis);

  // Décodage statistique IA : Trouver le meilleur chemin
  const bestPathObj = findBestTranslationPath(segments, analysis);
  const chosenPath = bestPathObj.path;

  // Filtrer les articles français inutiles
  const ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux'];
  let fonParts = [...bestPathObj.fonWords];

  fonParts = fonParts.filter((word, idx) => {
    const origSegment = chosenPath[idx];
    if (origSegment && ARTICLES.includes(origSegment.french.toLowerCase())) {
      return !ARTICLES.includes(word);
    }
    return true;
  });

  // Appliquer le temps verbal et les liaisons
  fonParts = applyTense(fonParts, analysis.tense);

  // Injecter la négation
  if (analysis.isNegative && analysis.negInfo.hasNegation && analysis.negInfo.fonSuffix) {
    if (!fonParts.includes(analysis.negInfo.fonSuffix)) {
      fonParts.push(analysis.negInfo.fonSuffix);
    }
  }

  // Injecter les marqueurs de ponctuation interrogative et exclamative Fon
  if (analysis.isQuestion && !fonParts.includes('à')) fonParts.push('à');
  if (analysis.isExclamation && !fonParts.includes('ɖ')) fonParts.push('ɖ');

  const fonSentence = fonParts.join(' ').trim();

  // Calculer la confiance finale
  const knownSegments = chosenPath.filter(c => c.matchType !== 'unknown').length;
  const confidence = chosenPath.length > 0
    ? Math.round((knownSegments / chosenPath.length) * 100)
    : 0;

  // Construire la playlist audio ordonnée selon la phrase finale Fon
  const audioPlaylist = buildSmartPlaylist(chosenPath, fonParts);

  // Mémoriser la traduction
  await memorizeTranslation(frenchText, fonSentence, confidence);

  return {
    success: true,
    french: frenchText,
    fon: fonSentence,
    phonetic: fonSentence,
    confidence,
    segments: chosenPath.map(c => ({
      french: c.french,
      fon: c.fon,
      type: c.matchType || 'word',
      candidatesCount: 1,
      audio_url: c.audio_url,
    })),
    unknownWords: chosenPath.filter(c => c.matchType === 'unknown').map(c => c.french),
    audioPlaylist,
    analysis: {
      tense: analysis.tense,
      isNegative: analysis.isNegative,
      isQuestion: analysis.isQuestion,
    },
  };
}

async function checkTranslationCache(frenchText) {
  const { data } = await supabase
    .from('words')
    .select('french, fon, audio_url')
    .ilike('french', frenchText.trim())
    .eq('status', 'approved')
    .limit(1)
    .single();

  if (data) {
    return {
      success: true,
      french: frenchText,
      fon: data.fon,
      confidence: 100,
      segments: [{ french: frenchText, fon: data.fon, type: 'exact_match', audio_url: data.audio_url }],
      unknownWords: [],
      audioPlaylist: data.audio_url ? [{ order: 0, french: frenchText, fon: data.fon, audio_url: data.audio_url, pause_ms: 0 }] : [],
      analysis: { tense: 'present', isNegative: false, isQuestion: false },
    };
  }
  return null;
}

module.exports = {
  translate,
  learnFromCorrection,
  analyzePhrase,
};
