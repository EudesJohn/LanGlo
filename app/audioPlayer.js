/**
 * FonAudioPlayer — Lecteur audio côté navigateur pour les phrases Fon
 * Joue les mots un par un avec une pause entre chaque.
 *
 * Utilisation :
 *   const player = new FonAudioPlayer();
 *   player.playPhrase(audioPlaylist, {
 *     onWord: (item, index) => console.log('En train de lire:', item.fon),
 *     onFinish: () => console.log('Lecture terminée')
 *   });
 */
class FonAudioPlayer {
  constructor() {
    this.isPlaying = false;
    this.currentAudio = null;
  }

  async playPhrase(playlist, callbacks = {}) {
    if (this.isPlaying) this.stop();
    this.isPlaying = true;
    for (let i = 0; i < playlist.length; i++) {
      if (!this.isPlaying) break;
      const item = playlist[i];
      if (callbacks.onWord) callbacks.onWord(item, i);
      try {
        await this._playAudio(item.audio_url);
        await this._pause(item.pause_after_ms || 150);
      } catch (err) {
        console.warn(`Audio manquant pour "${item.french}"`, err);
      }
    }
    this.isPlaying = false;
    if (callbacks.onFinish) callbacks.onFinish();
  }

  _playAudio(url) {
    return new Promise((resolve, reject) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.onended = resolve;
      audio.onerror = reject;
      audio.playbackRate = 0.92;
      audio.play().catch(reject);
    });
  }

  _pause(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stop() {
    this.isPlaying = false;
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }
}
