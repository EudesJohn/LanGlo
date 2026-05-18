// scripts/delete_imported_words.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const WORDS_TO_DELETE = [
  "Àlo", "Àwáló", "A ɖó ali ó?", "Un ɖó ali ganji", "Àwǎnú", "Àhwán", "Bɔ̀ dó hwɛ̌", "Ɛ̌ɛ̀", "Àí", "Mi wá",
  "Tá", "Nɔ̌", "Vǐ", "Vǐ sunɔ", "Vǐ nyɔnu", "Nɔví sunɔ", "Nɔví nyɔnu", "Tógbó", "Nɔ̌gbo", "Xwéɖóto sunɔ",
  "Asì", "Kéze", "Tà", "Ásì", "Afɔ̌", "Wǎn", "Gbè", "Tɔ̌", "Tɔ́ɖán", "Ayǐ", "Fú", "Gbó",
  "Ɖókpó", "Evè", "Etɔ̃", "Enɛ", "Atɔ̃n", "Aɖɛ", "Adɔ̌", "Enɛnɛ", "Azɔ̌n", "Wèɖé", "Gbɔ̌n", "Adɔ̌xwé",
  "Dò", "Jǐ", "Jí", "Yètɔ̀", "Glèsi", "Zǎn", "Sín", "Tohwé", "Fífá",
  "Avú", "Wíwí", "Kpákpá", "Nǔmɛ̌", "Alì", "Ɖɔ̌gbu", "Hwe", "Wiwi", "Dàn",
  "Ɖú", "Nù", "Sɔ̀ nǔ", "Yì", "Wá", "Kpɔ̌n", "Sè", "Ɖɔ", "Yì bɔ̌", "Gbá", "Sɔ̌ wù", "Wà azɔ̌", "Só", "Ná nǔ", "Ná", "Sɔ̀", "Wà", "Ɖó", "Nyí", "Tuùn",
  "Kɔ̀tɔ", "Hɔ̀tɔ", "Hàn", "Glɛsixwé",
  "Wèwè", "Vívǐ", "Yìyì",
  "Égbé", "Azǎn gbà", "Ɛ̌ɛn", "Yìzɔn", "Azǎn", "Jɛ̌", "Gbadahwé",
  "Ɛ̀klísín", "Blɛ̀", "Ayí", "Bùlu", "Wèsò", "Yɔ̀", "Ɖɛ̀ dò",
  "Nyí ganji", "Nyí vɔ̀", "Wa jɛ", "Un sɔ̌ wù we", "Mawú", "Fɔngbè", "Bɛ̌nɛ̀", "Axɔ̌sú", "Axɔ̌sú xwé", "Sò", "Ɖɔ hàn"
];

async function deleteWords() {
  console.log(`🧹 Suppression de ${WORDS_TO_DELETE.length} mots importés de la base de données...`);

  // Utiliser l'opérateur .in() pour faire une suppression groupée efficace
  const { data, error } = await supabase
    .from('words')
    .delete()
    .in('fon', WORDS_TO_DELETE)
    .select('id, fon');

  if (error) {
    console.error('❌ Erreur lors de la suppression :', error.message);
  } else {
    console.log(`✅ Suppression réussie. ${data ? data.length : 0} entrées ont été retirées.`);
    if (data && data.length > 0) {
      console.log('Liste des mots supprimés :');
      console.log(data.map(d => d.fon).join(', '));
    }
  }
}

deleteWords().catch(console.error);
