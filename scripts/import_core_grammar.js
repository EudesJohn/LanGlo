// scripts/import_core_grammar.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const coreVocabulary = [
  // Pronouns
  { french: 'je', fon: 'un', category: 'Vocabulaire' },
  { french: 'moi', fon: 'nyǐ', category: 'Vocabulaire' },
  { french: 'tu', fon: 'a', category: 'Vocabulaire' },
  { french: 'toi', fon: 'hwi', category: 'Vocabulaire' },
  { french: 'il', fon: 'é', category: 'Vocabulaire' },
  { french: 'elle', fon: 'é', category: 'Vocabulaire' },
  { french: 'nous', fon: 'mǐ', category: 'Vocabulaire' },
  { french: 'vous', fon: 'mi', category: 'Vocabulaire' },
  { french: 'ils', fon: 'yě', category: 'Vocabulaire' },
  { french: 'elles', fon: 'yě', category: 'Vocabulaire' },
  { french: 'on', fon: 'è', category: 'Vocabulaire' },
  { french: 'me', fon: 'mì', category: 'Vocabulaire' },
  { french: 'te', fon: 'we', category: 'Vocabulaire' },
  { french: 'se', fon: 'mɛ́ɖée', category: 'Vocabulaire' },
  { french: 'le', fon: 'ɔ', category: 'Vocabulaire' },
  { french: 'la', fon: 'ɔ', category: 'Vocabulaire' },
  { french: 'les', fon: 'lɛ', category: 'Vocabulaire' },
  { french: 'un', fon: 'ɖokpó', category: 'Vocabulaire' },
  { french: 'une', fon: 'ɖokpó', category: 'Vocabulaire' },
  { french: 'des', fon: 'lɛ', category: 'Vocabulaire' },

  // Possessive Adjectives
  { french: 'mon', fon: 'ce', category: 'Vocabulaire' },
  { french: 'ton', fon: 'towe', category: 'Vocabulaire' },
  { french: 'son', fon: 'tɔn', category: 'Vocabulaire' },
  { french: 'ma', fon: 'ce', category: 'Vocabulaire' },
  { french: 'ta', fon: 'towe', category: 'Vocabulaire' },
  { french: 'sa', fon: 'tɔn', category: 'Vocabulaire' },
  { french: 'mes', fon: 'ce lɛ', category: 'Vocabulaire' },
  { french: 'tes', fon: 'towe lɛ', category: 'Vocabulaire' },
  { french: 'ses', fon: 'tɔn lɛ', category: 'Vocabulaire' },
  { french: 'notre', fon: 'mítɔn', category: 'Vocabulaire' },
  { french: 'votre', fon: 'mitɔn', category: 'Vocabulaire' },
  { french: 'leur', fon: 'yetɔn', category: 'Vocabulaire' },
  { french: 'nos', fon: 'mítɔn lɛ', category: 'Vocabulaire' },
  { french: 'vos', fon: 'mitɔn lɛ', category: 'Vocabulaire' },
  { french: 'leurs', fon: 'yetɔn lɛ', category: 'Vocabulaire' },

  // Common Verbs
  { french: 'être', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'suis', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'es', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'est', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'sommes', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'êtes', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'sont', fon: 'nyí', category: 'Vocabulaire' },
  { french: 'avoir', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'ai', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'as', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'a', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'avons', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'avez', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'ont', fon: 'ɖó', category: 'Vocabulaire' },
  { french: 'aller', fon: 'yì', category: 'Vocabulaire' },
  { french: 'vais', fon: 'yì', category: 'Vocabulaire' },
  { french: 'va', fon: 'yì', category: 'Vocabulaire' },
  { french: 'allons', fon: 'yì', category: 'Vocabulaire' },
  { french: 'allez', fon: 'yì', category: 'Vocabulaire' },
  { french: 'vont', fon: 'yì', category: 'Vocabulaire' },
  { french: 'faire', fon: 'bló', category: 'Vocabulaire' },
  { french: 'fais', fon: 'bló', category: 'Vocabulaire' },
  { french: 'fait', fon: 'bló', category: 'Vocabulaire' },
  { french: 'faisons', fon: 'bló', category: 'Vocabulaire' },
  { french: 'faites', fon: 'bló', category: 'Vocabulaire' },
  { french: 'font', fon: 'bló', category: 'Vocabulaire' },
  { french: 'dire', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'dis', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'dit', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'disons', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'dites', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'disent', fon: 'ɖɔ', category: 'Vocabulaire' },
  { french: 'acheter', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'acheté', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'achète', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'achetons', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'achetez', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'achètent', fon: 'xɔ', category: 'Vocabulaire' },
  { french: 'vouloir', fon: 'jló', category: 'Vocabulaire' },
  { french: 'veux', fon: 'jló', category: 'Vocabulaire' },
  { french: 'veut', fon: 'jló', category: 'Vocabulaire' },
  { french: 'voulons', fon: 'jló', category: 'Vocabulaire' },
  { french: 'voulez', fon: 'jló', category: 'Vocabulaire' },
  { french: 'veulent', fon: 'jló', category: 'Vocabulaire' },
  { french: 'pouvoir', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'peux', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'peut', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'pouvons', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'pouvez', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'peuvent', fon: 'sixu', category: 'Vocabulaire' },
  { french: 'aimer', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'aime', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'aimes', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'aimons', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'aimez', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'aiment', fon: 'yí wǎn nú', category: 'Vocabulaire' },
  { french: 'venir', fon: 'wá', category: 'Vocabulaire' },
  { french: 'viens', fon: 'wá', category: 'Vocabulaire' },
  { french: 'vient', fon: 'wá', category: 'Vocabulaire' },
  { french: 'venons', fon: 'wá', category: 'Vocabulaire' },
  { french: 'venez', fon: 'wá', category: 'Vocabulaire' },
  { french: 'viennent', fon: 'wá', category: 'Vocabulaire' },

  // Key Foundational Nouns
  { french: 'papa', fon: 'tɔ́', category: 'Vocabulaire' },
  { french: 'maman', fon: 'nɔ̂', category: 'Vocabulaire' },
  { french: 'père', fon: 'tɔ́', category: 'Vocabulaire' },
  { french: 'mère', fon: 'nɔ̂', category: 'Vocabulaire' },
  { french: 'frère', fon: 'nɔví súnnu', category: 'Vocabulaire' },
  { french: 'soeur', fon: 'nɔví nyɔ̌nu', category: 'Vocabulaire' },
  { french: 'enfant', fon: 'vǐ', category: 'Vocabulaire' },
  { french: 'homme', fon: 'súnnu', category: 'Vocabulaire' },
  { french: 'femme', fon: 'nyɔ̌nu', category: 'Vocabulaire' },
  { french: 'moto', fon: 'kɛkɛ́', category: 'Vocabulaire' },
  { french: 'bicyclette', fon: 'kɛkɛ́', category: 'Vocabulaire' },
  { french: 'vélo', fon: 'kɛkɛ́', category: 'Vocabulaire' },
  { french: 'voiture', fon: 'mɔto', category: 'Vocabulaire' },
  { french: 'auto', fon: 'mɔto', category: 'Vocabulaire' },
  { french: 'maison', fon: 'xwé', category: 'Vocabulaire' },
  { french: 'eau', fon: 'sin', category: 'Vocabulaire' },
  { french: 'pain', fon: 'wɔxúxú', category: 'Vocabulaire' },
  { french: 'argent', fon: 'akwɛ́', category: 'Vocabulaire' },
  { french: 'travail', fon: 'azɔ̌', category: 'Vocabulaire' },
  { french: 'dieu', fon: 'mawu', category: 'Vocabulaire' },
  { french: 'ami', fon: 'xɔ́ntɔn', category: 'Vocabulaire' },
  { french: 'chose', fon: 'nǔ', category: 'Vocabulaire' },
  { french: 'terre', fon: 'ayǐ', category: 'Vocabulaire' },
  { french: 'ciel', fon: 'jǐxwé', category: 'Vocabulaire' },
  { french: 'jour', fon: 'zán', category: 'Vocabulaire' },
  { french: 'nuit', fon: 'zǎ', category: 'Vocabulaire' },
  { french: 'temps', fon: 'hwenu', category: 'Vocabulaire' },
  { french: 'pays', fon: 'tò', category: 'Vocabulaire' },
  { french: 'ville', fon: 'toxo', category: 'Vocabulaire' },
  { french: 'chemin', fon: 'alixo', category: 'Vocabulaire' },
  { french: 'route', fon: 'alixo', category: 'Vocabulaire' },
  { french: 'parole', fon: 'xó', category: 'Vocabulaire' },
  { french: 'nom', fon: 'nyǐkɔ', category: 'Vocabulaire' },
  { french: 'corps', fon: 'agbaza', category: 'Vocabulaire' },
  { french: 'tête', fon: 'ta', category: 'Vocabulaire' },
  { french: 'main', fon: 'alɔ́', category: 'Vocabulaire' },
  { french: 'pied', fon: 'afɔ́', category: 'Vocabulaire' },
  { french: 'oeil', fon: 'nukún', category: 'Vocabulaire' },
  { french: 'yeux', fon: 'nukún', category: 'Vocabulaire' },
  { french: 'coeur', fon: 'ayi', category: 'Vocabulaire' },
  { french: 'sang', fon: 'hun', category: 'Vocabulaire' },

  // Prepositions & Conjunctions
  { french: 'et', fon: 'kpo', category: 'Vocabulaire' },
  { french: 'avec', fon: 'kpó', category: 'Vocabulaire' },
  { french: 'dans', fon: 'mɛ', category: 'Vocabulaire' },
  { french: 'sur', fon: 'jí', category: 'Vocabulaire' },
  { french: 'sous', fon: 'gúdó', category: 'Vocabulaire' },
  { french: 'pour', fon: 'nú', category: 'Vocabulaire' },
  { french: 'à', fon: 'ɖò', category: 'Vocabulaire' },
  { french: 'de', fon: 'sin', category: 'Vocabulaire' },
  { french: 'mais', fon: 'loɔ', category: 'Vocabulaire' },
  { french: 'ou', fon: 'alɔ̌', category: 'Vocabulaire' },
  { french: 'comme', fon: 'ɖi', category: 'Vocabulaire' },
  { french: 'si', fon: 'enyi', category: 'Vocabulaire' },
  { french: 'très', fon: 'tawun', category: 'Vocabulaire' },
  { french: 'bien', fon: 'ganji', category: 'Vocabulaire' }
];

