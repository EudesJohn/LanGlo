// scripts/extract_aligned_words_all.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Stop words are kept strict to filter out grammatical noise while preserving real vocabulary
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'dans', 'pour', 
  'par', 'sur', 'avec', 'sous', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 
  'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'est', 'sont', 'ont', 'a', 'au', 'aux',
  'qui', 'que', 'qu', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'ne', 'pas', 'plus', 'jamais', 'rien', 'personne', 'se', 'me', 'te', 'lui', 'leur', 'y',
  'c\'est', 's\'est', 'm\'est', 't\'est', 'j\'ai', 'tuo', 'ilo', 'avez', 'nous', 'vous',
  'sommes', 'etes', 'ont', 'etais', 'etait', 'etaient', 'aussi', 'comme', 'dans', 'tout',
  'tous', 'toute', 'toutes', 'mais', 'ou', 'où', 'donc', 'or', 'ni', 'car', 'si', 'bien',
  'tres', 'très', 'faire', 'fait', 'faire', 'faites', 'font', 'avoir', 'suis', 'es',
  'est-ce', 'auxquelles', 'quel', 'quels', 'quelle', 'quelles', 'quelque', 'quelques'
]);

const FON_STOP_WORDS = new Set([
  'lɔ', 'ɖò', 'wɛ', 'tɔn', 'mɛ', 'sin', 'ce', 'tɔ́', 'nú', 'jí', 'ye', 'e', 'mi', 'un', 'a',
  'ɔ', 'é', 'mǐ', 'bó', 'ná', 'tó', 'lɛ́', 'wɛ́', 'ɖé', 'ě', 'á', 'ó', 'co', 'bɔ', 'ka', 'lɛ',
  'tɔ', 'we', 'ɖo', 'nyi', 'nyí', 'wɛ̀', 'wɛ́', 'xá', 'dó', 'dò', 'dóo', 'té',
  'ɖokpo', 'ɖokpó', 'kpo', 'kpó', 'kpódó', 'gúdó', 'taji', 'yetɔn', 'mitɔn', 'mítɔn',
  'ní', 'nɔ́', 'nɔ', 'nú', 'nu', 'bo', 'tɔn', 'wɛn', 'din', 'dǐn', 'bǐ', 'bí'
]);

function tokenize(text, stopWordsSet) {
  if (!text) return [];
  // Tokenize using a clean regex, keep diacritics but lowercase
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"']/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    // Keep words of length >= 2 to catch short nouns (e.g. "só", "zǎ", "kɔ", "eau")
    .filter(w => w.length >= 2 && !stopWordsSet.has(w));
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
    process.stdout.write(`\rLoaded ${offset} vocab words...`);
  }
  console.log(`\n✅ ${keys.size} mots de vocabulaire existants chargés.`);
  return keys;
}

