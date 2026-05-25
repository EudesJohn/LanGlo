// app/src/components/WordCard.js
import LucideIcon from './LucideIcon.js'

export default {
  props: ['word', 'query', 'favorites', 'isAdmin'],
  emits: ['navigate', 'updateWord', 'deleteWord'],
  components: { LucideIcon },
  data() {
    return {
      isEditing: false,
      isSaving: false,
      editForm: {
        french: '',
        fon: '',
        phonetic: '',
        category: '',
        example: ''
      }
    }
  },
  template: `
    <div class="word-card-luxury glass-effect glow-on-hover scale-in" :class="{'editing-glow': isEditing}">
      <!-- HEADER: CATEGORY & STATUS -->
      <div class="card-luxury-header-detail">
        <div class="badge-luxury premium-gradient">{{ word.category === 'Bible' ? 'Référence' : (word.category || 'Général') }}</div>
        <div class="word-id-label" style="display: flex; align-items: center; gap: 8px;">
          <span>Réf #{{ word.id }}</span>
          <span v-if="word.status === 'pending'" class="status-badge pending" style="font-size: 0.7rem; background: rgba(245, 158, 11, 0.2); border: 1px solid rgba(245, 158, 11, 0.4); color: #f59e0b; padding: 2px 6px; border-radius: 4px; font-weight: 600;">en attente</span>
          <div v-if="isAdmin && !isEditing" class="admin-actions-mini" style="display: flex; gap: 6px; margin-left: 10px;">
            <button @click="startEdit" class="btn-action-mini edit" title="Modifier" style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 4px 6px; color: var(--primary); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <lucide-icon name="edit-3" :size="12" />
            </button>
            <button @click="deleteWord" class="btn-action-mini delete" title="Supprimer" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 6px; padding: 4px 6px; color: #ef4444; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
              <lucide-icon name="trash-2" :size="12" />
            </button>
          </div>
        </div>
      </div>

      <!-- MAIN CONTENT (EDIT MODE) -->
      <div v-if="isEditing" class="card-luxury-body" style="padding-top: 10px;">
        <div style="display: flex; flex-direction: column; gap: 15px;">
          
          <div class="f-group">
            <label style="display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; letter-spacing: 0.5px;">Mot / Phrase en Fon</label>
            <textarea v-if="word.category === 'Phrase' || word.category === 'Bible' || editForm.fon.length > 40" v-model="editForm.fon" class="mod-textarea font-fon" style="min-height: 80px;"></textarea>
            <input v-else v-model="editForm.fon" class="mod-input font-fon" />
          </div>

          <div class="f-group">
            <label style="display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; letter-spacing: 0.5px;">Traduction Française</label>
            <textarea v-if="word.category === 'Phrase' || word.category === 'Bible' || editForm.french.length > 40" v-model="editForm.french" class="mod-textarea"></textarea>
            <input v-else v-model="editForm.french" class="mod-input" />
          </div>

          <div class="field-pair">
            <div class="f-group">
              <label style="display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; letter-spacing: 0.5px;">Phonétique</label>
              <input v-model="editForm.phonetic" class="mod-input" />
            </div>
            <div class="f-group">
              <label style="display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; letter-spacing: 0.5px;">Catégorie</label>
              <select v-model="editForm.category" class="mod-input" style="height: 51px; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E'); background-repeat: no-repeat; background-position: right 18px top 50%; background-size: 12px auto; padding-right: 38px; cursor: pointer;">
                <option value="Mot" style="background:#14182d; color:#fff;">Mot</option>
                <option value="Phrase" style="background:#14182d; color:#fff;">Phrase</option>
                <option value="Bible" style="background:#14182d; color:#fff;">Bible</option>
                <option value="Nom" style="background:#14182d; color:#fff;">Nom</option>
                <option value="Verbe" style="background:#14182d; color:#fff;">Verbe</option>
                <option value="Adjectif" style="background:#14182d; color:#fff;">Adjectif</option>
                <option value="Adverbe" style="background:#14182d; color:#fff;">Adverbe</option>
                <option value="Pronom" style="background:#14182d; color:#fff;">Pronom</option>
                <option value="Conjonction" style="background:#14182d; color:#fff;">Conjonction</option>
                <option value="Interjection" style="background:#14182d; color:#fff;">Interjection</option>
                <option value="Général" style="background:#14182d; color:#fff;">Général</option>
              </select>
            </div>
          </div>

          <div class="f-group" v-if="word.category === 'Phrase' || word.category === 'Bible' || editForm.example">
            <label style="display: block; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; opacity: 0.6; margin-bottom: 6px; letter-spacing: 0.5px;">Exemple / Contexte d'usage</label>
            <textarea v-model="editForm.example" class="mod-textarea" style="min-height: 80px;"></textarea>
          </div>

          <div style="display: flex; gap: 12px; margin-top: 15px;">
            <button @click="saveEdit" class="btn-action-v3 approve" style="padding: 10px 20px; font-size: 0.9rem; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;" :disabled="isSaving">
              <lucide-icon name="check-circle" :size="16" />
              <span>{{ isSaving ? 'Enregistrement...' : 'Enregistrer' }}</span>
            </button>
            <button @click="cancelEdit" class="btn-action-v3 delete" style="padding: 10px 20px; font-size: 0.9rem; flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;">
              <lucide-icon name="x" :size="16" />
              <span>Annuler</span>
            </button>
          </div>

        </div>
      </div>

      <!-- MAIN CONTENT (DISPLAY MODE) -->
      <div v-else class="card-luxury-body">
        
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
    startEdit() {
      this.editForm = {
        french: this.word.french || '',
        fon: this.word.fon || '',
        phonetic: this.word.phonetic || '',
        category: this.word.category || 'Mot',
        example: this.word.example || ''
      };
      this.isEditing = true;
    },
    cancelEdit() {
      this.isEditing = false;
    },
    saveEdit() {
      this.isSaving = true;
      this.$emit('updateWord', {
        ...this.word,
        french: this.editForm.french,
        fon: this.editForm.fon,
        phonetic: this.editForm.phonetic,
        category: this.editForm.category,
        example: this.editForm.example,
        onComplete: (success = true) => {
          this.isSaving = false;
          if (success) {
            this.isEditing = false;
          }
        }
      });
    },
    deleteWord() {
      this.$emit('deleteWord', this.word.id);
    },
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
