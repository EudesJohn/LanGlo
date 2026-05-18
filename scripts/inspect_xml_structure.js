// scripts/inspect_xml_structure.js
const https = require('https');

function fetchChunk(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => {
        data += chunk;
        // Arrêter après avoir reçu 2000 caractères
        if (data.length > 2000) {
          res.destroy();
          resolve(data);
        }
      });
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const url = 'https://raw.githubusercontent.com/Beblia/Holy-Bible-XML-Format/master/FonBible.xml';
  console.log(`🔍 Téléchargement et inspection du début de ${url}...\n`);
  try {
    const chunk = await fetchChunk(url);
    console.log(chunk);
  } catch (e) {
    console.error('❌ Erreur :', e.message);
  }
}

main();
