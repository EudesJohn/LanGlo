// scripts/import_fon_words.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FON_WORDS = [
  // === SALUTATIONS ===
  { french: "Bonjour", fon: "Àlo", phonetic: "a-lo", category: "Salutation", example: "Àlo! A ɖó ali ó?" },
  { french: "Bonsoir", fon: "Àwáló", phonetic: "a-wa-lo", category: "Salutation", example: "Àwáló, mɛ gbo!" },
  { french: "Comment vas-tu ?", fon: "A ɖó ali ó?", phonetic: "a-do-a-li-o", category: "Salutation", example: "A ɖó ali ó? Un ɖó ali ganji." },
  { french: "Je vais bien", fon: "Un ɖó ali ganji", phonetic: "un-do-a-li-gan-ji", category: "Salutation", example: "" },
  { french: "Merci", fon: "Àwǎnú", phonetic: "a-wa-nu", category: "Salutation", example: "Àwǎnú, ná gbɔjɛ." },
  { french: "Au revoir", fon: "Àhwán", phonetic: "a-hwán", category: "Salutation", example: "Àhwán, mi ná kpɔ̌n miɖée tɔ̀n." },
  { french: "S'il te plaît", fon: "Bɔ̀ dó hwɛ̌", phonetic: "bo-do-hwɛ", category: "Salutation", example: "" },
  { french: "Oui", fon: "Ɛ̌ɛ̀", phonetic: "ɛɛ", category: "Expressions", example: "Ɛ̌ɛ̀, un wá." },
  { french: "Non", fon: "Àí", phonetic: "a-i", category: "Expressions", example: "Àí, mi ná yì." },
  { french: "Bienvenue", fon: "Mi wá", phonetic: "mi-wa", category: "Salutation", example: "Mi wá! A ná ɖú nǔ à?" },

  // === FAMILLE ===
  { french: "Père", fon: "Tá", phonetic: "ta", category: "Famille", example: "Tá ce nyí mɛ mɔ̌xú ɖé." },
  { french: "Mère", fon: "Nɔ̌", phonetic: "nɔ", category: "Famille", example: "Nɔ̌ ce ná yì zǒ." },
  { french: "Enfant", fon: "Vǐ", phonetic: "vi", category: "Famille", example: "Vǐ lɔ ɖó sin jí." },
  { french: "Fils", fon: "Vǐ sunɔ", phonetic: "vi su-nɔ", category: "Famille", example: "" },
  { french: "Fille", fon: "Vǐ nyɔnu", phonetic: "vi nyɔ-nu", category: "Famille", example: "" },
  { french: "Frère", fon: "Nɔví sunɔ", phonetic: "nɔ-vi su-nɔ", category: "Famille", example: "Nɔví sunɔ ce nyí wɛ̌." },
  { french: "Sœur", fon: "Nɔví nyɔnu", phonetic: "nɔ-vi nyɔ-nu", category: "Famille", example: "" },
  { french: "Grand-père", fon: "Tógbó", phonetic: "to-gbo", category: "Famille", example: "Tógbó ce kpó gǎn." },
  { french: "Grand-mère", fon: "Nɔ̌gbo", phonetic: "nɔ-gbo", category: "Famille", example: "" },
  { french: "Mari", fon: "Xwéɖóto sunɔ", phonetic: "xwé-do-to su-nɔ", category: "Famille", example: "" },
  { french: "Épouse / Femme", fon: "Asì", phonetic: "a-si", category: "Famille", example: "Asì tɔn wá sín zǒ." },
  { french: "Famille", fon: "Kéze", phonetic: "ké-ze", category: "Famille", example: "Kéze ce nyí mɔxú." },

  // === CORPS HUMAIN ===
  { french: "Tête", fon: "Tà", phonetic: "ta", category: "Corps", example: "Tà tɔn nyí dò ɖé." },
  { french: "Main", fon: "Ásì", phonetic: "a-si", category: "Corps", example: "Ásì tɔn kɛ́n." },
  { french: "Pied", fon: "Afɔ̌", phonetic: "a-fɔ", category: "Corps", example: "Afɔ̌ tɔn ɖò dò." },
  { french: "Œil", fon: "Wǎn", phonetic: "wăn", category: "Corps", example: "Wǎn tɔn ɖó hwɛ̀." },
  { french: "Bouche", fon: "Gbè", phonetic: "gbè", category: "Corps", example: "Gbè tɔn ɖò jí." },
  { french: "Nez", fon: "Tɔ̌", phonetic: "tɔ", category: "Corps", example: "" },
  { french: "Oreille", fon: "Tɔ́ɖán", phonetic: "tɔ-dan", category: "Corps", example: "" },
  { french: "Cœur", fon: "Ayǐ", phonetic: "a-yi", category: "Corps", example: "Ayǐ tɔn nyí gbɔ̌." },
  { french: "Ventre", fon: "Fú", phonetic: "fu", category: "Corps", example: "" },
  { french: "Dos", fon: "Gbó", phonetic: "gbo", category: "Corps", example: "" },

  // === CHIFFRES / NOMBRES ===
  { french: "Un (1)", fon: "Ɖókpó", phonetic: "do-kpo", category: "Nombre", example: "Nǔ ɖókpó wɛ un ɖó." },
  { french: "Deux (2)", fon: "Evè", phonetic: "e-vè", category: "Nombre", example: "Vǐ evè wɛ é ɖó." },
  { french: "Trois (3)", fon: "Etɔ̃", phonetic: "e-tɔ̃", category: "Nombre", example: "" },
  { french: "Quatre (4)", fon: "Enɛ", phonetic: "e-nɛ", category: "Nombre", example: "" },
  { french: "Cinq (5)", fon: "Atɔ̃n", phonetic: "a-tɔ̃n", category: "Nombre", example: "" },
  { french: "Six (6)", fon: "Aɖɛ", phonetic: "a-ɖɛ", category: "Nombre", example: "" },
  { french: "Sept (7)", fon: "Adɔ̌", phonetic: "a-dɔ", category: "Nombre", example: "" },
  { french: "Huit (8)", fon: "Enɛnɛ", phonetic: "e-nɛ-nɛ", category: "Nombre", example: "" },
  { french: "Neuf (9)", fon: "Azɔ̌n", phonetic: "a-zɔn", category: "Nombre", example: "" },
  { french: "Dix (10)", fon: "Wèɖé", phonetic: "wè-ɖé", category: "Nombre", example: "" },
  { french: "Vingt (20)", fon: "Gbɔ̌n", phonetic: "gbɔn", category: "Nombre", example: "" },
  { french: "Cent (100)", fon: "Adɔ̌xwé", phonetic: "a-dɔ-xwé", category: "Nombre", example: "" },

  // === NATURE ===
  { french: "Eau", fon: "Dò", phonetic: "do", category: "Nature", example: "Dò nyí nǔ kpó ɖé." },
  { french: "Feu", fon: "Jǐ", phonetic: "ji", category: "Nature", example: "Jǐ lɔ nyí gbò." },
  { french: "Terre / Sol", fon: "Jí", phonetic: "ji", category: "Nature", example: "Jí lɔ ɖó ali." },
  { french: "Soleil", fon: "Yètɔ̀", phonetic: "yè-tɔ", category: "Nature", example: "Yètɔ̀ yì ɖò jí." },
  { french: "Lune", fon: "Glèsi", phonetic: "glè-si", category: "Nature", example: "Glèsi ɖò zǎn mɛ." },
  { french: "Pluie", fon: "Zǎn", phonetic: "zan", category: "Nature", example: "" },
  { french: "Arbre", fon: "Sín", phonetic: "sin", category: "Nature", example: "Sín lɔ nyí dò ɖé." },
  { french: "Rivière / Fleuve", fon: "Tohwé", phonetic: "to-hwé", category: "Nature", example: "" },
  { french: "Montagne", fon: "Tà", phonetic: "ta", category: "Nature", example: "" },
  { french: "Vent", fon: "Fífá", phonetic: "fi-fa", category: "Nature", example: "" },

  // === ANIMAUX ===
  { french: "Chien", fon: "Avú", phonetic: "a-vu", category: "Animal", example: "Avú lɔ ɖò sín jí." },
  { french: "Chat", fon: "Wíwí", phonetic: "wi-wi", category: "Animal", example: "Wíwí lɔ ɖò xwé mɛ." },
  { french: "Poule / Poulet", fon: "Kpákpá", phonetic: "kpa-kpa", category: "Animal", example: "Kpákpá ɖò zǒ jí." },
  { french: "Vache", fon: "Nǔmɛ̌", phonetic: "nu-mɛ", category: "Animal", example: "" },
  { french: "Chèvre", fon: "Gbó", phonetic: "gbo", category: "Animal", example: "" },
  { french: "Mouton", fon: "Alì", phonetic: "a-li", category: "Animal", example: "" },
  { french: "Cochon", fon: "Ɖɔ̌gbu", phonetic: "dɔ-gbu", category: "Animal", example: "" },
  { french: "Poisson", fon: "Hwe", phonetic: "hwe", category: "Animal", example: "Hwe lɔ ɖò dò mɛ." },
  { french: "Oiseau", fon: "Wiwi", phonetic: "wi-wi", category: "Animal", example: "" },
  { french: "Serpent", fon: "Dàn", phonetic: "dan", category: "Animal", example: "Dàn lɔ ɖò jí." },

  // === VERBES COURANTS ===
  { french: "Manger", fon: "Ɖú", phonetic: "ɖu", category: "Verbe", example: "Un ná ɖú nǔ." },
  { french: "Boire", fon: "Nù", phonetic: "nu", category: "Verbe", example: "Un nù dò." },
  { french: "Dormir", fon: "Sɔ̀ nǔ", phonetic: "sɔ-nu", category: "Verbe", example: "É sɔ̀ nǔ ɖó xwé." },
  { french: "Aller", fon: "Yì", phonetic: "yi", category: "Verbe", example: "Un ná yì zǒ." },
  { french: "Venir", fon: "Wá", phonetic: "wa", category: "Verbe", example: "A wá sín fí lɛ?" },
  { french: "Voir", fon: "Kpɔ̌n", phonetic: "kpɔn", category: "Verbe", example: "Un kpɔ̌n wǎn lɔ." },
  { french: "Entendre / Écouter", fon: "Sè", phonetic: "sè", category: "Verbe", example: "A sè gbè lɔ à?" },
  { french: "Dire / Parler", fon: "Ɖɔ", phonetic: "ɖɔ", category: "Verbe", example: "É ɖɔ nǔ gěgě." },
  { french: "Marcher", fon: "Yì bɔ̌", phonetic: "yi-bɔ", category: "Verbe", example: "" },
  { french: "Courir", fon: "Gbá", phonetic: "gba", category: "Verbe", example: "" },
  { french: "Aimer", fon: "Sɔ̌ wù", phonetic: "sɔ-wu", category: "Verbe", example: "Un sɔ̌ wù we." },
  { french: "Travailler", fon: "Wà azɔ̌", phonetic: "wa-a-zɔ", category: "Verbe", example: "Un wà azɔ̌ síndó." },
  { french: "Acheter", fon: "Só", phonetic: "so", category: "Verbe", example: "É só nǔ lɔ." },
  { french: "Vendre", fon: "Ná nǔ", phonetic: "na-nu", category: "Verbe", example: "" },
  { french: "Donner", fon: "Ná", phonetic: "na", category: "Verbe", example: "Ná mì nǔ ɖé." },
  { french: "Prendre", fon: "Sɔ̀", phonetic: "sɔ", category: "Verbe", example: "Sɔ̀ nǔ lɔ." },
  { french: "Faire / Travailler", fon: "Wà", phonetic: "wa", category: "Verbe", example: "A ná wà nǔ tɔn." },
  { french: "Avoir", fon: "Ɖó", phonetic: "ɖo", category: "Verbe", example: "Un ɖó vǐ evè." },
  { french: "Être", fon: "Nyí", phonetic: "nyi", category: "Verbe", example: "É nyí mɛxomɔ ɖé." },
  { french: "Savoir / Connaître", fon: "Tuùn", phonetic: "tuùn", category: "Verbe", example: "Un tuùn Fon." },

  // === LIEUX ===
  { french: "Maison", fon: "Xwé", phonetic: "xwé", category: "Lieu", example: "Un ɖó xwé ɖé Kotonou." },
  { french: "Village", fon: "Kɔ̀tɔ", phonetic: "kɔ-tɔ", category: "Lieu", example: "" },
  { french: "Marché", fon: "Hɔ̀tɔ", phonetic: "hɔ-tɔ", category: "Lieu", example: "É yì hɔ̀tɔ." },
  { french: "Chemin / Route", fon: "Alì", phonetic: "a-li", category: "Lieu", example: "Alì lɔ nyí dò." },
  { french: "Champ", fon: "Hàn", phonetic: "han", category: "Lieu", example: "É yì hàn wà azɔ̌." },
  { french: "École", fon: "Glɛsixwé", phonetic: "glɛ-si-xwé", category: "Lieu", example: "Vǐ lɔ yì glɛsixwé." },

  // === COULEURS ===
  { french: "Blanc", fon: "Wèwè", phonetic: "wè-wè", category: "Couleur", example: "Ɖógɔ lɔ nyí wèwè." },
  { french: "Noir", fon: "Vívǐ", phonetic: "vi-vi", category: "Couleur", example: "" },
  { french: "Rouge", fon: "Yìyì", phonetic: "yi-yi", category: "Couleur", example: "" },

  // === TEMPS ===
  { french: "Aujourd'hui", fon: "Égbé", phonetic: "é-gbé", category: "Temps", example: "Égbé wɛ nǔ lɔ nyí." },
  { french: "Demain", fon: "Azǎn gbà", phonetic: "a-zăn-gba", category: "Temps", example: "Azǎn gbà wɛ mi ná yì." },
  { french: "Hier", fon: "Ɛ̌ɛn", phonetic: "ɛɛn", category: "Temps", example: "" },
  { french: "Maintenant", fon: "Yìzɔn", phonetic: "yi-zɔn", category: "Temps", example: "" },
  { french: "Nuit", fon: "Zǎn", phonetic: "zan", category: "Temps", example: "Zǎn lɔ nyí ɖaxó." },
  { french: "Jour", fon: "Azǎn", phonetic: "a-zan", category: "Temps", example: "" },
  { french: "Matin", fon: "Jɛ̌", phonetic: "jɛ", category: "Temps", example: "" },
  { french: "Soir", fon: "Gbadahwé", phonetic: "gba-da-hwé", category: "Temps", example: "" },

  // === NOURRITURE ===
  { french: "Riz", fon: "Ɛ̀klísín", phonetic: "ɛ-kli-sin", category: "Nourriture", example: "Un ná ɖú ɛ̀klísín." },
  { french: "Maïs", fon: "Blɛ̀", phonetic: "blɛ", category: "Nourriture", example: "" },
  { french: "Haricot", fon: "Ayí", phonetic: "a-yi", category: "Nourriture", example: "" },
  { french: "Pain", fon: "Bùlu", phonetic: "bu-lu", category: "Nourriture", example: "" },
  { french: "Viande", fon: "Wèsò", phonetic: "wè-so", category: "Nourriture", example: "" },
  { french: "Sel", fon: "Yɔ̀", phonetic: "yɔ", category: "Nourriture", example: "" },
  { french: "Huile de palme", fon: "Ɖɛ̀ dò", phonetic: "ɖɛ-do", category: "Nourriture", example: "" },

  // === EXPRESSIONS COURANTES ===
  { french: "C'est bien", fon: "Nyí ganji", phonetic: "nyi-gan-ji", category: "Expression", example: "Nyí ganji! A wà nǔ ɖagbe." },
  { french: "C'est mauvais", fon: "Nyí vɔ̀", phonetic: "nyi-vɔ", category: "Expression", example: "" },
  { french: "Vrai / C'est vrai", fon: "Wa jɛ", phonetic: "wa-jɛ", category: "Expression", example: "Wa jɛ wɛ! Un ɖɔ nǔ jɔ nǔ." },
  { french: "Je t'aime", fon: "Un sɔ̌ wù we", phonetic: "un-sɔ-wu-we", category: "Expression", example: "" },
  { french: "Dieu", fon: "Mawú", phonetic: "ma-wu", category: "Expression", example: "Mawú wɛ zɔ̌n nǔ." },
  { french: "Langue Fon", fon: "Fɔngbè", phonetic: "fɔn-gbè", category: "Culture", example: "Fɔngbè nyí gbè ce." },
  { french: "Bénin", fon: "Bɛ̌nɛ̀", phonetic: "bɛ-nɛ", category: "Culture", example: "Un nyí mɛ Bɛ̌nɛ̀ tɔn." },
  { french: "Roi", fon: "Axɔ̌sú", phonetic: "a-xɔ-su", category: "Culture", example: "Axɔ̌sú lɔ nyí gǎn ɖé." },
  { french: "Royauté / Palais", fon: "Axɔ̌sú xwé", phonetic: "a-xɔ-su-xwé", category: "Culture", example: "" },
  { french: "Danser", fon: "Sò", phonetic: "so", category: "Culture", example: "Mì ná sò égbé zǎn." },
  { french: "Chanter", fon: "Ɖɔ hàn", phonetic: "ɖɔ-han", category: "Culture", example: "" },
];

