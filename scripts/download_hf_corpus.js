// scripts/download_hf_corpus.js
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const URL = 'https://huggingface.co/datasets/Shads229/french-fongbe-corpus/resolve/main/dataset_fr_fon.jsonl';
const DEST = path.join(__dirname, 'dataset_fr_fon.jsonl');

function downloadFile(targetUrl, dest) {
  return new Promise((resolve, reject) => {
    console.log(`📥 Téléchargement de ${targetUrl}...`);
    const file = fs.createWriteStream(dest);
    https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      // Gérer tous les codes de redirection HTTP
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        file.close();
        let redirectUrl = res.headers.location;
        // Si l'URL de redirection est relative, la résoudre avec l'URL parente
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = url.resolve(targetUrl, redirectUrl);
        }
        return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        return reject(new Error(`HTTP ${res.statusCode} pour ${targetUrl}`));
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

async function main() {
  try {
    await downloadFile(URL, DEST);
    console.log('✅ Téléchargement réussi !');
    
    // Inspecter les 5 premières lignes
    console.log('\n🔍 Inspection des premières lignes :');
    const content = fs.readFileSync(DEST, 'utf8');
    const lines = content.split('\n').filter(l => l.trim()).slice(0, 5);
    lines.forEach((line, i) => {
      console.log(`Ligne ${i + 1}:`, line.substring(0, 200) + '...');
    });
  } catch (e) {
    console.error('❌ Erreur de téléchargement :', e.message);
  }
}

main();
