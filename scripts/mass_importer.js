// scripts/mass_importer.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const INPUT_DIR = path.join(__dirname, 'input');
const FON_FILE = path.join(INPUT_DIR, 'fon.txt');
const FR_FILE = path.join(INPUT_DIR, 'fr.txt');

// Liste de mots d'arrêt en Fon (mots de liaison à ignorer dans l'extraction de mots uniques)
const FON_STOPWORDS = new Set([
  'ɖò', 'wɛ', 'nyí', 'tɔn', 'ce', 'mǐ', 'mi', 'é', 'un', 'a', 'yě', 'bɔ', 'nú', 'jí', 'mɛ', 'sin', 'sín', 'ɖe', 'ɖé', 'lɛ', 'lɔ'
]);

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

async function readLines(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  const lines = [];
  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line.trim());
    }
  }
  return lines;
}

// Nettoyer les ponctuations pour l'extraction de mots
function cleanWord(word) {
  return word
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"«»’']/g, '')
    .trim();
}

async function main() {
  console.log('🚀 Démarrage de l\'importateur de texte bilingue...\n');
  
  ensureDirectoryExistence(FON_FILE);
  ensureDirectoryExistence(FR_FILE);

  const fonLines = await readLines(FON_FILE);
  const frLines = await readLines(FR_FILE);

  if (fonLines.length === 0 || frLines.length === 0) {
    console.log('❌ Fichiers d\'entrée manquants ou vides !');
    console.log(`Veuillez créer les fichiers suivants dans : ${INPUT_DIR}`);
    console.log(`  1. fon.txt -> Contient les phrases en Fon (une phrase par ligne)`);
    console.log(`  2. fr.txt  -> Contient les phrases correspondantes en Français (une phrase par ligne)`);
    console.log('\nExemple d\'alignement :');
    console.log('Dans fon.txt: Àlo! A ɖó ali ó?');
    console.log('Dans fr.txt: Salut! Comment vas-tu?');
    return;
  }

  if (fonLines.length !== frLines.length) {
    console.warn(`⚠️ Attention : Le nombre de lignes ne correspond pas !`);
    console.warn(`  - Phrases Fon : ${fonLines.length}`);
    console.warn(`  - Phrases Français : ${frLines.length}`);
    console.warn(`L'importation se basera sur la taille la plus petite (${Math.min(fonLines.length, frLines.length)}).\n`);
  }

  const count = Math.min(fonLines.length, frLines.length);
  console.log(`📊 Alignement de ${count} paires de phrases de la Bible ou de vos documents.`);
  console.log('Extraction des mots uniques en cours...\n');

  let phrasesInserted = 0;
  let phraseDuplicates = 0;
  let wordCandidates = new Set();

  for (let i = 0; i < count; i++) {
    const fonSentence = fonLines[i];
    const frSentence = frLines[i];

    // 1. Extraire les mots pour le dictionnaire
    const words = fonSentence.split(/\s+/);
    for (const w of words) {
      const cleaned = cleanWord(w);
      if (cleaned && cleaned.length > 2 && !FON_STOPWORDS.has(cleaned)) {
        wordCandidates.add(cleaned);
      }
    }

    // 2. Insérer la phrase bilingue complète dans le dictionnaire
    try {
      const { data: existing } = await supabase
        .from('words')
        .select('id')
        .ilike('fon', fonSentence)
        .maybeSingle();

      if (existing) {
        phraseDuplicates++;
        continue;
      }

      const { error } = await supabase
        .from('words')
        .insert([{
          fon: fonSentence,
          french: frSentence,
          category: 'Phrase',
          status: 'approved'
        }]);

      if (error) {
        console.error(`❌ Erreur d'insertion phrase ligne ${i+1}:`, error.message);
      } else {
        phrasesInserted++;
        if (phrasesInserted % 50 === 0) {
          console.log(`🔹 ${phrasesInserted} phrases insérées...`);
        }
      }
    } catch (e) {
      console.error(`❌ Exception phrase ligne ${i+1}:`, e.message);
    }
  }

  console.log(`\n=============================`);
  console.log(`✅ Phrases importées avec succès : ${phrasesInserted}`);
  console.log(`⏭️ Phrases doublons ignorées : ${phraseDuplicates}`);
  console.log(`✨ Nombre de mots Fon uniques identifiés : ${wordCandidates.size}`);
  console.log(`=============================\n`);

  // Sauvegarder les mots uniques identifiés pour traduction ultérieure
  const candidatesArray = Array.from(wordCandidates).sort();
  const candidatesFile = path.join(INPUT_DIR, 'extracted_words_to_translate.txt');
  fs.writeFileSync(candidatesFile, candidatesArray.join('\n'), 'utf8');

  console.log(`📝 Les mots uniques identifiés ont été sauvegardés dans :`);
  console.log(`👉 ${candidatesFile}`);
  console.log(`Vous pouvez traduire ces mots et les réimporter dans votre dictionnaire pour enrichir Gbé Tché !`);
}

main().catch(console.error);
