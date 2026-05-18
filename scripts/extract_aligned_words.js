// scripts/extract_aligned_words.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const CORPUS_PATH = path.join(__dirname, 'dataset_fr_fon.jsonl');

// List of very common stop words to avoid aligning grammatical noise
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'dans', 'pour', 
  'par', 'sur', 'avec', 'dans', 'sous', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 
  'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'est', 'sont', 'ont', 'a', 'au', 'aux'
]);

const FON_STOP_WORDS = new Set([
  'lɔ', 'ɖò', 'wɛ', 'tɔn', 'mɛ', 'sin', 'ce', 'tɔ́', 'nú', 'jí', 'ye', 'e', 'mi', 'un', 'a'
]);

function tokenize(text, stopWordsSet) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length > 2 && !stopWordsSet.has(w)); // filter short words and stop words
}

async function main() {
  console.log('🔍 Démarrage de l\'extraction statistique des mots un-à-un...');

  if (!fs.existsSync(CORPUS_PATH)) {
    console.error('❌ Fichier corpus introuvable.');
    return;
  }

  const fileStream = fs.createReadStream(CORPUS_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const countFrench = {};
  const countFon = {};
  const countCooc = {};
  let pairCount = 0;

  console.log('📖 Analyse des phrases...');
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
          pairCount++;
          const frenchTokens = [...new Set(tokenize(french, FRENCH_STOP_WORDS))];
          const fonTokens = [...new Set(tokenize(fon, FON_STOP_WORDS))];

          // Increment individual frequencies
          frenchTokens.forEach(fr => {
            countFrench[fr] = (countFrench[fr] || 0) + 1;
          });
          fonTokens.forEach(fo => {
            countFon[fo] = (countFon[fo] || 0) + 1;
          });

          // Increment co-occurrence frequencies
          frenchTokens.forEach(fr => {
            fonTokens.forEach(fo => {
              const pairKey = `${fr}__${fo}`;
              countCooc[pairKey] = (countCooc[pairKey] || 0) + 1;
            });
          });
        }
      }
    } catch (e) {
      // Ignorer les erreurs d'analyse de ligne
    }
  }

  console.log(`📊 Phrases traitées : ${pairCount}`);
  console.log(`🧮 Calcul des coefficients d'alignement...`);

  const alignments = [];
  const minCooc = 4; // minimum co-occurrence threshold
  const minDice = 0.35; // minimum Dice alignment score threshold

  Object.entries(countCooc).forEach(([pairKey, cooc]) => {
    if (cooc < minCooc) return;

    const [fr, fo] = pairKey.split('__');
    const freqFr = countFrench[fr];
    const freqFo = countFon[fo];

    // Dice Coefficient formula: 2 * C(fr, fo) / (C(fr) + C(fo))
    const dice = (2 * cooc) / (freqFr + freqFo);

    if (dice >= minDice) {
      alignments.push({ fr, fo, cooc, freqFr, freqFo, dice });
    }
  });

  // Sort by Dice score descending
  alignments.sort((a, b) => b.dice - a.dice);

  console.log(`✨ Alignements de haute confiance trouvés : ${alignments.length}`);

  // Retenir le meilleur mot Fon pour chaque mot Français (alignement 1-à-1 le plus fort)
  const bestAlignments = {};
  alignments.forEach(align => {
    if (!bestAlignments[align.fr] || bestAlignments[align.fr].dice < align.dice) {
      bestAlignments[align.fr] = align;
    }
  });

  const uniqueAlignments = Object.values(bestAlignments);
  console.log(`🎯 Alignements 1-à-1 uniques retenus : ${uniqueAlignments.length}`);

  // Afficher les 20 meilleurs pour validation visuelle
  console.log('\n🌟 Exemples de mots extraits avec succès :');
  uniqueAlignments.slice(0, 30).forEach((align, index) => {
    console.log(`  ${index + 1}. [${align.fr}] ➔ [${align.fo}] (Score Dice: ${align.dice.toFixed(2)}, Cooc: ${align.cooc})`);
  });

  // Insertion dans Supabase de ces mots un par un !
  const BATCH_SIZE = 100;
  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  // On filtre en mémoire pour voir ce qui n'existe pas déjà
  const wordsToInsert = [];
  
  console.log('\n📥 Filtrage avec la base existante pour éviter les doublons...');
  for (const align of uniqueAlignments) {
    // Capitalize for clean dictionary presentation
    const frenchWord = align.fr.charAt(0).toUpperCase() + align.fr.slice(1);
    const fonWord = align.fo; // Keep Fon casing

    wordsToInsert.push({
      french: frenchWord,
      fon: fonWord,
      category: 'Vocabulaire',
      status: 'approved'
    });
  }

  console.log(`📥 Insertion en cours de ${wordsToInsert.length} mots uniques dans la base...`);

  for (let i = 0; i < wordsToInsert.length; i += BATCH_SIZE) {
    const batch = wordsToInsert.slice(i, i + BATCH_SIZE);
    
    try {
      // Filtrer les doublons de manière simple avant insertion
      const cleanBatch = [];
      for (const item of batch) {
        const { data: existing } = await supabase
          .from('words')
          .select('id')
          .ilike('french', item.french)
          .ilike('fon', item.fon)
          .maybeSingle();

        if (existing) {
          duplicateCount++;
        } else {
          cleanBatch.push(item);
        }
      }

      if (cleanBatch.length > 0) {
        const { error } = await supabase
          .from('words')
          .insert(cleanBatch);

        if (error) {
          console.error(`❌ Erreur lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          errorCount += cleanBatch.length;
        } else {
          successCount += cleanBatch.length;
          process.stdout.write(`\r✅ ${successCount} mots insérés...`);
        }
      }
    } catch (err) {
      console.error(`❌ Exception lot ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log(`\n\n🎉 ===== EXTRACTION & ALIGNEMENT TERMINÉS =====`);
  console.log(`✅ Nouveaux mots importés : ${successCount}`);
  console.log(`⏭️  Doublons ignorés       : ${duplicateCount}`);
  console.log(`❌ Échecs                 : ${errorCount}`);
  console.log(`================================================\n`);
}

main().catch(console.error);
