// api/correct.js
// Route Vercel Serverless pour mémoriser les corrections linguistiques des utilisateurs

const { learnFromCorrection } = require('../lib/fonBrain');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { french, wrongFon, correctFon } = req.body || {};
  if (!french || !correctFon) {
    return res.status(400).json({ error: 'Données manquantes. "french" et "correctFon" sont requis.' });
  }

  try {
    await learnFromCorrection(french, wrongFon, correctFon);
    return res.status(200).json({ success: true, message: 'Correction mémorisée. Merci !' });
  } catch (err) {
    console.error('Correction Error:', err);
    return res.status(500).json({ error: err.message || 'Erreur interne lors de la sauvegarde.' });
  }
};