async function importWords() {
  console.log(`\n🚀 Démarrage de l'importation de ${FON_WORDS.length} mots Fon...\n`);

  let success = 0;
  let duplicates = 0;
  let errors = 0;

  for (const word of FON_WORDS) {
    try {
      // Vérifier si le mot existe déjà
      const { data: existing } = await supabase
        .from('words')
        .select('id')
        .ilike('fon', word.fon)
        .maybeSingle();

      if (existing) {
        console.log(`⏭️  Doublon ignoré : "${word.fon}" (${word.french})`);
        duplicates++;
        continue;
      }

      // Insérer le mot approuvé
      const { error } = await supabase
        .from('words')
        .insert([{
          french: word.french,
          fon: word.fon,
          phonetic: word.phonetic || null,
          category: word.category || null,
          example: word.example || null,
          status: 'approved'
        }]);

      if (error) {
        console.error(`❌ Erreur pour "${word.fon}": ${error.message}`);
        errors++;
      } else {
        console.log(`✅ Importé : "${word.fon}" → "${word.french}"`);
        success++;
      }
    } catch (e) {
      console.error(`❌ Exception pour "${word.fon}": ${e.message}`);
      errors++;
    }
  }

  console.log(`\n===== RÉSUMÉ =====`);
  console.log(`✅ Importés avec succès : ${success}`);
  console.log(`⏭️  Doublons ignorés    : ${duplicates}`);
  console.log(`❌ Erreurs             : ${errors}`);
  console.log(`==================\n`);
}

importWords();
