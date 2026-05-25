// api/lib/activity.js
// Enregistre les actions des administrateurs dans la table admin_activity
const supabase = require('./supabase');

/**
 * Enregistre une action admin dans admin_activity.
 * @param {object} adminUser - L'admin authentifié (retourné par verifyAdmin)
 * @param {string} actionType - 'approved' | 'modified' | 'deleted' | 'audio_added'
 * @param {number|null} wordId - ID du mot concerné
 * @param {string|null} wordFrench - Le mot en français
 * @param {string|null} wordFon - La traduction Fon
 */
async function logActivity(adminUser, actionType, wordId, wordFrench, wordFon) {
  if (!adminUser || !adminUser.id) return;
  try {
    await supabase.from('admin_activity').insert({
      admin_id: adminUser.id,
      admin_email: adminUser.email || '',
      action_type: actionType,
      word_id: wordId || null,
      word_french: (wordFrench || '').substring(0, 200),
      word_fon: (wordFon || '').substring(0, 200),
    });
  } catch (err) {
    // Non-fatal : les erreurs de log ne doivent pas bloquer l'opération principale
    console.error('Activity log error:', err.message);
  }
}

module.exports = { logActivity };
