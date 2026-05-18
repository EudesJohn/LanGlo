// scripts/extract_bible_fon.js
// Télécharge la Bible Fon + Français, aligne les versets et importe dans Supabase

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Sources de données
const SOURCES = {
  fon_bible: 'https://ebible.org/Scriptures/fon_revis_usfm.zip',
  fon_bible_alt: 'https://raw.githubusercontent.com/christos-c/bible-corpus/master/bibles/Fon.xml',
  opus_fon_fr: 'https://object.pouta.csc.fi/OPUS-bible-uedin/v1/moses/fon-fr.txt.zip',
};

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Téléchargement : ${url}`);
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(dest); });
    }).on('error', (err) => { fs.unlink(dest, () => {}); reject(err); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Parse XML Bible format (christos-c corpus)
function parseXMLBible(xml) {
  const verses = [];
  const verseRegex = /<seg id="([^"]+)"[^>]*>([^<]+)<\/seg>/g;
  let match;
  while ((match = verseRegex.exec(xml)) !== null) {
    verses.push({ id: match[1], text: match[2].trim() });
  }
  return verses;
}

// Nettoyer le texte
function cleanText(text) {
  return text.replace(/[0-9]+:[0-9]+/g, '').replace(/\s+/g, ' ').trim();
}

// Extraire les mots uniques d'un texte
function extractWords(text) {
  return text
    .replace(/[.,;:!?'"()\[\]{}]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 1);
}

async function importPhrase(french, fon, category = 'Bible') {
  // Vérifier doublon
  const { data: existing } = await supabase
    .from('words')
    .select('id')
    .ilike('fon', fon.substring(0, 50))
    .maybeSingle();
  
  if (existing) return 'duplicate';

  const { error } = await supabase.from('words').insert([{
    french: french.substring(0, 500),
    fon: fon.substring(0, 500),
    category,
    status: 'approved'
  }]);

  return error ? 'error' : 'success';
}

async function tryOPUSCorpus() {
  console.log('\n📖 Tentative téléchargement corpus OPUS Bible (Fon-Français)...');
  
  try {
    const zipPath = path.join(__dirname, 'opus_fon_fr.zip');
    await downloadFile(SOURCES.opus_fon_fr, zipPath);
    
    const zip = new AdmZip(zipPath);
    const entries = zip.getEntries();
    
    let fonLines = [], frLines = [];
    
    for (const entry of entries) {
      const name = entry.entryName;
      const content = entry.getData().toString('utf8');
      if (name.includes('.fon') || name === 'fon') {
        fonLines = content.split('\n').map(l => l.trim()).filter(l => l);
      }
      if (name.includes('.fr') || name === 'fr') {
        frLines = content.split('\n').map(l => l.trim()).filter(l => l);
      }
    }
    
    if (fonLines.length > 0 && frLines.length > 0) {
      console.log(`✅ ${fonLines.length} versets Fon et ${frLines.length} versets Français trouvés`);
      return { fonLines, frLines };
    }
    
    return null;
  } catch (e) {
    console.log(`⚠️  OPUS non disponible: ${e.message}`);
    return null;
  }
}

async function tryXMLBible() {
  console.log('\n📖 Tentative téléchargement Bible XML (christos-c corpus)...');
  
  try {
    // Fon
    const fonXml = await fetchText(SOURCES.fon_bible_alt);
    const fonVerses = parseXMLBible(fonXml);
    
    // French Bible URL
    const frUrl = 'https://raw.githubusercontent.com/christos-c/bible-corpus/master/bibles/French.xml';
    const frXml = await fetchText(frUrl);
    const frVerses = parseXMLBible(frXml);
    
    if (fonVerses.length > 0 && frVerses.length > 0) {
      console.log(`✅ ${fonVerses.length} versets Fon et ${frVerses.length} versets Français trouvés`);
      
      // Créer un map par ID pour l'alignement
      const frMap = {};
      for (const v of frVerses) frMap[v.id] = v.text;
      
      const paired = [];
      for (const v of fonVerses) {
        if (frMap[v.id]) {
          paired.push({ fon: cleanText(v.text), french: cleanText(frMap[v.id]), id: v.id });
        }
      }
      
      console.log(`🔗 ${paired.length} paires Fon-Français alignées`);
      return paired;
    }
    return null;
  } catch (e) {
    console.log(`⚠️  Bible XML non disponible: ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('🚀 Démarrage extraction Bible Fon...\n');
  
  let pairs = null;
  
  // Essai 1 : Bible XML alignée
  pairs = await tryXMLBible();
  
  // Essai 2 : OPUS corpus
  if (!pairs || pairs.length === 0) {
    const opus = await tryOPUSCorpus();
    if (opus) {
      pairs = [];
      const len = Math.min(opus.fonLines.length, opus.frLines.length);
      for (let i = 0; i < len; i++) {
        pairs.push({ fon: opus.fonLines[i], french: opus.frLines[i] });
      }
    }
  }
  
  if (!pairs || pairs.length === 0) {
    console.log('\n❌ Aucune source automatique disponible.');
    console.log('📋 Placez vos fichiers Fon dans scripts/input/:');
    console.log('   - fon.txt (un verset par ligne)');
    console.log('   - fr.txt  (traduction correspondante)');
    return;
  }
  
  // Import dans Supabase
  console.log(`\n📦 Import de ${pairs.length} phrases dans Supabase...`);
  
  let success = 0, duplicates = 0, errors = 0;
  const BATCH = 500; // Limiter pour commencer
  
  for (let i = 0; i < Math.min(pairs.length, BATCH); i++) {
    const { fon, french } = pairs[i];
    if (!fon || !french || fon.length < 3) continue;
    
    const result = await importPhrase(french, fon, 'Bible');
    if (result === 'success') { success++; process.stdout.write(`\r✅ ${success} importés...`); }
    else if (result === 'duplicate') duplicates++;
    else errors++;
    
    // Pause pour éviter de surcharger l'API
    if (i % 50 === 0) await new Promise(r => setTimeout(r, 200));
  }
  
  console.log(`\n\n===== RÉSUMÉ =====`);
  console.log(`✅ Phrases importées : ${success}`);
  console.log(`⏭️  Doublons ignorés : ${duplicates}`);
  console.log(`❌ Erreurs          : ${errors}`);
  console.log(`==================`);
}

main().catch(console.error);
