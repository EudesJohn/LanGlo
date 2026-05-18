// scripts/extract_all_words.js
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Paramètres de qualité ABSOLUE (comme le veut l'utilisateur)
const MIN_OCCURRENCES = 3; // Le mot doit apparaître au moins 3 fois
const MIN_DICE_SCORE = 0.25; // Score suffisant pour des mots plus rares mais alignés

const FON_XML = path.join(__dirname, 'FonBible.xml');
const FR_XML = path.join(__dirname, 'FrenchBible.xml');
const FFR_TXT = path.join(__dirname, '../scratch/ffr-v1/FFR-Dataset/ffr_dataset_fon_fr_with_diacritics.txt');

// Liste des mots grammaticaux à ignorer
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'en', 'dans', 'pour', 
  'par', 'sur', 'avec', 'sous', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 
  'son', 'ma', 'ta', 'sa', 'mes', 'tes', 'ses', 'est', 'sont', 'ont', 'a', 'au', 'aux',
  'qui', 'que', 'qu', 'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
  'ne', 'pas', 'plus', 'jamais', 'rien', 'personne', 'se', 'me', 'te', 'lui', 'leur', 'y',
  'c\'est', 's\'est', 'm\'est', 't\'est', 'j\'ai', 'tuo', 'ilo', 'avez', 'nous', 'vous',
  'sommes', 'etes', 'ont', 'etais', 'etait', 'etaient', 'aussi', 'comme', 'dans', 'tout',
  'tous', 'toute', 'toutes', 'mais', 'ou', 'où', 'donc', 'or', 'ni', 'car', 'si', 'bien',
  'tres', 'très', 'faire', 'fait', 'faites', 'font', 'avoir', 'suis', 'es', 'dit', 'dis',
  'est-ce', 'auxquelles', 'quel', 'quels', 'quelle', 'quelles', 'quelque', 'quelques',
  'ceci', 'cela', 'ils', 'elles', 'lorsque', 'alors', 'quand', 'donc', 'ainsi', 'plusieurs'
]);

const FON_STOP_WORDS = new Set([
  'lɔ', 'ɖò', 'wɛ', 'tɔn', 'mɛ', 'sin', 'ce', 'tɔ́', 'nú', 'jí', 'ye', 'e', 'mi', 'un', 'a',
  'ɔ', 'é', 'mǐ', 'bó', 'ná', 'tó', 'lɛ́', 'wɛ́', 'ɖé', 'ě', 'á', 'ó', 'co', 'bɔ', 'ka', 'lɛ',
  'tɔ', 'we', 'ɖo', 'nyi', 'nyí', 'wɛ̀', 'wɛ́', 'xá', 'dó', 'dò', 'dóo', 'té',
  'ɖokpo', 'ɖokpó', 'kpo', 'kpó', 'kpódó', 'gúdó', 'taji', 'yetɔn', 'mitɔn', 'mítɔn',
  'ní', 'nɔ́', 'nɔ', 'nú', 'nu', 'bo', 'tɔn', 'wɛn', 'din', 'dǐn', 'bǐ', 'bí', 'dáa', 'ɔ́'
]);

function tokenize(text, stopWords) {
  if (!text) return [];
  return text.toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"«»'’]/g, ' ')
    .split(/\s+/)
    .map(w => w.trim())
    .filter(w => w.length >= 2 && !stopWords.has(w) && !/^[0-9]+$/.test(w));
}

// Rapid line-by-line XML parser
async function parseBibleXml(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const versesMap = new Map();
  let currentTestament = '', currentBook = '', currentChapter = '';

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const testamentMatch = trimmed.match(/<testament name="([^"]+)">/i);
    if (testamentMatch) { currentTestament = testamentMatch[1]; continue; }

    const bookMatch = trimmed.match(/<book number="([^"]+)">/i);
    if (bookMatch) { currentBook = bookMatch[1]; continue; }

    const chapterMatch = trimmed.match(/<chapter number="([^"]+)">/i);
    if (chapterMatch) { currentChapter = chapterMatch[1]; continue; }

    const verseMatch = trimmed.match(/<verse number="([^"]+)">([^<]+)<\/verse>/i);
    if (verseMatch) {
      const verseNumber = verseMatch[1];
      const text = verseMatch[2].trim();
      const key = `${currentTestament}_${currentBook}_${currentChapter}_${verseNumber}`;
      versesMap.set(key, text);
    }
  }
  return versesMap;
}

