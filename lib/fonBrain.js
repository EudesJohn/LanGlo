/**
 * GBÉTCHÉ — FonBrain : Cerveau IA de traduction Français → Fon
 *
 * Fonctionne en 7 étapes intelligentes :
 * 1. Analyse de la phrase française
 * 2. Recherche exhaustive (dictionnaire + Bible + patterns)
 * 3. Génération de milliers de candidats
 * 4. Scoring et sélection du meilleur résultat
 * 5. Application des règles grammaticales Fon
 * 6. Ajout des mots de liaison manquants
 * 7. Mémorisation et apprentissage
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
// Comprend la structure avant de traduire
// ══════════════════════════════════════════════════

function analyzePhrase(text) {
  // Étape 1 : Nettoyer
  let clean = text.trim();

  // Étape 2 : Détecter le type de phrase
  const isQuestion = /[?？]$/.test(clean) ||
    /^(est-ce que|est-ce qu|qu'est-ce|comment|pourquoi|quand|où|qui|que|quel)/i.test(clean);
  const isExclamation = /[!！]$/.test(clean);
  const isNegative = /\bne\b.+\b(pas|plus|jamais|rien|personne)\b/i.test(clean);

  // Étape 3 : Détecter le temps verbal
  const tense = detectTense(clean);

  // Étape 4 : Expanser les contractions AVANT toute analyse
  clean = expandContractions(clean);

  // Étape 5 : Gérer la négation (transformer structure)
  const negInfo = extractNegation(clean);
  if (negInfo.hasNegation) {
    clean = negInfo.cleanedText;
  }

  // Étape 6 : Tokeniser
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
// Cherche partout, compare tout
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

  // ── Recherche 4 : Dans la Bible (cherche le verset qui contient ce mot) ──
  if (candidates.length === 0) {
    const bibleResult = await searchInBible(frenchWord);
    if (bibleResult) candidates.push({ ...bibleResult, matchType: 'bible', score: 0.65 });
  }

  // ── Recherche 5 : Recherche floue (similarité) ──
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
  // Chercher la phrase entière ou en n-grammes
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
  // Chercher un verset qui contient ce mot et extraire la traduction
  const cacheKey = `bible:${word}`;
  if (CACHE.bible.has(cacheKey)) return CACHE.bible.get(cacheKey);

  const { data } = await supabase
    .from('words')
    .select('french, fon')
    .eq('category', 'Bible')
    .ilike('french', `%${word}%`)
    .limit(10);

  if (!data || data.length === 0) {
    CACHE.bible.set(cacheKey, null);
    return null;
  }

  // Analyser chaque verset pour extraire le mot Fon correspondant
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
// Trouve la racine de n'importe quel mot français
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
// MODULE 4 — GÉNÉRATION DE CANDIDATS
// Fabrique toutes les traductions possibles
// et choisit la meilleure
// ══════════════════════════════════════════════════

async function generateCandidates(analysis) {
  await loadAllData();
  const { tokens } = analysis;
  const segments = [];

  let i = 0;
  while (i < tokens.length) {

    // ── Essai n-grammes (4 → 3 → 2 mots) ────────────────────────
    let matched = false;
    for (let n = Math.min(4, tokens.length - i); n >= 2; n--) {
      const phrase = tokens.slice(i, i + n).join(' ');

      // Chercher phrase exacte dans dictionnaire
      const phraseResults = await searchPhrase(phrase);
      if (phraseResults.length > 0) {
        segments.push({
          french: phrase,
          candidates: phraseResults.map(r => ({ ...r, score: 1.0 })),
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
      // ── Mot isolé : recherche exhaustive ──────────────────────
      const word = tokens[i];
      const candidates = await searchWord(word);

      if (candidates.length > 0) {
        // Scorer chaque candidat
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

    // Bonus : source Bible = traduction vérifiée
    if (c.category === 'Bible') score += 0.1;

    // Bonus : haute confiance enregistrée
    if (c.confidence > 0.8) score += 0.1;

    // Bonus : correspond au temps détecté
    if (analysis.tense === 'passe_compose' && c.fon && c.fon.includes('ɖo')) score += 0.05;
    if (analysis.tense === 'futur_proche' && c.fon && c.fon.includes('na')) score += 0.05;

    // Bonus : audio disponible
    if (c.audio_url) score += 0.05;

    return { ...c, score: Math.min(score, 1.0) };
  }).sort((a, b) => b.score - a.score);
}

// ══════════════════════════════════════════════════
// MODULE 5 — APPLICATION DES RÈGLES GRAMMATICALES
// Reconstruit la phrase selon la grammaire Fon
// ══════════════════════════════════════════════════

function applyGrammarRules(segments, analysis) {
  const rules = CACHE.rules || [];
  let fonParts = segments.map(s => s.chosen ? s.chosen.fon : `[${s.french}]`);

  // ── Règle 1 : Supprimer articles français ─────────────────────
  const ARTICLES = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'au', 'aux'];
  const filteredSegments = segments.filter((s, i) => {
    if (ARTICLES.includes(s.french.toLowerCase())) {
      // Garder uniquement si la traduction Fon n'est pas un article
      return s.chosen && s.chosen.fon && !ARTICLES.includes(s.chosen.fon);
    }
    return true;
  });
  fonParts = filteredSegments.map(s => s.chosen ? s.chosen.fon : `[${s.french}]`);

  // ── Règle 2 : Ajouter mots de liaison ────────────────────────
  fonParts = addLiaisons(fonParts, filteredSegments, analysis);

  // ── Règle 3 : Appliquer les temps verbaux ─────────────────────
  fonParts = applyTense(fonParts, filteredSegments, analysis.tense);

  // ── Règle 4 : Appliquer la négation ──────────────────────────
  if (analysis.negInfo.hasNegation && analysis.negInfo.fonSuffix) {
    fonParts.push(analysis.negInfo.fonSuffix);
  }

  // ── Règle 5 : Ponctuation finale ──────────────────────────────
  if (analysis.isQuestion) fonParts.push('à');
  if (analysis.isExclamation) fonParts.push('ɖ');

  return fonParts.filter(p => p && p.trim().length > 0);
}

function addLiaisons(fonParts, segments, analysis) {
  const result = [...fonParts];
  // Insérer "ɔ" entre sujet et verbe si nécessaire (déterminant verbal Fon)
  // Le Fon utilise souvent une particule entre le sujet et le verbe
  // Exemple : "un ɔ yì" (je suis allé) mais "un yì" dans certains contextes
  // Cette logique sera enrichie par learn_grammar.py
  return result;
}

function applyTense(fonParts, segments, tense) {
  if (tense === 'futur_proche' || tense === 'futur_simple') {
    // Insérer "na" après le sujet (marqueur futur en Fon)
    if (fonParts.length > 0) {
      fonParts.splice(1, 0, 'na');
    }
  }
  if (tense === 'passe_compose' || tense === 'imparfait') {
    // Insérer "ɖo" après le sujet (marqueur passé en Fon)
    if (fonParts.length > 0) {
      fonParts.splice(1, 0, 'ɖo');
    }
  }
  return fonParts;
}

// ══════════════════════════════════════════════════
// MODULE 6 — ASSEMBLAGE AUDIO
// Construit la playlist dans le bon ordre
// ══════════════════════════════════════════════════

function buildSmartPlaylist(segments, fonParts) {
  const playlist = [];
  let order = 0;

  for (const segment of segments) {
    if (!segment.chosen || !segment.chosen.audio_url) continue;

    playlist.push({
      order: order++,
      french: segment.french,
      fon: segment.chosen.fon,
      audio_url: segment.chosen.audio_url,
      pause_ms: segment.type.startsWith('phrase') ? 250 : 150,
    });
  }

  return playlist;
}

// ══════════════════════════════════════════════════
// MODULE 7 — MÉMORISATION ET APPRENTISSAGE
// L'IA retient ce qu'elle a traduit et apprend
// ══════════════════════════════════════════════════

async function memorizeTranslation(french, fon, confidence) {
  if (confidence < 60) return; // Mémoriser seulement si confiant

  try {
    await supabase.from('ai_translations').upsert({
      french,
      fon,
      method: 'fonbrain_v1',
      confidence: confidence / 100,
      validated: false,
    }, { onConflict: 'french' });

    // Si très confiant (>85%), ajouter directement dans words
    if (confidence >= 85) {
      await supabase.from('words').upsert({
        french,
        fon,
        category: 'Phrase',
        status: 'pending',
        source: 'ai_fonbrain',
        confidence: confidence / 100,
      }, { onConflict: 'french,fon' });
    }
  } catch (err) {
    // Silencieux — la mémorisation ne doit jamais bloquer
  }
}

async function learnFromCorrection(french, wrongFon, correctFon) {
  // Quand un humain corrige l'IA, elle apprend
  await supabase.from('ai_translations').upsert({
    french,
    fon: correctFon,
    method: 'human_correction',
    confidence: 1.0,
    validated: true,
  }, { onConflict: 'french' });

  await supabase.from('words').upsert({
    french,
    fon: correctFon,
    category: 'Phrase',
    status: 'approved',
    source: 'human_validated',
    confidence: 1.0,
  }, { onConflict: 'french,fon' });
}

// ══════════════════════════════════════════════════
// FONCTION PRINCIPALE : translate()
// Point d'entrée unique — orchestrate tout
// ══════════════════════════════════════════════════

async function translate(frenchText) {
  if (!frenchText || frenchText.trim().length === 0) {
    return { error: 'Texte vide' };
  }

  // ── Étape 0 : Vérifier si déjà traduit ───────────────────────
  const cached = await checkTranslationCache(frenchText);
  if (cached) return cached;

  // ── Étape 1 : Analyser la phrase ─────────────────────────────
  const analysis = analyzePhrase(frenchText);

  // ── Étape 2 : Générer des candidats pour chaque segment ──────
  const segments = await generateCandidates(analysis);

  // ── Étape 3 : Appliquer les règles grammaticales Fon ─────────
  const fonParts = applyGrammarRules(segments, analysis);

  // ── Étape 4 : Assembler la phrase finale ─────────────────────
  const fonSentence = fonParts.join(' ').trim();

  // ── Étape 5 : Calculer la confiance ──────────────────────────
  const knownSegments = segments.filter(s => s.type !== 'unknown').length;
  const confidence = segments.length > 0
    ? Math.round((knownSegments / segments.length) * 100)
    : 0;

  // ── Étape 6 : Construire la playlist audio ───────────────────
  const audioPlaylist = buildSmartPlaylist(segments, fonParts);

  // ── Étape 7 : Mémoriser pour apprendre ───────────────────────
  await memorizeTranslation(frenchText, fonSentence, confidence);

  // ── Résultat final ────────────────────────────────────────────
  const result = {
    success: true,
    french: frenchText,
    fon: fonSentence,
    phonetic: fonSentence,
    confidence,
    segments: segments.map(s => ({
      french: s.french,
      fon: s.chosen ? s.chosen.fon : `[${s.french}]`,
      type: s.type,
      candidatesCount: s.candidates.length,
      audio_url: s.chosen ? s.chosen.audio_url : null,
    })),
    unknownWords: segments.filter(s => s.type === 'unknown').map(s => s.french),
    audioPlaylist,
    analysis: {
      tense: analysis.tense,
      isNegative: analysis.isNegative,
      isQuestion: analysis.isQuestion,
    },
  };

  return result;
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
