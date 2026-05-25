// lib/generatePhrases.js
// Générateur de phrases Fon basé sur les patterns grammaticaux appris
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  // Compatibilité : SUPABASE_SERVICE_KEY (Vercel) ou SUPABASE_SERVICE_ROLE_KEY (local .env)
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

let PATTERN_CACHE = null;
let WORD_CACHE = new Map();

async function loadPatterns() {
  if (PATTERN_CACHE) return PATTERN_CACHE;
  const { data } = await supabase
    .from('grammar_patterns')
    .select('*')
    .gte('confidence', 0.3)
    .order('occurrences', { ascending: false });
  PATTERN_CACHE = {
    bigrams: data.filter(p => p.type === 'bigram'),
    trigrams: data.filter(p => p.type === 'trigram'),
    templates: data.filter(p => p.type === 'template'),
  };
  return PATTERN_CACHE;
}

async function lookupWord(frenchWord) {
  if (WORD_CACHE.has(frenchWord)) return WORD_CACHE.get(frenchWord);
  const { data } = await supabase
    .from('words')
    .select('french, fon, audio_url, phonetic, confidence')
    .ilike('french', frenchWord)
    .eq('status', 'approved')
    .order('confidence', { ascending: false })
    .limit(1)
    .single();
  WORD_CACHE.set(frenchWord, data || null);
  return data || null;
}

function tokenize(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-zéèêëàâùûîïôœæçɛɔɖƒŋ'\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);
}

function assembleFonSentence(segments) {
  const ARTICLES_FR = ['le', 'la', 'les', 'un', 'une', 'des', 'du', 'de'];
  const filtered = segments.filter(s => {
    if (s.type === 'word' && ARTICLES_FR.includes(s.french)) {
      return s.fon && !ARTICLES_FR.includes(s.fon);
    }
    return true;
  });
  return filtered.map(s => s.fon).join(' ')
    .replace(/\s+/g, ' ')
    .replace(/\[(\w+)\]\s*\[(\w+)\]/g, '[$1 $2]')
    .trim();
}

async function memorize(generated) {
  try {
    const { data: existing } = await supabase
      .from('words')
      .select('id')
      .eq('french', generated.french)
      .single();
    if (existing) return;
    await supabase.from('words').insert({
      french: generated.french,
      fon: generated.fon,
      category: 'Phrase',
      status: 'pending',
      confidence: generated.confidence / 100,
      source: 'ai_generated',
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Erreur mémorisation:', err.message);
  }
}

async function generatePhrase(frenchText) {
  const patterns = await loadPatterns();
  const tokens = tokenize(frenchText);
  const result = [];
  let totalConfidence = 0;
  let matchCount = 0;
  let i = 0;
  while (i < tokens.length) {
    if (i + 2 < tokens.length) {
      const trigramFr = tokens.slice(i, i + 3).join(' ');
      const triMatch = patterns.trigrams.find(p => p.pattern_fr.toLowerCase() === trigramFr);
      if (triMatch) {
        result.push({ french: trigramFr, fon: triMatch.pattern_fon, type: 'trigram', confidence: triMatch.confidence, audio_url: null });
        totalConfidence += triMatch.confidence;
        matchCount++;
        i += 3;
        continue;
      }
    }
    if (i + 1 < tokens.length) {
      const bigramFr = tokens.slice(i, i + 2).join(' ');
      const biMatch = patterns.bigrams.find(p => p.pattern_fr.toLowerCase() === bigramFr);
      if (biMatch) {
        result.push({ french: bigramFr, fon: biMatch.pattern_fon, type: 'bigram', confidence: biMatch.confidence, audio_url: null });
        totalConfidence += biMatch.confidence;
        matchCount++;
        i += 2;
        continue;
      }
    }
    const word = tokens[i];
    const wordData = await lookupWord(word);
    if (wordData) {
      result.push({ french: word, fon: wordData.fon, type: 'word', confidence: wordData.confidence || 0.7, audio_url: wordData.audio_url, phonetic: wordData.phonetic });
      totalConfidence += wordData.confidence || 0.7;
      matchCount++;
    } else {
      result.push({ french: word, fon: `[${word}]`, type: 'unknown', confidence: 0, audio_url: null });
    }
    i++;
  }
  const avgConfidence = matchCount > 0 ? Math.round((totalConfidence / matchCount) * 100) : 0;
  const fonSentence = assembleFonSentence(result);
  const unknown = result.filter(r => r.type === 'unknown').map(r => r.french);
  const audioPlaylist = result
    .filter(r => r.audio_url)
    .map((r, idx) => ({ order: idx, french: r.french, fon: r.fon, audio_url: r.audio_url, pause_ms: 180 }));
  const generated = {
    french: frenchText,
    fon: fonSentence,
    segments: result,
    confidence: avgConfidence,
    unknownWords: unknown,
    audioPlaylist,
  };
  if (avgConfidence >= 70 && unknown.length === 0) {
    await memorize(generated);
  }
  return generated;
}

async function getPendingPhrases(limit = 50) {
  const { data } = await supabase
    .from('words')
    .select('*')
    .eq('status', 'pending')
    .eq('source', 'ai_generated')
    .order('confidence', { ascending: false })
    .limit(limit);
  return data;
}

async function approvePhrase(id, correctedFon = null) {
  const update = { status: 'approved' };
  if (correctedFon) update.fon = correctedFon;
  await supabase.from('words').update(update).eq('id', id);
}

async function rejectPhrase(id) {
  await supabase.from('words').delete().eq('id', id);
}

module.exports = { generatePhrase, getPendingPhrases, approvePhrase, rejectPhrase, loadPatterns };
