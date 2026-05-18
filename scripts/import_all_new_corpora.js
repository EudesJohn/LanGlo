// scripts/import_all_new_corpora.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchExistingKeys() {
  console.log('📖 Récupération des paires existantes depuis la base de données Supabase...');
  const keys = new Set();
  let offset = 0;
  const limit = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('words')
      .select('french, fon')
      .range(offset, offset + limit - 1);
      
    if (error) {
      console.error('\n❌ Erreur lors du chargement des données existantes:', error.message);
      break;
    }
    
    if (data.length === 0) break;
    
    for (const item of data) {
      if (item.french && item.fon) {
        const key = `${item.french.toLowerCase().trim()}__${item.fon.toLowerCase().trim()}`;
        keys.add(key);
      }
    }
    
    offset += limit;
    process.stdout.write(`\rLoaded ${offset} existing keys...`);
  }
  console.log(`\n✅ ${keys.size} clés uniques de phrases chargées depuis Supabase.`);
  return keys;
}

async function main() {
  console.log('🚀 Démarrage de l\'importation MASSIVE des corpus FFR v2 et Daily Dialogues...');
  
  // 1. Charger les doublons existants
  const existingKeys = await fetchExistingKeys();

  const records = [];
  const seenInFiles = new Set();

  // 2. Parser le corpus Daily Dialogues
  const file1 = path.join('d:', 'Dico Fon', 'scratch', 'ffr-v1', 'FFR-Dataset', 'FFR_Daily_Dialogues', 'Fon_French_Parallel_Data.txt');
  console.log(`\n📖 Lecture de : ${file1}...`);
  if (fs.existsSync(file1)) {
    const rl1 = readline.createInterface({
      input: fs.createReadStream(file1),
      crlfDelay: Infinity
    });
    
    let l1Count = 0;
    for await (const line of rl1) {
      l1Count++;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const fon = parts[0].trim();
        const french = parts[1].trim();
        if (fon && french) {
          const key = `${french.toLowerCase()}__${fon.toLowerCase()}`;
          if (!seenInFiles.has(key) && !existingKeys.has(key)) {
            seenInFiles.add(key);
            records.push({
              french,
              fon,
              category: 'Phrase',
              status: 'approved'
            });
          }
        }
      }
    }
    console.log(`✅ Fichier Daily Dialogues traité (${l1Count} lignes). Nouveaux candidats uniques : ${records.length}`);
  } else {
    console.error(`❌ Fichier introuvable : ${file1}`);
  }

  // 3. Parser le corpus FFR v2
  const file2 = path.join('d:', 'Dico Fon', 'scratch', 'ffr-v1', 'FFR-Dataset', 'FFR Dataset v2', 'ffr_dataset_v2.txt');
  console.log(`\n📖 Lecture de : ${file2}...`);
  if (fs.existsSync(file2)) {
    const rl2 = readline.createInterface({
      input: fs.createReadStream(file2),
      crlfDelay: Infinity
    });
    
    let l2Count = 0;
    for await (const line of rl2) {
      l2Count++;
      const parts = line.split('\t');
      if (parts.length >= 2) {
        const fon = parts[0].trim();
        const french = parts[1].trim();
        if (fon && french) {
          const key = `${french.toLowerCase()}__${fon.toLowerCase()}`;
          if (!seenInFiles.has(key) && !existingKeys.has(key)) {
            seenInFiles.add(key);
            records.push({
              french,
              fon,
              category: 'Phrase',
              status: 'approved'
            });
          }
        }
      }
    }
    console.log(`✅ Fichier FFR v2 traité (${l2Count} lignes). Nouveaux candidats uniques au total : ${records.length}`);
  } else {
    console.error(`❌ Fichier introuvable : ${file2}`);
  }

  console.log(`\n📊 Total de nouvelles phrases uniques prêtes à être importées : ${records.length}`);

  if (records.length === 0) {
    console.log('✨ Aucune nouvelle phrase à importer !');
    return;
  }

  // 4. Insertion en masse par lots de 1000
  const BATCH_SIZE = 1000;
  let successCount = 0;
  let errorCount = 0;

  console.log(`📥 Insertion de ${records.length} phrases par lots de ${BATCH_SIZE}...`);

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('words')
        .insert(batch);
        
      if (error) {
        console.error(`\n❌ Erreur lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        process.stdout.write(`\r✅ ${successCount}/${records.length} phrases insérées avec succès...`);
      }
    } catch (err) {
      console.error(`\n❌ Exception lot ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log(`\n\n🎉 ===== IMPORTATION TERMINÉE =====`);
  console.log(`✅ Total insérées avec succès : ${successCount}`);
  console.log(`❌ Échecs                      : ${errorCount}`);
  console.log(`===================================\n`);
}

main().catch(console.error);