async function main() {
  console.log('📥 Démarrage de l\'insertion du vocabulaire grammatical de base...');
  
  let successCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (const item of coreVocabulary) {
    try {
      // Check for exact case-insensitive duplicate
      const { data: existing } = await supabase
        .from('words')
        .select('id')
        .ilike('french', item.french)
        .ilike('fon', item.fon)
        .maybeSingle();

      if (existing) {
        duplicateCount++;
      } else {
        const { error } = await supabase
          .from('words')
          .insert([{
            french: item.french.charAt(0).toUpperCase() + item.french.slice(1),
            fon: item.fon,
            category: item.category,
            status: 'approved'
          }]);

        if (error) {
          console.error(`❌ Erreur insertion [${item.french}]:`, error.message);
          errorCount++;
        } else {
          successCount++;
        }
      }
    } catch (err) {
      console.error(`❌ Exception pour [${item.french}]:`, err.message);
      errorCount++;
    }
  }

  console.log(`\n🎉 ===== INSERTION GRAMMATICALE TERMINÉE =====`);
  console.log(`✅ Nouveaux mots de base insérés : ${successCount}`);
  console.log(`⏭️  Doublons déjà présents       : ${duplicateCount}`);
  console.log(`❌ Échecs                      : ${errorCount}`);
  console.log(`============================================\n`);
}

main().catch(console.error);
