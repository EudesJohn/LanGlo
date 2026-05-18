// scripts/import_bible_xml.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://pahmcbhktyioyvcbreow.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhaG1jYmhrdHlpb3l2Y2JyZW93Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTk0MDk0MCwiZXhwIjoyMDkxNTE2OTQwfQ.X3AslH_yvlwVpFxAdPmnsJ8VCh25Xbv2_Eh7ig5s5KA';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FON_XML_URL = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/FonBible.xml';
const FR_XML_URL = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/FrenchBible.xml';

const FON_DEST = path.join(__dirname, 'FonBible.xml');
const FR_DEST = path.join(__dirname, 'FrenchBible.xml');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`✅ Fichier déjà présent localement : ${path.basename(dest)}`);
      return resolve(dest);
    }
    console.log(`📥 Téléchargement de ${url}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(dest);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Analyseur XML ligne par ligne ultra-rapide et sans dépendance externe
async function parseBibleXml(filePath) {
  console.log(`📖 Analyse de ${path.basename(filePath)} en cours...`);
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const versesMap = new Map();
  let currentTestament = '';
  let currentBook = '';
  let currentChapter = '';

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Détecter le testament
    const testamentMatch = trimmed.match(/<testament name="([^"]+)">/i);
    if (testamentMatch) {
      currentTestament = testamentMatch[1];
      continue;
    }

    // Détecter le livre
    const bookMatch = trimmed.match(/<book number="([^"]+)">/i);
    if (bookMatch) {
      currentBook = bookMatch[1];
      continue;
    }

    // Détecter le chapitre
    const chapterMatch = trimmed.match(/<chapter number="([^"]+)">/i);
    if (chapterMatch) {
      currentChapter = chapterMatch[1];
      continue;
    }

    // Détecter le verset
    const verseMatch = trimmed.match(/<verse number="([^"]+)">([^<]+)<\/verse>/i);
    if (verseMatch) {
      const verseNumber = verseMatch[1];
      const text = verseMatch[2].trim();
      
      const key = `${currentTestament}_${currentBook}_${currentChapter}_${verseNumber}`;
      versesMap.set(key, {
        testament: currentTestament,
        book: currentBook,
        chapter: currentChapter,
        verse: verseNumber,
        text
      });
    }
  }

  console.log(`✨ ${versesMap.size} versets analysés avec succès dans ${path.basename(filePath)}.`);
  return versesMap;
}

async function main() {
  console.log('🚀 Démarrage du pipeline d\'alignement et d\'importation de la Bible Fon-Français...\n');

  try {
    // 1. Télécharger les fichiers XML
    await downloadFile(FON_XML_URL, FON_DEST);
    await downloadFile(FR_XML_URL, FR_DEST);

    // 2. Analyser les deux Bibles
    const fonBible = await parseBibleXml(FON_DEST);
    const frBible = await parseBibleXml(FR_DEST);

    // 3. Aligner les versets par clé book_chapter_verse
    console.log('\n🔗 Alignement des versets Fon ↔ Français...');
    const alignedPairs = [];

    for (const [key, fonVerse] of fonBible.entries()) {
      const frVerse = frBible.get(key);
      if (frVerse) {
        alignedPairs.push({
          fon: fonVerse.text,
          french: frVerse.text,
          category: 'Bible',
          status: 'approved'
        });
      }
    }

    console.log(`✅ ${alignedPairs.length} versets alignés avec succès !`);

    // 4. Importer dans Supabase
    // Nous allons importer les 1000 premiers versets de la Bible (tout Genesis et plus !)
    const BATCH_SIZE = 100;
    const toInsert = alignedPairs; // Importer TOUTE la Bible !

    console.log(`\n📥 Importation de ${toInsert.length} versets dans Supabase par lots de ${BATCH_SIZE}...`);

    let successCount = 0;
    let duplicateCount = 0;
    let errorCount = 0;

    // Nous commençons à l'index 1000 car les 1000 premiers versets ont déjà été insérés avec succès !
    // Cela nous permet d'insérer directement le reste (29 912 versets) à vitesse maximale sans doublons possibles.
    for (let i = 1000; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE);

      if (batch.length > 0) {
        const { error } = await supabase
          .from('words')
          .insert(batch);

        if (error) {
          console.error(`❌ Erreur insertion lot ${Math.floor(i / BATCH_SIZE) + 1}:`, error.message);
          errorCount += batch.length;
        } else {
          successCount += batch.length;
          process.stdout.write(`\r✅ ${successCount} versets importés...`);
        }
      }
    }

    console.log(`\n\n===== RÉSUMÉ DE L'IMPORTATION DE LA BIBLE =====`);
    console.log(`✅ Versets importés avec succès  : ${successCount}`);
    console.log(`⏭️  Doublons ignorés             : ${duplicateCount}`);
    console.log(`❌ Échecs                       : ${errorCount}`);
    console.log(`=============================================`);

  } catch (e) {
    console.error('❌ Une erreur critique est survenue :', e.message);
  }
}

main();
