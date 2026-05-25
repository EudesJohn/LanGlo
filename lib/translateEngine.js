// lib/translateEngine.js
// Moteur de traduction Français → Fon avec lemmatisation et lookup n-gram
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  // Compatibilité : SUPABASE_SERVICE_KEY (Vercel) ou SUPABASE_SERVICE_ROLE_KEY (local .env)
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
);

function normalize(text) {
  return text
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, '')
    .replace(/\s+/g, ' ');
}

const LEMMES = {
  'vais': 'aller', 'vas': 'aller', 'va': 'aller', 'allons': 'aller', 'allez': 'aller', 'vont': 'aller',
  'suis': 'etre', 'es': 'etre', 'est': 'etre', 'sommes': 'etre', 'etes': 'etre', 'sont': 'etre',
  'ai': 'avoir', 'as': 'avoir', 'avons': 'avoir', 'avez': 'avoir', 'ont': 'avoir',
  'fais': 'faire', 'fait': 'faire', 'faisons': 'faire', 'faites': 'faire', 'font': 'faire',
  'dis': 'dire', 'dit': 'dire', 'disons': 'dire', 'dites': 'dire', 'disent': 'dire',
  'viens': 'venir', 'vient': 'venir', 'venons': 'venir', 'venez': 'venir', 'viennent': 'venir',
  'peux': 'pouvoir', 'peut': 'pouvoir', 'pouvons': 'pouvoir', 'pouvez': 'pouvoir', 'peuvent': 'pouvoir',
  'veux': 'vouloir', 'veut': 'vouloir', 'voulons': 'vouloir', 'voulez': 'vouloir', 'veulent': 'vouloir',
  'sais': 'savoir', 'sait': 'savoir', 'savons': 'savoir', 'savez': 'savoir', 'savent': 'savoir',
  'mange': 'manger', 'manges': 'manger', 'mangeons': 'manger', 'mangez': 'manger', 'mangent': 'manger',
  'bois': 'boire', 'boit': 'boire', 'buvons': 'boire', 'buvez': 'boire', 'boivent': 'boire',
  'vois': 'voir', 'voit': 'voir', 'voyons': 'voir', 'voyez': 'voir', 'voient': 'voir',
  'prends': 'prendre', 'prend': 'prendre', 'prenons': 'prendre', 'prenez': 'prendre', 'prennent': 'prendre',
  'dors': 'dormir', 'dort': 'dormir', 'dormons': 'dormir', 'dormez': 'dormir', 'dorment': 'dormir',
  'enfants': 'enfant', 'maisons': 'maison', 'hommes': 'homme', 'femmes': 'femme',
  'amis': 'ami', 'amies': 'amie', 'freres': 'frere', 'soeurs': 'soeur',
  'peres': 'pere', 'meres': 'mere', 'chiens': 'chien', 'chats': 'chat', 'arbres': 'arbre',
  'jours': 'jour', 'nuits': 'nuit', 'annees': 'annee', 'heures': 'heure',
  'pieds': 'pied', 'mains': 'main', 'yeux': 'oeil', 'oreilles': 'oreille', 'dents': 'dent',
  'livres': 'livre', 'tables': 'table', 'chaises': 'chaise', 'portes': 'porte', 'fenetres': 'fenetre',
  'bonne': 'bon', 'grande': 'grand', 'petite': 'petit', 'belle': 'beau', 'nouvelle': 'nouveau',
  'heureuse': 'heureux', 'malheureuse': 'malheureux', 'vieille': 'vieux',
};

function lemmatize(word) {
  const normalized = normalize(word);
  return LEMMES[normalized] || normalized;
}

const cache = new Map();

async function lookupExact(text) {
  const key = `exact:${text}`;
  if (cache.has(key)) return cache.get(key);
  const { data } = await supabase
    .from('words')
    .select('french, fon, audio_url, phonetic')
    .ilike('french', text)
    .eq('status', 'approved')
    .limit(1)
    .single();
  const result = data || null;
  cache.set(key, result);
  return result;
}

async function lookupWithLemma(word) {
  let result = await lookupExact(word);
  if (result) return { ...result, matchType: 'exact' };
  const normalized = normalize(word);
  result = await lookupExact(normalized);
  if (result) return { ...result, matchType: 'normalized' };
  const lemme = lemmatize(word);
  if (lemme !== normalized) {
    result = await lookupExact(lemme);
    if (result) return { ...result, matchType: 'lemma' };
  }
  return null;
}

async function translatePhrase(frenchText) {
  const words = frenchText.trim().split(/\s+/);
  const segments = [];
  const exactMatch = await lookupExact(frenchText.trim());
  if (exactMatch) {
    return {
      success: true,
      translation: exactMatch.fon,
      phonetic: exactMatch.phonetic,
      audio_url: exactMatch.audio_url,
      segments: [{ french: frenchText, fon: exactMatch.fon, audio_url: exactMatch.audio_url, type: 'full_phrase' }],
      coverage: 100,
    };
  }
  let i = 0;
  while (i < words.length) {
    let matched = false;
    for (let n = Math.min(4, words.length - i); n >= 2; n--) {
      const phrase = words.slice(i, i + n).join(' ');
      const result = await lookupExact(phrase);
      if (result) {
        segments.push({ french: phrase, fon: result.fon, audio_url: result.audio_url, phonetic: result.phonetic, type: `ngram_${n}` });
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const word = words[i];
      const result = await lookupWithLemma(word);
      if (result) {
        segments.push({ french: word, fon: result.fon, audio_url: result.audio_url, phonetic: result.phonetic, type: result.matchType });
      } else {
        segments.push({ french: word, fon: `[${word}]`, audio_url: null, phonetic: null, type: 'unknown' });
      }
      i++;
    }
  }
  const totalWords = words.length;
  const unknownCount = segments.filter(s => s.type === 'unknown').length;
  const coverage = Math.round(((totalWords - unknownCount) / totalWords) * 100);
  const translation = segments.map(s => s.fon).join(' ');
  const phonetic = segments.map(s => s.phonetic || s.fon).join(' ');
  return {
    success: true,
    translation,
    phonetic,
    segments,
    coverage,
    unknownWords: segments.filter(s => s.type === 'unknown').map(s => s.french),
    audio_urls: segments.map(s => s.audio_url).filter(Boolean),
  };
}

function buildAudioPlaylist(segments, pauseMs = 200) {
  return segments
    .filter(s => s.audio_url)
    .map((s, index) => ({
      order: index,
      french: s.french,
      fon: s.fon,
      audio_url: s.audio_url,
      pause_after_ms: pauseMs,
    }));
}

module.exports = { translatePhrase, buildAudioPlaylist };
