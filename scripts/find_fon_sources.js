// scripts/find_fon_sources.js
// Trouve les sources disponibles pour la Bible Fon en ligne
const https = require('https');

function tryUrl(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let size = 0;
      res.on('data', chunk => size += chunk.length);
      res.on('end', () => resolve({ url, status: res.statusCode, size }));
    }).on('error', (e) => resolve({ url, status: 0, error: e.message }));
  });
}

async function main() {
  const urls = [
    'https://ebible.org/Scriptures/fon_usfm.zip',
    'https://ebible.org/Scriptures/fonnt_usfm.zip',
    'https://ebible.org/Scriptures/fonNT_usfm.zip',
    'https://ebible.org/Scriptures/FONNT_usfm.zip',
    'https://ebible.org/Scriptures/fon-fonBL_usfm.zip',
    'https://ebible.org/find/show.php?id=fon',
    'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/json/fon/Genesis.json',
    'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/fon.json',
    'https://api.tatoeba.org/unstable/sentences?lang=fon&trans_filter=limit&trans_to=fra&limit=100',
  ];

  console.log('🔍 Recherche de sources disponibles...\n');
  
  for (const url of urls) {
    const r = await tryUrl(url);
    const icon = r.status === 200 ? '✅' : '❌';
    console.log(`${icon} [${r.status}] ${r.url} ${r.size ? `(${r.size} bytes)` : ''} ${r.error || ''}`);
  }
}

main();
