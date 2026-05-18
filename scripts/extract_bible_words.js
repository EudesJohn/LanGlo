// scripts/extract_bible_words.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FON_XML = path.join(__dirname, 'FonBible.xml');
const FR_XML = path.join(__dirname, 'FrenchBible.xml');

// Stop words to filter out grammatical noise while extracting Bible vocabulary
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'dans', 'pour', 
  'par', 'sur', 'avec', 'sous', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 
  'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'est', 'sont', 'ont', 'a', 'au', 'aux',
  'qui', 'que', 'qu', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'ne', 'pas', 'plus', 'jamais', 'rien', 'personne', 'se', 'me', 'te', 'lui', 'leur', 'y',
  'c\'est', 's\'est', 'm\'est', 't\'est', 'j\'ai', 'tuo', 'ilo', 'avez', 'nous', 'vous',
  'sommes', 'etes', 'ont', 'etais', 'etait', 'etaient', 'aussi', 'comme', 'dans', 'tout',
  'tous', 'toute', 'toutes', 'mais', 'ou', 'où', 'donc', 'or', 'ni', 'car', 'si', 'bien',
  'tres', 'très', 'faire', 'fait', 'faites', 'font', 'avoir', 'suis', 'es', 'dit', 'dis',
  'est-ce', 'auxquelles', 'quel', 'quels', 'quelle', 'quelles', 'quelque', 'quelques',
  'ceci', 'cela', 'ils', 'elles', 'lorsque', 'alors', 'quand', 'donc', 'ainsi', 'plusieurs'
]);

const FON_STOP_WORDS = new Set([
  'lɔ', 'ɖò', 'wɛ', 'tɔn', 'mɛ', 'sin', 'ce', 'tɔ́', 'nú', 'jí', 'ye', 'e', 'mi', 'un', 'a',
  'ɔ', 'é', 'mǐ', 'bó', 'ná', 'tó', 'lɛ́', 'wɛ́', 'ɖé', 'ě', 'á', 'ó', 'co', 'bɔ', 'ka', 'lɛ',
  'tɔ', 'we', 'ɖo', 'nyi', 'nyí', 'wɛ̀', 'wɛ́', 'xá', 'dó', 'dò', 'dóo', 'té',
  'ɖokpo', 'ɖokpó', 'kpo', 'kpó', 'kpódó', 'gúdó', 'taji', 'yetɔn', 'mitɔn', 'mítɔn',
  'ní', 'nɔ́', 'nɔ', 'nú', 'nu', 'bo', 'tɔn', 'wɛn', 'din', 'dǐn', 'bǐ', 'bí', 'dáa', 'ɔ́'
]);

function tokenize(text, stopWordsSet) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"']/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    // Keep words of length >= 2 to catch short nouns
    .filter(w => w.length >= 2 && !stopWordsSet.has(w));
}

// Rapid line-by-line XML parser
async function parseBibleXml(filePath) {
  console.log(`📖 Lecture de ${path.basename(filePath)}...`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const versesMap = new Map();
  let currentTestament = '';
  let currentBook = '';
  let currentChapter = '';

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const testamentMatch = trimmed.match(/<testament name="([^"]+)">/i);
    if (testamentMatch) {
      currentTestament = testamentMatch[1];
      continue;
    }

    const bookMatch = trimmed.match(/<book number="([^"]+)">/i);
    if (bookMatch) {
      currentBook = bookMatch[1];
      continue;
    }

    const chapterMatch = trimmed.match(/<chapter number="([^"]+)">/i);
    if (chapterMatch) {
      currentChapter = chapterMatch[1];
      continue;
    }

    const verseMatch = trimmed.match(/<verse number="([^"]+)">([^<]+)<\/verse>/i);
    if (verseMatch) {
      const verseNumber = verseMatch[1];
      const text = verseMatch[2].trim();
      
      const key = `${currentTestament}_${currentBook}_${currentChapter}_${verseNumber}`;
      versesMap.set(key, text);
    }
  }

  console.log(`✨ ${versesMap.size} versets chargés.`);
  return versesMap;
}

async function fetchExistingVocab() {
  console.log('📖 Récupération du vocabulaire existant depuis Supabase...');
  const keys = new Set();
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('words')
      .select('french, fon')
      .eq('category', 'Vocabulaire')
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('\n❌ Erreur de chargement du vocabulaire:', error.message);
      break;
    }
    
    if (data.length === 0) break;
    
    for (const item of data) {
      if (item.french && item.fon) {
        keys.add(`${item.french.toLowerCase().trim()}__${item.fon.toLowerCase().trim()}`);
      }
    }
    
    offset += limit;
    process.stdout.write(`\rMots existants chargés : ${offset}...`);
  }
  console.log(`\n✅ ${keys.size} mots de vocabulaire existants chargés.`);
  return keys;
}

