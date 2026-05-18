// scripts/search_beblia_files.js
const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍 Recherche des fichiers dans le repository Beblia/Holy-Bible-XML-Format sur GitHub...\n');
  try {
    // API GitHub pour lister les fichiers de la branche master
    const files = await fetchJson('https://api.github.com/repos/Beblia/Holy-Bible-XML-Format/contents/');
    
    if (Array.isArray(files)) {
      console.log('Fichiers trouvés contenant "fon" ou "french" ou "français" :');
      const matches = files.filter(f => 
        f.name.toLowerCase().includes('fon') || 
        f.name.toLowerCase().includes('fren') ||
        f.name.toLowerCase().includes('fr')
      );
      
      matches.forEach(f => {
        console.log(`- ${f.name} (taille: ${f.size} octets, URL: ${f.download_url})`);
      });
      
      console.log('\nExemples d\'autres Bibles dans le repo :');
      files.slice(0, 10).forEach(f => {
        console.log(`- ${f.name}`);
      });
    } else {
      console.log('Structure inattendue de l\'API GitHub:', files);
    }
  } catch (e) {
    console.error('❌ Erreur :', e.message);
  }
}

main();
