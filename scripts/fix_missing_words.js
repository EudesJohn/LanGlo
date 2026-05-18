// scripts/fix_missing_words.js
// Ajoute/corrige les mots manquants pour atteindre la précision Glosbe
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://pahmcbhktyioyvcbreow.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA'
);

// Mots manquants ou à corriger pour avoir exactement la précision Glosbe
const WORDS_TO_ADD = [
  // Articles / déterminants indéfinis
  { french: 'une',    fon: 'ɖokpó',  category: 'Vocabulaire' },
  { french: 'Un',     fon: 'ɖokpó',  category: 'Vocabulaire' },
  { french: 'un',     fon: 'ɖokpó',  category: 'Vocabulaire' },

  // Verbe avoir (auxiliaire)
  { french: 'a',      fon: 'wá',     category: 'Vocabulaire' },

  // Particule possessive Fon (corriger "mon" → "cé" avec accent correct)
  { french: 'mon',    fon: 'cé',     category: 'Vocabulaire' },
  { french: 'ma',     fon: 'cé',     category: 'Vocabulaire' },

  // Acheter (passé composé)
  { french: 'acheté', fon: 'xɔ̀',    category: 'Vocabulaire' },
  { french: 'acheter',fon: 'xɔ̀',    category: 'Vocabulaire' },

  // Moto avec accent correct
  { french: 'moto',   fon: 'kɛkɛ́',  category: 'Vocabulaire' },

  // Papa / père avec accord exact
  { french: 'papa',   fon: 'tɔ́',    category: 'Vocabulaire' },
  { french: 'père',   fon: 'tɔ́',    category: 'Vocabulaire' },

  // Autres mots grammaticaux fréquents
  { french: 'ton',    fon: 'towe',   category: 'Vocabulaire' },
  { french: 'son',    fon: 'tɔn',    category: 'Vocabulaire' },
  { french: 'ta',     fon: 'towe',   category: 'Vocabulaire' },
  { french: 'sa',     fon: 'tɔn',    category: 'Vocabulaire' },
  { french: 'notre',  fon: 'mǐtɔn',  category: 'Vocabulaire' },
  { french: 'votre',  fon: 'mitɔn',  category: 'Vocabulaire' },
  { french: 'leur',   fon: 'yetɔn',  category: 'Vocabulaire' },
  { french: 'je',     fon: 'un',     category: 'Vocabulaire' },
  { french: 'tu',     fon: 'a',      category: 'Vocabulaire' },
  { french: 'il',     fon: 'é',      category: 'Vocabulaire' },
  { french: 'elle',   fon: 'é',      category: 'Vocabulaire' },
  { french: 'nous',   fon: 'mǐ',     category: 'Vocabulaire' },
  { french: 'vous',   fon: 'mi',     category: 'Vocabulaire' },
  { french: 'ils',    fon: 'ye',     category: 'Vocabulaire' },
  { french: 'elles',  fon: 'ye',     category: 'Vocabulaire' },
  { french: 'le',     fon: 'ɔ́',     category: 'Vocabulaire' },
  { french: 'la',     fon: 'ɔ́',     category: 'Vocabulaire' },
  { french: 'les',    fon: 'lɛ́',    category: 'Vocabulaire' },
  { french: 'est',    fon: 'nyí',    category: 'Vocabulaire' },
  { french: 'sont',   fon: 'nyí',    category: 'Vocabulaire' },
  { french: 'avec',   fon: 'kpó',    category: 'Vocabulaire' },
  { french: 'dans',   fon: 'mɛ',     category: 'Vocabulaire' },
  { french: 'sur',    fon: 'jí',     category: 'Vocabulaire' },
  { french: 'pour',   fon: 'nú',     category: 'Vocabulaire' },
  { french: 'par',    fon: 'gbɔn',   category: 'Vocabulaire' },
  { french: 'de',     fon: 'tɔn',    category: 'Vocabulaire' },
  { french: 'du',     fon: 'tɔn',    category: 'Vocabulaire' },
  { french: 'et',     fon: 'kpó',    category: 'Vocabulaire' },
  { french: 'mais',   fon: 'amɛ',    category: 'Vocabulaire' },
  { french: 'aussi',  fon: 'lɛ̀lɛ̀', category: 'Vocabulaire' },
  { french: 'non',    fon: 'ɛ̀ɛ̀',   category: 'Vocabulaire' },
  { french: 'oui',    fon: 'ɛ̌ɛ̌',   category: 'Vocabulaire' },
];

async function insertWords() {
  console.log('🚀 Insertion/correction des mots pour précision Glosbe...\n');
  let added = 0, skipped = 0, errors = 0;

  for (const word of WORDS_TO_ADD) {
    // Vérifier si ce couple français+fon existe déjà
    const { data: existing } = await sb
      .from('words')
      .select('id')
      .ilike('french', word.french)
      .ilike('fon', word.fon)
      .eq('category', 'Vocabulaire')
      .maybeSingle();

    if (existing) {
      console.log(`⏭️  [${word.french}] → [${word.fon}] déjà présent`);
      skipped++;
      continue;
    }

    const { error } = await sb.from('words').insert([{
      french: word.french,
      fon: word.fon,
      category: word.category,
      status: 'approved'
    }]);

    if (error) {
      console.error(`❌ Erreur [${word.french}]:`, error.message);
      errors++;
    } else {
      console.log(`✅ Ajouté : [${word.french}] → [${word.fon}]`);
      added++;
    }
  }

  console.log(`\n=== RÉSUMÉ ===`);
  console.log(`✅ Ajoutés  : ${added}`);
  console.log(`⏭️  Existants: ${skipped}`);
  console.log(`❌ Erreurs  : ${errors}`);
}

insertWords().catch(console.error);
