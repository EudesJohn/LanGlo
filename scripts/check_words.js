// scripts/check_words.js
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://pahmcbhktyioyvcbreow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA'
);

async function check() {
  // Les 6 mots que Glosbe utilise pour traduire "mon papa a acheté une moto"
  // Résultat attendu: tɔ́ cé xɔ̀ kɛkɛ́ ɖokpó
  const wordsToCheck = ['mon', 'papa', 'père', 'acheté', 'acheter', 'une', 'moto', 'kɛkɛ́', 'tɔ́', 'cé', 'xɔ̀', 'ɖokpó'];
  
  console.log('=== VÉRIFICATION DES MOTS CLÉS ===\n');
  
  for (const w of wordsToCheck) {
    const { data: byFr } = await sb.from('words').select('french,fon,category').eq('status','approved').ilike('french', w).limit(3);
    const { data: byFon } = await sb.from('words').select('french,fon,category').eq('status','approved').ilike('fon', w).limit(3);
    const all = [...(byFr || []), ...(byFon || [])];
    if (all.length > 0) {
      all.forEach(e => {
        console.log(`✅ [${w}] → french: "${e.french}" | fon: "${e.fon}" | cat: ${e.category}`);
      });
    } else {
      console.log(`❌ [${w}] → ABSENT de la base de données`);
    }
  }
  
  console.log('\n=== FIN ===');
}

check().catch(console.error);
