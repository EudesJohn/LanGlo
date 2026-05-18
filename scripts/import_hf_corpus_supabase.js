// scripts/import_hf_corpus_supabase.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const FILE_PATH = path.join(__dirname, 'dataset_fr_fon.jsonl');

async function main() {
  console.log('🚀 Analyse et importation du corpus Hugging Face Shads229/french-fongbe-corpus...');
  
  if (!fs.existsSync(FILE_PATH)) {
    console.error('❌ Le fichier dataset_fr_fon.jsonl est introuvable. Veuillez d\'abord exécuter download_hf_corpus.js');
    return;
  }

  const fileStream = fs.createReadStream(FILE_PATH);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const records = [];
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
          records.push({
            french,
            fon,
            category: 'Phrase',
            status: 'approved'
          });
        }
      }
    } catch (e) {
      console.warn(`⚠️ Erreur d'analyse ligne ${lineCount}:`, e.message);
    }
  }

  console.log(`📊 Total de paires de phrases valides trouvées : ${records.length}`);
  
  // Importer par lots (batches) de 100 pour être optimal avec l'API Supabase
  const BATCH_SIZE = 100;
  let successCount = 0;
  let errorCount = 0;
  let duplicateCount = 0;

  // On limite l'importation à un échantillon initial de 300 phrases pour commencer,
  // ou on importe tout si l'utilisateur le souhaite. Pour cette première passe, importons 500 belles phrases!
  const LIMIT = 500;
  const recordsToInsert = records.slice(0, LIMIT);

  console.log(`📥 Importation de ${recordsToInsert.length} phrases d'exemples dans Supabase par lots de ${BATCH_SIZE}...`);

  for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
    const batch = recordsToInsert.slice(i, i + BATCH_SIZE);
    
    try {
      // Filtrer les doublons avant insertion (ilike)
      const filteredBatch = [];
      
      for (const item of batch) {
        const { data: existing } = await supabase
          .from('words')
          .select('id')
          .ilike('fon', item.fon)
          .maybeSingle();
          
        if (existing) {
          duplicateCount++;
        } else {
          filteredBatch.push(item);
        }
      }
      
      if (filteredBatch.length > 0) {
        const { error } = await supabase
          .from('words')
          .insert(filteredBatch);
          
        if (error) {
          console.error(`❌ Erreur lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          errorCount += filteredBatch.length;
        } else {
          successCount += filteredBatch.length;
          process.stdout.write(`\r✅ ${successCount} phrases importées...`);
        }
      }
    } catch (err) {
      console.error(`❌ Exception lot ${Math.floor(i / BATCH_SIZE) + 1}:`, err.message);
      errorCount += batch.length;
    }
  }

  console.log(`\n\n===== RÉSUMÉ DE L'IMPORTATION =====`);
  console.log(`✅ Importées avec succès  : ${successCount}`);
  console.log(`⏭️  Doublons ignorés       : ${duplicateCount}`);
  console.log(`❌ Échecs                 : ${errorCount}`);
  console.log(`==================================`);
}

main().catch(console.error);
