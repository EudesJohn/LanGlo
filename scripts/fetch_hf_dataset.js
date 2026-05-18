// scripts/fetch_hf_dataset.js
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
  try {
    const info = await fetchJson('https://huggingface.co/api/datasets/Shads229/french-fongbe-corpus');
    console.log(JSON.stringify(info, null, 2));
  } catch (e) {
    console.error('❌ Erreur:', e.message);
  }
}

main();
