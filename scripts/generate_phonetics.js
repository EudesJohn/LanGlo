// scripts/generate_phonetics.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://pahmcbhktyioyvcbreow.supabase.co';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseAnonKey) {
  console.error("Erreur : la clé SUPABASE_ANON_KEY est manquante dans le fichier .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Convertit un mot en Fon en sa prononciation phonétique approximative (IPA simplifiée)
 */
function transcriberFonPhonetics(word) {
  if (!word) return '';
  let phonetic = word.toLowerCase().trim();

  // 1. Digraphes et consonnes spéciales
  phonetic = phonetic
    .replace(/gb/g, 'ɡb')
    .replace(/kp/g, 'kp')
    .replace(/ny/g, 'ɲ')
    .replace(/xw/g, 'xw')
    .replace(/hw/g, 'hw');

  // 2. Consonnes particulières
  // x en Fon se prononce comme la jota espagnole /χ/ ou /x/
  phonetic = phonetic.replace(/x/g, 'χ');
  // ɖ est une occlusive rétroflexe
  phonetic = phonetic.replace(/ɖ/g, 'ɖ');

  // 3. Nasalisation des voyelles (voyelle + n en fin de mot ou devant consonne)
  // [aeiouɛɔ]n
  phonetic = phonetic
    .replace(/([aeiouɛɔɛ́ɔ́áéíóúàèìòùɛ̀ɔ̀])n\b/g, '$1̃')
    .replace(/([aeiouɛɔɛ́ɔ́áéíóúàèìòùɛ̀ɔ̀])n(?![aeiouɛɔɛ́ɔ́áéíóúàèìòùɛ̀ɔ̀ɖ̃])/g, '$1̃');

  // Rendre le résultat propre entre crochets
  return `[${phonetic}]`;
}

async function run() {
  console.log("🔍 Récupération des mots du dictionnaire sans phonétique...");
  
  const { data: words, error } = await supabase
    .from('words')
    .select('id, fon')
    .eq('category', 'Vocabulaire')
    .or('phonetic.is.null,phonetic.eq.');

  if (error) {
    console.error("Erreur lors de la récupération :", error.message);
    return;
  }

  console.log(`📊 ${words.length} mots trouvés à traiter.`);

  let updatedCount = 0;
  const batchSize = 45;

  for (let i = 0; i < words.length; i += batchSize) {
    const batch = words.slice(i, i + batchSize);
    
    await Promise.all(batch.map(async (item) => {
      const rawWord = item.fon;
      if (!rawWord) return;

      const phoneticGuess = transcriberFonPhonetics(rawWord);
      
      const { error: updateError } = await supabase
        .from('words')
        .update({ phonetic: phoneticGuess })
        .eq('id', item.id);

      if (updateError) {
        console.error(`❌ Échec de mise à jour pour #${item.id} (${rawWord}) :`, updateError.message);
      } else {
        updatedCount++;
      }
    }));
    
    console.log(`✅ ${updatedCount} / ${words.length} mots traités...`);
  }

  console.log(`🎉 Terminé ! ${updatedCount} mots ont reçu une transcription phonétique automatique.`);
}

run();
