// scripts/update_correct_words.js
// Corrige les anciennes entrées inexactes dans Supabase
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://pahmcbhktyioyvcbreow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA'
);

// Corrections : [french, ancien_fon_inexact, nouveau_fon_correct]
const CORRECTIONS = [
  // "mon" avec accent correct sur le é
  ['mon',     'ce',   'cé'],
  ['Mon',     'ce',   'cé'],
  // "acheté" avec l'accent correct sur le o
  ['acheté',  'xɔ',   'xɔ̀'],
  ['Acheté',  'xɔ',   'xɔ̀'],
  // "acheter" avec l'accent correct
  ['acheter', 'xɔ',   'xɔ̀'],
];

async function correctWords() {
  console.log('🔧 Correction des entrées inexactes...\n');
  let updated = 0, notFound = 0, errors = 0;

  for (const [french, oldFon, newFon] of CORRECTIONS) {
    // Trouver l'ancienne entrée exacte
    const { data: existing, error: findErr } = await sb
      .from('words')
      .select('id, french, fon, category')
      .ilike('french', french)
      .ilike('fon', oldFon)
      .eq('status', 'approved')
      .limit(5);

    if (findErr) {
      console.error(`❌ Erreur recherche [${french}]:`, findErr.message);
      errors++;
      continue;
    }

    if (!existing || existing.length === 0) {
      console.log(`⚠️  [${french}] → [${oldFon}] non trouvé, rien à corriger`);
      notFound++;
      continue;
    }

    for (const entry of existing) {
      const { error: updateErr } = await sb
        .from('words')
        .update({ fon: newFon })
        .eq('id', entry.id);

      if (updateErr) {
        console.error(`❌ Erreur mise à jour id=${entry.id}:`, updateErr.message);
        errors++;
      } else {
        console.log(`✅ Corrigé [${entry.french}]: "${entry.fon}" → "${newFon}" (id: ${entry.id}, cat: ${entry.category})`);
        updated++;
      }
    }
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`✅ Corrigés   : ${updated}`);
  console.log(`⚠️  Non trouvés: ${notFound}`);
  console.log(`❌ Erreurs    : ${errors}`);
}

correctWords().catch(console.error);
