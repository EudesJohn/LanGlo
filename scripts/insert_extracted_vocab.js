// scripts/insert_extracted_vocab.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

async function insertVocab() {
  console.log("🚀 Démarrage de l'injection massive du vocabulaire...");

  // 1. Charger les mots extraits
  const vocabData = JSON.parse(fs.readFileSync('scratch/extracted_vocab.json', 'utf8'));
  console.log(`\n📄 ${vocabData.length} mots à traiter depuis l'extraction.`);

  // 2. Charger les mots déjà en base
  const existingKeys = await fetchExistingVocab();

  // 3. Préparer les mots à insérer
  const wordsToInsert = [];
  let skippedDuplicates = 0;

  for (const item of vocabData) {
    const key = `${item.french.toLowerCase().trim()}__${item.fon.toLowerCase().trim()}`;
    if (existingKeys.has(key)) {
      skippedDuplicates++;
      continue;
    }

    wordsToInsert.push({
      french: item.french.charAt(0).toUpperCase() + item.french.slice(1),
      fon: item.fon,
      category: 'Vocabulaire',
      status: 'approved'
    });
  }

  console.log(`\n📦 Mots uniques prêts à l'insertion : ${wordsToInsert.length} (Doublons évités : ${skippedDuplicates})`);

  if (wordsToInsert.length === 0) {
    console.log('⏭️  Tous les mots sont déjà présents en base. Fin de l\'opération.');
    return;
  }

  // 4. Insérer par lots de 500
  console.log('📥 Démarrage de l\'insertion dans Supabase par lots de 500...');
  
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

  console.log(`\n\n🎉 ===== INJECTION TERMINÉE AVEC SUCCÈS =====`);
  console.log(`✅ Nouveaux mots de vocabulaire insérés : ${insertedCount}`);
  console.log(`⏭️  Doublons ignorés                       : ${skippedDuplicates}`);
  console.log(`❌ Échecs d'insertion                     : ${errorCount}`);
  console.log(`=========================================================\n`);
}

insertVocab().catch(console.error);
