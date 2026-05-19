// app/src/views/Studio.js
import AudioRecorder from '../components/AudioRecorder.js';
import LucideIcon from '../components/LucideIcon.js';

export default {
  components: { AudioRecorder, LucideIcon },
  emits: ['navigate'],
  data() {
    return {
      words: [],
      currentIndex: 0,
      totalRemaining: 0,
      phonetic: '',
      audioBlob: null,
      submitting: false,
      loading: true,
      errorMsg: null
    };
  },
  computed: {
    currentWord() {
      return this.words[this.currentIndex] || null;
    }
  },
  methods: {
    async fetchWords() {
      this.loading = true;
      this.errorMsg = null;
      try {
        const API = '/api';
        const res = await axios.get(`${API}/dictionary/studio-list`);
        this.words = res.data.words || [];
        this.totalRemaining = res.data.totalRemaining || 0;
        this.currentIndex = 0;
        this.resetFields();
      } catch (err) {
        console.error("Studio loading error:", err);
        this.errorMsg = "Impossible de charger les mots du studio.";
      } finally {
        this.loading = false;
      }
    },
    resetFields() {
      this.phonetic = this.currentWord?.phonetic || '';
      this.audioBlob = null;
      if (this.$refs.recorder) {
        this.$refs.recorder.resetAudio();
      }
    },
    handleAudioRecorded(blob) {
      this.audioBlob = blob;
    },
    speakHint() {
      if (!this.currentWord) return;
      if (!('speechSynthesis' in window)) return;
      
      window.speechSynthesis.cancel();
      // approximate Fon sounds in French TTS for a guide
      let text = this.currentWord.fon
        .replace(/ɖ/g, 'd')
        .replace(/ɔ/g, 'o')
        .replace(/ɛ/g, 'e');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    },
    async submitAndNext() {
      if (this.submitting || !this.currentWord) return;
      this.submitting = true;

      const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
          if (!blob) return resolve(null);
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result.split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      };

      try {
        const audio_base64 = await blobToBase64(this.audioBlob);
        const API = '/api';

        const payload = {
          id: this.currentWord.id,
          phonetic: this.phonetic,
          audio_base64
        };

        const res = await axios.post(`${API}/dictionary/studio-update`, payload);

        if (res.data.success) {
          // Si succès, retirer le mot courant de notre liste locale
          this.words.splice(this.currentIndex, 1);
          this.totalRemaining--;
          
          if (this.words.length === 0 && this.totalRemaining > 0) {
            // Re-fetch si liste locale épuisée mais il en reste en base
            await this.fetchWords();
          } else {
            // Sinon ajuster l'index
            if (this.currentIndex >= this.words.length) {
              this.currentIndex = 0;
            }
            this.resetFields();
          }
        } else {
          alert(res.data.message || "Erreur de mise à jour");
        }
      } catch (err) {
        console.error("Studio update error:", err);
        alert("Erreur lors de la sauvegarde du mot.");
      } finally {
        this.submitting = false;
      }
    },
    skipWord() {
      if (this.words.length <= 1) return;
      this.currentIndex = (this.currentIndex + 1) % this.words.length;
      this.resetFields();
    },
    async deleteWord() {
      if (!this.currentWord) return;
      if (!confirm(`Supprimer définitivement le mot "${this.currentWord.fon}" ?`)) return;
      
      this.submitting = true;
      try {
        const API = '/api';
        const res = await axios.post(`${API}/admin/delete`, { id: this.currentWord.id });
        if (res.data.success) {
          this.words.splice(this.currentIndex, 1);
          this.totalRemaining--;
          
          if (this.words.length === 0 && this.totalRemaining > 0) {
            await this.fetchWords();
          } else {
            if (this.currentIndex >= this.words.length) {
              this.currentIndex = 0;
            }
            this.resetFields();
          }
        } else {
          alert(res.data.message || "Erreur de suppression");
        }
      } catch (err) {
        console.error("Studio delete error:", err);
        alert("Erreur lors de la suppression du mot.");
      } finally {
        this.submitting = false;
      }
    }
  },
  mounted() {
    this.fetchWords();
  },
  template: `
    <div class="view-studio">
      <div class="container">
        <!-- HEADER -->
        <div class="section-header">
          <button @click="$emit('navigate', 'home')" class="back-btn">
            <lucide-icon name="arrow-left" /> Accueil
          </button>
          <h2 style="font-size: 2.2rem; display: flex; align-items: center; gap: 15px;">
            🎙️ Studio d'Enregistrement Gbé Tché
            <span class="badge-studio" v-if="!loading">{{ totalRemaining }} mots restants</span>
          </h2>
        </div>

        <!-- LOADING OR ERROR -->
        <div v-if="loading" class="studio-card glass-card text-center" style="padding: 80px 40px;">
          <div class="spinner"></div>
          <p style="margin-top: 20px; opacity: 0.7;">Chargement des mots à enregistrer...</p>
        </div>

        <div v-else-if="errorMsg" class="studio-card glass-card text-center" style="padding: 80px 40px; border-color: rgba(239, 68, 68, 0.3);">
          <lucide-icon name="alert-triangle" style="color: #ef4444; font-size: 3rem;" />
          <p style="margin-top: 20px; color: #ef4444; font-weight: 600;">{{ errorMsg }}</p>
          <button @click="fetchWords" class="btn-premium mini" style="margin-top: 20px;">Réessayer</button>
        </div>

        <!-- NO WORDS LEFT -->
        <div v-else-if="words.length === 0" class="studio-card glass-card text-center" style="padding: 100px 40px; background: linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(255,255,255,0.02) 100%);">
          <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
          <h3 style="font-size: 2rem; font-weight: 800; color: white;">Félicitations !</h3>
          <p style="margin-top: 10px; opacity: 0.7; max-width: 500px; margin-left: auto; margin-right: auto;">
            Tous les mots du dictionnaire possèdent actuellement un enregistrement audio de voix humaine ! Le studio est à jour.
          </p>
          <button @click="$emit('navigate', 'home')" class="btn-premium" style="margin-top: 30px;">
            Retourner à l'accueil
          </button>
        </div>

        <!-- STUDIO WORKING PANEL -->
        <div v-else class="studio-card glass-card scale-in">
          
          <!-- WORD PANEL -->
          <div class="word-display-box">
            <div class="fon-label font-fon">{{ currentWord.fon }}</div>
            <div class="fr-label">signifie : <strong>{{ currentWord.french }}</strong></div>
            
            <button @click="speakHint" class="btn-hint" title="Écouter l'aide prononciation">
              <lucide-icon name="volume-2" /> Indice audio (TTS)
            </button>
          </div>

          <!-- INPUT & RECORDING PANEL -->
          <div class="studio-controls-grid">
            
            <!-- LEFT: PHONETIC -->
            <div class="control-box">
              <label class="control-title">1. Écriture Phonétique (Facultatif)</label>
              <p class="control-desc">Indiquez la phonétique pour aider les apprenants (ex: [xwé]).</p>
              <input v-model="phonetic" class="input-field" placeholder="Ex: [tɔ́ cé]" style="background: rgba(0,0,0,0.25);" />
            </div>

            <!-- RIGHT: AUDIO RECORDER -->
            <div class="control-box">
              <label class="control-title">2. Voix Humaine (Obligatoire)</label>
              <p class="control-desc">Parlez distinctement à voix haute près de votre micro.</p>
              
              <audio-recorder ref="recorder" @recorded="handleAudioRecorded" />
            </div>

          </div>

          <!-- ACTIONS FOOTER -->
          <div class="studio-footer-actions">
            <button @click="deleteWord" class="btn-delete" :disabled="submitting" style="margin-right: auto;">
              <lucide-icon name="trash-2" /> Supprimer ce mot
            </button>

            <button @click="skipWord" class="btn-skip" :disabled="words.length <= 1">
              Passer ce mot <lucide-icon name="chevrons-right" />
            </button>

            <button 
              @click="submitAndNext" 
              class="btn-save-next" 
              :disabled="submitting || !audioBlob"
              :class="{ 'opacity-50': submitting || !audioBlob }"
            >
              <span v-if="submitting">
                Enregistrement... <div class="spinner mini"></div>
              </span>
              <span v-else style="display: flex; align-items: center; gap: 8px;">
                <lucide-icon name="check" /> Sauvegarder & Suivant
              </span>
            </button>
          </div>

        </div>

      </div>
    </div>
  `
};