async function main() {
  console.log('🔍 Démarrage de l\'extraction statistique globale des mots (Style Glosbe)...');
  
  const existingVocab = await fetchExistingVocab();

  const countFrench = {};
  const countFon = {};
  const countCooc = {};
  let totalPairs = 0;

  // 1. Lire dataset_fr_fon.jsonl (Hugging Face)
  const hfFile = path.join('d:', 'Dico Fon', 'scripts', 'dataset_fr_fon.jsonl');
  if (fs.existsSync(hfFile)) {
    console.log(`\n📖 Analyse de : ${hfFile}...`);
    const fileStream = fs.createReadStream(hfFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });
    
    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        const messages = data.messages || [];
        if (messages.length >= 2) {
          const userMsg = messages[0].content || '';
          const assistantMsg = messages[1].content || '';
          let french = '';
          let fon = '';
          
          if (userMsg.startsWith('Traduire en fon : ')) {
            french = userMsg.replace('Traduire en fon : ', '').trim();
            fon = assistantMsg.trim();
          } else if (userMsg.startsWith('Traduire en français : ')) {
            fon = userMsg.replace('Traduire en français : ', '').trim();
            french = assistantMsg.trim();
          }
          
          if (french && fon) {
            totalPairs++;
            const frenchTokens = [...new Set(tokenize(french, FRENCH_STOP_WORDS))];
            const fonTokens = [...new Set(tokenize(fon, FON_STOP_WORDS))];
            
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
      } catch (e) {}
    }
  }

  // 2. Lire Daily Dialogues
  const file1 = path.join('d:', 'Dico Fon', 'scratch', 'ffr-v1', 'FFR-Dataset', 'FFR_Daily_Dialogues', 'Fon_French_Parallel_Data.txt');
  if (fs.existsSync(file1)) {
    console.log(`📖 Analyse de : ${file1}...`);
    const rl1 = readline.createInterface({
      input: fs.createReadStream(file1),
      crlfDelay: Infinity
    });
    
    for await (const line of rl1) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const fon = parts[0].trim();
        const french = parts[1].trim();
        if (fon && french) {
          totalPairs++;
          const frenchTokens = [...new Set(tokenize(french, FRENCH_STOP_WORDS))];
          const fonTokens = [...new Set(tokenize(fon, FON_STOP_WORDS))];
          
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
    }
  }

  // 3. Lire FFR v2
  const file2 = path.join('d:', 'Dico Fon', 'scratch', 'ffr-v1', 'FFR-Dataset', 'FFR Dataset v2', 'ffr_dataset_v2.txt');
  if (fs.existsSync(file2)) {
    console.log(`📖 Analyse de : ${file2}...`);
    const rl2 = readline.createInterface({
      input: fs.createReadStream(file2),
      crlfDelay: Infinity
    });
    
    for await (const line of rl2) {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const fon = parts[0].trim();
        const french = parts[1].trim();
        if (fon && french) {
          totalPairs++;
          const frenchTokens = [...new Set(tokenize(french, FRENCH_STOP_WORDS))];
          const fonTokens = [...new Set(tokenize(fon, FON_STOP_WORDS))];
          
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
    }
  }

  console.log(`\n📊 Total de phrases traitées : ${totalPairs}`);
  console.log(`🧮 Calcul des coefficients d'alignement Dice...`);

  const alignments = [];
  // Use slightly relaxed constraints to extract more vocabulary with the expanded 93,000-sentence corpus
  const minCooc = 4;
  const minDice = 0.35;

  Object.entries(countCooc).forEach(([pairKey, cooc]) => {
    if (cooc < minCooc) return;

    const [fr, fo] = pairKey.split('__');
    const freqFr = countFrench[fr];
    const freqFo = countFon[fo];

    // Dice Coefficient: 2 * Cooc / (FreqFr + FreqFo)
    const dice = (2 * cooc) / (freqFr + freqFo);

    if (dice >= minDice) {
      alignments.push({ fr, fo, cooc, freqFr, freqFo, dice });
    }
  });

  // Sort by Dice score descending
  alignments.sort((a, b) => b.dice - a.dice);

  console.log(`✨ Alignements de haute confiance trouvés : ${alignments.length}`);

  // Resolve best 1-to-1 mappings: find the highest Dice match for each French word
  const bestAlignments = {};
  alignments.forEach(align => {
    if (!bestAlignments[align.fr] || bestAlignments[align.fr].dice < align.dice) {
      bestAlignments[align.fr] = align;
    }
  });

  const uniqueAlignments = Object.values(bestAlignments);
  console.log(`🎯 Alignements 1-à-1 uniques retenus : ${uniqueAlignments.length}`);

  // View top examples
  console.log('\n🌟 Exemples de mots de vocabulaire extraits avec succès :');
  uniqueAlignments.slice(0, 30).forEach((align, index) => {
    console.log(`  ${index + 1}. [${align.fr}] ➔ [${align.fo}] (Score Dice: ${align.dice.toFixed(2)}, Cooc: ${align.cooc})`);
  });

  // Prepare batch insertions
  const wordsToInsert = [];
  uniqueAlignments.forEach(align => {
    const frenchWord = align.fr.charAt(0).toUpperCase() + align.fr.slice(1);
    const fonWord = align.fo.trim();
    
    const key = `${frenchWord.toLowerCase()}__${fonWord.toLowerCase()}`;
    if (!existingVocab.has(key)) {
      wordsToInsert.push({
        french: frenchWord,
        fon: fonWord,
        category: 'Vocabulaire',
        status: 'approved'
      });
    }
  });

  console.log(`\n📥 Mots uniques inédits à insérer : ${wordsToInsert.length}`);

  if (wordsToInsert.length === 0) {
    console.log('✨ Aucun nouveau mot à insérer !');
    return;
  }

  // Insert in bulk batches of 1000
  const BATCH_SIZE = 1000;
  let successCount = 0;
  let errorCount = 0;

  console.log(`📥 Insertion de ${wordsToInsert.length} mots par lots de ${BATCH_SIZE}...`);

  for (let i = 0; i < wordsToInsert.length; i += BATCH_SIZE) {
    const batch = wordsToInsert.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('words')
        .insert(batch);
        
      if (error) {
        console.error(`\n❌ Erreur lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        process.stdout.write(`\r✅ ${successCount}/${wordsToInsert.length} mots insérés...`);
      }
    } catch (err) {
      console.error(`\n❌ Exception lot ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log(`\n\n🎉 ===== EXTRACTION & INSERTION DE VOCABULAIRE TERMINÉE =====`);
  console.log(`✅ Nouveaux mots insérés avec succès : ${successCount}`);
  console.log(`❌ Échecs                             : ${errorCount}`);
  console.log(`==============================================================\n`);
}

main().catch(console.error);
