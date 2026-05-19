// app/src/components/WordCard.js
import LucideIcon from './LucideIcon.js'

export default {
  props: ['word', 'query', 'favorites'],
  emits: ['navigate'],
  components: { LucideIcon },
  template: `
    <div class="word-card-luxury glass-effect glow-on-hover scale-in">
      <!-- HEADER: CATEGORY & STATUS -->
      <div class="card-luxury-header-detail">
        <div class="badge-luxury premium-gradient">{{ word.category === 'Bible' ? 'Référence' : (word.category || 'Général') }}</div>
        <div class="word-id-label">Réf #{{ word.id }}</div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="card-luxury-body">
        
        <!-- SECTION FON -->
        <div class="detail-section">
          <span class="detail-label">{{ word.category === 'Phrase' ? 'Phrase en Fon' : (word.category === 'Bible' ? 'Expression en Fon' : 'Mot en Fon') }}</span>
          <h2 class="fon-heading font-fon" v-html="word.fon_highlighted ? word.fon_highlighted : highlight(word.fon)"></h2>
          <div class="phonetic-detail" v-if="word.phonetic">
            <lucide-icon name="music-2" :size="14" />
            <span>Prononciation : <strong>[{{ word.phonetic }}]</strong></span>
          </div>
        </div>

        <!-- SECTION FRANCAIS -->
        <div class="detail-section mt-20">
          <span class="detail-label">Traduction Française</span>
          <div class="translation-box-v2">
            <p class="value" v-html="word.french_highlighted ? word.french_highlighted : highlight(word.french)"></p>
          </div>
        </div>

        <!-- SECTION EXEMPLE -->
        <div class="detail-section mt-20" v-if="word.example">
          <span class="detail-label">Exemple / Contexte d'usage</span>
          <div class="luxury-context-v2">
            <p>" {{ word.example }} "</p>
          </div>
        </div>

        <!-- SECTION AUDIO AVEC TITRES CLAIRS -->
        <div class="detail-section mt-25" v-if="word.audio_url || word.example_audio_url || (word.category !== 'Bible' && word.category !== 'Phrase')">
          <span class="detail-label">Audio & Prononciation</span>
          <div class="luxury-audio-grid">
            
            <div v-if="word.audio_url" class="audio-control-card">
              <span class="audio-title">Prononciation du mot</span>
              <button @click="$refs.audioWord.play()" class="btn-audio-action">
                <lucide-icon name="play-circle" /> Écouter le mot
              </button>
              <audio ref="audioWord" :src="word.audio_url" preload="none"></audio>
            </div>

            <div v-if="word.example_audio_url" class="audio-control-card">
              <span class="audio-title">Exemple lu à haute voix</span>
              <button @click="$refs.audioExample.play()" class="btn-audio-action secondary">
                <lucide-icon name="mic" /> Écouter la phrase
              </button>
              <audio ref="audioExample" :src="word.example_audio_url" preload="none"></audio>
            </div>

          </div>
          
          <div v-if="!word.audio_url && !word.example_audio_url" class="luxury-audio-grid">
            <div class="audio-control-card tts-card">
              <span class="audio-title" style="color: var(--primary); display: flex; align-items: center; gap: 5px;">
                <lucide-icon name="sparkles" :size="12" /> Synthèse Vocale (Fon)
              </span>
              <button @click="speakText(word.fon, 'fon')" class="btn-audio-action tts-btn">
                <lucide-icon name="volume-2" /> Prononcer Fon
              </button>
            </div>

            <div class="audio-control-card tts-card">
              <span class="audio-title" style="opacity: 0.8; display: flex; align-items: center; gap: 5px;">
                <lucide-icon name="sparkles" :size="12" /> Synthèse Vocale (Français)
              </span>
              <button @click="speakText(word.french, 'fr')" class="btn-audio-action secondary tts-btn">
                <lucide-icon name="volume-2" /> Prononcer Français
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  `,
  methods: {
    highlight(text) {
      if (!this.query || !text) return text;
      // Échapper les caractères spéciaux du regex
      const escaped = this.query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(`(${escaped})`, 'gi');
      return text.replace(regex, '<mark class="highlight-premium">$1</mark>');
    },
    speakText(text, lang) {
      if (!('speechSynthesis' in window)) {
        alert("La synthèse vocale n'est pas supportée par votre navigateur.");
        return;
      }
      
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      // Clean up text and standardise Fon accents to approximate pronunciations
      let cleanText = text;
      if (lang === 'fon') {
        cleanText = cleanText
          .replace(/ɖ/g, 'd')
          .replace(/ɔ/g, 'o')
          .replace(/ɛ/g, 'e')
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?\"']/g, ' ');
      }
      
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      if (lang === 'fr') {
        utterance.lang = 'fr-FR';
      } else {
        // Fon shares basic phonetic rules with French (like "ou", "on", "an")
        utterance.lang = 'fr-FR';
        utterance.rate = 0.82; // read slightly slower to capture tones
        utterance.pitch = 1.05; // slightly higher pitch
      }
      
      window.speechSynthesis.speak(utterance);
    }
  }
}
