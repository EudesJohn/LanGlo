// scripts/check_ebible_fon.js - Trouve l'URL exacte du fichier Fon sur eBible.org
const https = require('https');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  const page = await fetchText('https://ebible.org/find/show.php?id=fon');
  console.log('Page eBible Fon:\n', page);
}

main();
