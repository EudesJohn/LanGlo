// scripts/test_wordbyword.js
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://pahmcbhktyioyvcbreow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA'
);

async function testWordByWord() {
  const phrase = 'mon papa a acheté une moto';
  const wordsArray = phrase.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"]/g, '').split(/\s+/);

  console.log('🔍 Phrase testée :', phrase);
  console.log('📝 Mots tokenisés :', wordsArray);
  console.log('\n=== MOT-À-MOT (Style Glosbe) ===\n');

  const queries = wordsArray.map(w =>
    sb.from('words')
      .select('french, fon, phonetic, category')
      .eq('status', 'approved')
      .ilike('french', w)
      .limit(10)
  );
  const results = await Promise.all(queries);

  const wordByWord = wordsArray.map((word, idx) => {
    const candidates = results[idx]?.data || [];
    if (candidates.length === 0) return { original: word, translation: '❌ non trouvé', found: false };

    candidates.sort((a, b) => {
      const sA = a.category === 'Vocabulaire' ? 0 : 1;
      const sB = b.category === 'Vocabulaire' ? 0 : 1;
      if (sA !== sB) return sA - sB;
      const fA = (a.fon || '').trim().split(/\s+/).length;
      const fB = (b.fon || '').trim().split(/\s+/).length;
      if (fA !== fB) return fA - fB;
      return (a.fon || '').length - (b.fon || '').length;
    });

    const best = candidates[0];
    const fonWords = (best.fon || '').trim().split(/\s+/);
    const translation = fonWords.length <= 2 ? best.fon : fonWords[0];
    return { original: word, translation, category: best.category, found: true };
  });

  wordByWord.forEach(w => {
    const icon = w.found ? '✅' : '❌';
    const cat = w.category ? ` [${w.category}]` : '';
    console.log(`  ${icon} ${w.original.padEnd(10)} → ${w.translation}${cat}`);
  });

  const assembled = wordByWord.filter(w => w.found).map(w => w.translation).join(' ');
  console.log('\n🎯 Phrase assemblée en Fon :', assembled);
  console.log('🎯 Résultat Glosbe attendu  : tɔ́ cé xɔ̀ kɛkɛ́ ɖokpó');
}

testWordByWord().catch(console.error);