async function main() {
  console.log('🎯 ===== PIPELINE D\'ALIGNEMENT & D\'EXTRACTION DU VOCABULAIRE DE LA BIBLE =====\n');

  if (!fs.existsSync(FON_XML) || !fs.existsSync(FR_XML)) {
    console.error('❌ Fichiers de la Bible XML manquants. Exécutez import_bible_xml.js en premier pour les télécharger.');
    return;
  }

  // 1. Charger existant pour dédoublonner
  const existingVocab = await fetchExistingVocab();

  // 2. Parser les Bibles
  const fonBible = await parseBibleXml(FON_XML);
  const frBible = await parseBibleXml(FR_XML);

  // 3. Aligner les versets
  console.log('\n🔗 Alignement des versets en cours...');
  const countFrench = {};
  const countFon = {};
  const countCooc = {};
  let totalPairs = 0;

  for (const [key, fonText] of fonBible.entries()) {
    const frText = frBible.get(key);
    if (frText) {
      totalPairs++;
      
      const frenchTokens = [...new Set(tokenize(frText, FRENCH_STOP_WORDS))];
      const fonTokens = [...new Set(tokenize(fonText, FON_STOP_WORDS))];
      
      frenchTokens.forEach(fr => { countFrench[fr] = (countFrench[fr] || 0) + 1; });
      fonTokens.forEach(fo => { countFon[fo] = (countFon[fo] || 0) + 1; });
      
      frenchTokens.forEach(fr => {
        fonTokens.forEach(fo => {
          const pairKey = `${fr}__${fo}`;
          countCooc[pairKey] = (countCooc[pairKey] || 0) + 1;
        });
      });
    }
  }

  console.log(`📊 ${totalPairs} versets parallèles alignés avec succès.`);
  console.log('🧮 Calcul statistique Dice (Co-occurrence globale)...');

  const alignments = [];
  const minCooc = 5;      // Strong confidence threshold
  const minDice = 0.38;   // High accuracy threshold

  Object.entries(countCooc).forEach(([pairKey, cooc]) => {
    if (cooc < minCooc) return;

    const [fr, fo] = pairKey.split('__');
    const freqFr = countFrench[fr];
    const freqFo = countFon[fo];

    // Dice Coefficient calculation
    const dice = (2 * cooc) / (freqFr + freqFo);

    if (dice >= minDice) {
      alignments.push({ fr, fo, cooc, freqFr, freqFo, dice });
    }
  });

  // Sort by Dice coefficient descending
  alignments.sort((a, b) => b.dice - a.dice);

  console.log(`✨ Correspondances de haute confiance trouvées : ${alignments.length}`);

  // Resolve unique 1-to-1 word mappings (take the strongest Fon translation for each French word)
  const bestAlignments = {};
  alignments.forEach(align => {
    if (!bestAlignments[align.fr] || bestAlignments[align.fr].dice < align.dice) {
      bestAlignments[align.fr] = align;
    }
  });

  const uniqueAlignments = Object.values(bestAlignments);
  console.log(`🎯 Alignements de vocabulaire 1-à-1 retenus : ${uniqueAlignments.length}`);

  // View Top 20 extracted words
  console.log('\n🌟 Exemples de vocabulaire biblique extrait :');
  uniqueAlignments.slice(0, 20).forEach((align, index) => {
    console.log(`  ${index + 1}. [${align.fr}] ➔ [${align.fo}] (Dice: ${align.dice.toFixed(2)}, Cooc: ${align.cooc})`);
  });

  // 4. Batch Insertion into Supabase (category: Vocabulaire)
  const wordsToInsert = [];
  let skippedDuplicates = 0;

  for (const align of uniqueAlignments) {
    const key = `${align.fr.toLowerCase().trim()}__${align.fo.toLowerCase().trim()}`;
    if (existingVocab.has(key)) {
      skippedDuplicates++;
      continue;
    }

    wordsToInsert.push({
      french: align.fr.charAt(0).toUpperCase() + align.fr.slice(1),
      fon: align.fo,
      category: 'Vocabulaire',
      status: 'approved'
    });
  }

  console.log(`\n📦 Mots candidats uniques pour insertion : ${wordsToInsert.length} (Doublons évités : ${skippedDuplicates})`);

  if (wordsToInsert.length === 0) {
    console.log('⏭️  Tous les mots extraits sont déjà présents en base. Fin du script.');
    return;
  }

  console.log('📥 Démarrage de l\'insertion dans la base de données Supabase par lots de 500...');
  
  const BATCH_SIZE = 500;
  let insertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < wordsToInsert.length; i += BATCH_SIZE) {
    const batch = wordsToInsert.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('words')
      .insert(batch);

    if (error) {
      console.error(`\n❌ Erreur insertion lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
      errorCount += batch.length;
    } else {
      insertedCount += batch.length;
      process.stdout.write(`\r✅ ${insertedCount} / ${wordsToInsert.length} mots insérés...`);
    }
  }

  console.log(`\n\n🎉 ===== ALIGNEMENT & EXTRACTION TERMINÉS AVEC SUCCÈS =====`);
  console.log(`✅ Nouveaux mots de vocabulaire insérés : ${insertedCount}`);
  console.log(`⏭️  Doublons ignorés                       : ${skippedDuplicates}`);
  console.log(`❌ Échecs d'insertion                     : ${errorCount}`);
  console.log(`=========================================================\n`);
}

main().catch(console.error);
