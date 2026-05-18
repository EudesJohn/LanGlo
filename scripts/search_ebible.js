// scripts/search_ebible.js — Cherche toutes les traductions Fon sur eBible
const https = require('https');

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return fetchText(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍 Recherche de traductions Fon sur eBible.org...\n');
  
  // Chercher dans l'index général
  const index = await fetchText('https://ebible.org/find/index.php');
  
  // Extraire toutes les lignes qui mentionnent Fon
  const lines = index.split('\n');
  const fonLines = lines.filter(l => 
    l.toLowerCase().includes('fon') || 
    l.toLowerCase().includes('fongbe') ||
    l.toLowerCase().includes('benin')
  );
  
  console.log('Résultats trouvés:');
  fonLines.forEach(l => console.log(l.trim()));
  
  // Chercher aussi les liens de téléchargement dans la page
  const zipMatches = index.match(/href="[^"]*fon[^"]*\.zip"/gi) || [];
  const txtMatches = index.match(/href="[^"]*fon[^"]*\.txt"/gi) || [];
  
  console.log('\n📦 Liens ZIP trouvés:');
  zipMatches.forEach(l => console.log(l));
  
  console.log('\n📄 Liens TXT trouvés:');
  txtMatches.forEach(l => console.log(l));
  
  // Essayer l'API de recherche
  console.log('\n🔍 Tentative via API recherche...');
  try {
    const search = await fetchText('https://ebible.org/find/search.php?q=fon&lang=fon');
    const searchFon = search.split('\n').filter(l => l.toLowerCase().includes('fon'));
    searchFon.slice(0, 20).forEach(l => console.log(l.trim()));
  } catch(e) {
    console.log('API search non disponible:', e.message);
  }
}

main().catch(console.error);
