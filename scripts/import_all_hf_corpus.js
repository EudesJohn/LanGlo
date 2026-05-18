// scripts/import_all_hf_corpus.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = path.join(__dirname, 'dataset_fr_fon.jsonl');

async function main() {
  console.log('🚀 Démarrage de l\'importation MASSIVE du corpus Hugging Face Shads229/french-fongbe-corpus...');
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error('❌ Le fichier dataset_fr_fon.jsonl est introuvable.');
    return;
  }

  const fileStream = fs.createReadStream(FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const rawRecords = [];
  let lineCount = 0;
  
  for await (const line of rl) {
    if (!line.trim()) continue;
    lineCount++;
    
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
          rawRecords.push({
            french,
            fon,
            category: 'Phrase',
            status: 'approved'
          });
        }
      }
    } catch (e) {
      // Ignorer les lignes corrompues
    }
  }

  console.log(`📊 Paires de phrases valides extraites de la source : ${rawRecords.length}`);

  // Filtrage des doublons EN MÉMOIRE (ultra rapide, 0 requêtes SQL)
  const seen = new Set();
  const uniqueRecords = [];
  for (const item of rawRecords) {
    const key = `${item.french.toLowerCase()}_${item.fon.toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRecords.push(item);
    }
  }

  console.log(`✨ Phrases uniques prêtes pour insertion : ${uniqueRecords.length}`);

  // Importation massive par lots de 200 (très stable pour PostgREST)
  const BATCH_SIZE = 200;
  let successCount = 0;
  let errorCount = 0;

  console.log(`📥 Insertion en cours de ${uniqueRecords.length} phrases par lots de ${BATCH_SIZE}...`);

  for (let i = 0; i < uniqueRecords.length; i += BATCH_SIZE) {
    const batch = uniqueRecords.slice(i, i + BATCH_SIZE);
    
    try {
      const { error } = await supabase
        .from('words')
        .insert(batch);
        
      if (error) {
        console.error(`❌ Erreur lors de l'insertion du lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
        errorCount += batch.length;
      } else {
        successCount += batch.length;
        process.stdout.write(`\r✅ ${successCount} phrases insérées avec succès...`);
      }
    } catch (err) {
      console.error(`❌ Exception lors du lot ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log(`\n\n🎉 ===== IMPORTATION MASSIVE TERMINÉE =====`);
  console.log(`✅ Total insérées avec succès : ${successCount}`);
  console.log(`❌ Échecs                      : ${errorCount}`);
  console.log(`===========================================\n`);
}

main().catch(console.error);
