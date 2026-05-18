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
        <div class="badge-luxury premium-gradient">{{ word.category || 'Général' }}</div>
        <div class="word-id-label">Réf #{{ word.id }}</div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="card-luxury-body">
        
        <!-- SECTION FON -->
        <div class="detail-section">
          <span class="detail-label">{{ word.category === 'Bible' ? 'Verset en Fon' : (word.category === 'Phrase' ? 'Phrase en Fon' : 'Mot en Fon') }}</span>
          <h2 class="fon-heading font-fon" v-html="highlight(word.fon)"></h2>
          <div class="phonetic-detail" v-if="word.phonetic">
            <lucide-icon name="music-2" :size="14" />
            <span>Prononciation : <strong>[{{ word.phonetic }}]</strong></span>
          </div>
        </div>

        <!-- SECTION FRANCAIS -->
        <div class="detail-section mt-20">
          <span class="detail-label">{{ word.category === 'Bible' ? 'Traduction (Français)' : 'Traduction Française' }}</span>
          <div class="translation-box-v2">
            <p class="value" v-html="highlight(word.french)"></p>
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
          
          <div v-if="!word.audio_url && !word.example_audio_url" class="no-audio-premium">
            <lucide-icon name="volume-x" />
            <span>Aucun enregistrement disponible pour ce mot</span>
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
    }
  }
}