async function extract() {
  console.log("🚀 Lancement de l'Extracteur Global Qualité Absolue...");
  
  let parallelSentences = [];

  // ==========================================
  // 1. CHARGEMENT DE LA BIBLE
  // ==========================================
  try {
    const fonBible = await parseBibleXml(FON_XML);
    const frBible = await parseBibleXml(FR_XML);
    let bibleCount = 0;
    
    for (const [key, fonText] of fonBible.entries()) {
      const frText = frBible.get(key);
      if (frText) {
        parallelSentences.push({ fon: fonText, fr: frText });
        bibleCount++;
      }
    }
    console.log(`✅ Bible chargée : ${bibleCount} phrases parallèles.`);
  } catch (e) {
    console.log("❌ Erreur chargement Bible :", e.message);
  }

  // ==========================================
  // 2. CHARGEMENT DU FFR DATASET
  // ==========================================
  try {
    const ffrContent = fs.readFileSync(FFR_TXT, 'utf-8');
    const lines = ffrContent.split('\n');
    let ffrCount = 0;
    lines.forEach(line => {
      const parts = line.split('\t');
      if (parts.length >= 2) {
        parallelSentences.push({
          fon: parts[0].trim(),
          fr: parts[1].trim()
        });
        ffrCount++;
      }
    });
    console.log(`✅ FFR Dataset chargé : ${ffrCount} phrases parallèles.`);
  } catch (e) {
    console.log("❌ Erreur chargement FFR :", e.message);
  }

  console.log(`\n📚 Total des phrases à analyser : ${parallelSentences.length}`);

  // ==========================================
  // 3. STATISTIQUES & ALIGNEMENT (Coefficient de Dice)
  // ==========================================
  const countFrench = {};
  const countFon = {};
  const countCooc = {};

  console.log("⏳ Calcul des fréquences et co-occurrences...");
  
  for (const pair of parallelSentences) {
    const frTokens = [...new Set(tokenize(pair.fr, FRENCH_STOP_WORDS))];
    const fonTokens = [...new Set(tokenize(pair.fon, FON_STOP_WORDS))];

    frTokens.forEach(fr => { countFrench[fr] = (countFrench[fr] || 0) + 1; });
    fonTokens.forEach(fo => { countFon[fo] = (countFon[fo] || 0) + 1; });
    
    frTokens.forEach(fr => {
      fonTokens.forEach(fo => {
        const pairKey = `${fr}__${fo}`;
        countCooc[pairKey] = (countCooc[pairKey] || 0) + 1;
      });
    });
  }

  // ==========================================
  // 4. EXTRACTION DES MOTS (Qualité Absolue)
  // ==========================================
  console.log("⏳ Évaluation des scores de confiance...");
  const alignments = [];

  Object.entries(countCooc).forEach(([pairKey, cooc]) => {
    if (cooc < MIN_OCCURRENCES) return;

    const [fr, fo] = pairKey.split('__');
    const freqFr = countFrench[fr];
    const freqFo = countFon[fo];

    const dice = (2 * cooc) / (freqFr + freqFo);

    if (dice >= MIN_DICE_SCORE) {
      alignments.push({ french: fr, fon: fo, cooc, freqFr, freqFo, score: parseFloat(dice.toFixed(3)) });
    }
  });

  alignments.sort((a, b) => b.score - a.score);

  // Résolution 1-à-1 (uniquement le meilleur mot Fon pour chaque mot Français)
  const bestAlignments = {};
  alignments.forEach(align => {
    if (!bestAlignments[align.french] || bestAlignments[align.french].score < align.score) {
      bestAlignments[align.french] = align;
    }
  });

  const extractedVocab = Object.values(bestAlignments);
  extractedVocab.sort((a, b) => b.cooc - a.cooc); // Trier par fréquence d'apparition

  console.log(`\n🎉 Extraction terminée !`);
  console.log(`🔍 Mots de 'Qualité Absolue' (1-à-1) trouvés : ${extractedVocab.length}`);

  // Sauvegarde dans un fichier temporaire
  fs.writeFileSync('scratch/extracted_vocab.json', JSON.stringify(extractedVocab, null, 2));
  console.log("💾 Résultat sauvegardé dans scratch/extracted_vocab.json");
}

extract().catch(console.error);
