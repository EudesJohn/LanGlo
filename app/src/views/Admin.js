// app/src/views/Admin.js
import AudioRecorder from '../components/AudioRecorder.js';
import LucideIcon from '../components/LucideIcon.js'

export default {
  components: { AudioRecorder, LucideIcon },
  props: ['pendingWords', 'allWords'],
  emits: ['approve', 'delete', 'updateWord', 'refresh'],
  data() {
    return {
      activeTab: 'library',      // 'library' | 'audio-studio'
      libraryFilter: 'all',      // 'all' | 'pending' | 'approved' | 'no-audio'
      adminSearch: '',
      editingId: null,
      editForm: { 
        french: '', fon: '', phonetic: '', example: '', 
        wordAudioBlob: null, phraseAudioBlob: null 
      },
      processingIds: [],

      // Audio Studio state
      studioWords: [],
      studioIndex: 0,
      studioTotal: 0,
      studioLoading: false,
      studioSubmitting: false,
      studioAudioBlob: null,
      studioPhonetic: '',
      studioError: null,
    }
  },
  watch: {
    pendingWords() { this.processingIds = []; },
    allWords()     { this.processingIds = []; },
    activeTab(tab) {
      if (tab === 'audio-studio' && this.studioWords.length === 0) {
        this.fetchStudioWords();
      }
    }
  },
  computed: {
    displayWords() {
      let source = this.allWords;

      // Apply filter
      if (this.libraryFilter === 'pending') {
        source = source.filter(w => w.status === 'pending');
      } else if (this.libraryFilter === 'approved') {
        source = source.filter(w => w.status === 'approved');
      } else if (this.libraryFilter === 'no-audio') {
        source = source.filter(w => !w.audio_url);
      }

      // Apply search
      if (!this.adminSearch) return source;
      const q = this.adminSearch.toLowerCase();
      return source.filter(w => 
        (w.french || '').toLowerCase().includes(q) || 
        (w.fon || '').toLowerCase().includes(q)
      );
    },
    pendingCount()  { return this.allWords.filter(w => w.status === 'pending').length; },
    noAudioCount()  { return this.allWords.filter(w => !w.audio_url).length; },
    studioCurrentWord() {
      return this.studioWords[this.studioIndex] || null;
    }
  },
  methods: {
    // ── Library ──────────────────────────────────────
    approveWord(id) {
      if (this.processingIds.includes(id)) return;
      this.processingIds.push(id);
      this.$emit('approve', id);
    },
    deleteWord(id) {
      if (this.processingIds.includes(id)) return;
      this.processingIds.push(id);
      this.$emit('delete', id);
    },
    startEdit(word) {
      this.editingId = word.id;
      this.editForm = { ...word, wordAudioBlob: null, phraseAudioBlob: null };
    },
    async saveEdit() {
      const blobToBase64 = (blob) => new Promise((resolve, reject) => {
        if (!blob) return resolve(null);
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      try {
        const audio_base64         = await blobToBase64(this.editForm.wordAudioBlob);
        const example_audio_base64 = await blobToBase64(this.editForm.phraseAudioBlob);
        this.$emit('updateWord', { ...this.editForm, audio_base64, example_audio_base64 });
        this.editingId = null;
      } catch (e) { console.error('Save error:', e); }
    },
    cancelEdit() { this.editingId = null; },

    // ── Audio Studio ─────────────────────────────────
    async fetchStudioWords() {
      this.studioLoading = true;
      this.studioError   = null;
      try {
        const res = await axios.get('/api/dictionary/studio-list');
        this.studioWords = res.data.words || [];
        this.studioTotal = res.data.totalRemaining || 0;
        this.studioIndex = 0;
        this.resetStudio();
      } catch (err) {
        this.studioError = 'Impossible de charger les mots du studio.';
      } finally {
        this.studioLoading = false;
      }
    },
    resetStudio() {
      this.studioPhonetic  = this.studioCurrentWord?.phonetic || '';
      this.studioAudioBlob = null;
      if (this.$refs.studioRecorder) this.$refs.studioRecorder.resetAudio();
    },
    studioSkip() {
      if (this.studioWords.length <= 1) return;
      this.studioIndex = (this.studioIndex + 1) % this.studioWords.length;
      this.resetStudio();
    },
    studioSpeakHint() {
      if (!this.studioCurrentWord || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const text = this.studioCurrentWord.fon.replace(/ɖ/g,'d').replace(/ɔ/g,'o').replace(/ɛ/g,'e');
      const utt  = new SpeechSynthesisUtterance(text);
      utt.lang = 'fr-FR'; utt.rate = 0.8;
      window.speechSynthesis.speak(utt);
    },
    async studioSubmit() {
      if (this.studioSubmitting || !this.studioCurrentWord || !this.studioAudioBlob) return;
      this.studioSubmitting = true;
      try {
        const reader = new FileReader();
        const audio_base64 = await new Promise((res, rej) => {
          reader.onloadend = () => res(reader.result.split(',')[1]);
          reader.onerror   = rej;
          reader.readAsDataURL(this.studioAudioBlob);
        });
        const result = await axios.post('/api/dictionary/studio-update', {
          id: this.studioCurrentWord.id,
          phonetic: this.studioPhonetic,
          audio_base64
        });
        if (result.data.success) {
          this.studioWords.splice(this.studioIndex, 1);
          this.studioTotal--;
          if (this.studioWords.length === 0 && this.studioTotal > 0) {
            await this.fetchStudioWords();
          } else {
            if (this.studioIndex >= this.studioWords.length) this.studioIndex = 0;
            this.resetStudio();
          }
        } else {
          alert(result.data.message || 'Erreur de mise à jour');
        }
      } catch (err) {
        console.error('Studio submit error:', err);
        alert('Erreur lors de la sauvegarde.');
      } finally {
        this.studioSubmitting = false;
      }
    }
  },
  template: `
    <div class="view-admin-v3">

      <!-- ═══════════════════════════════════════════════════════
           DASHBOARD HEADER
      ════════════════════════════════════════════════════════ -->
      <div class="admin-dashboard-header slide-down">
        <div class="header-main">
          <div class="title-group">
            <h2 class="premium-title">Tableau de Bord Admin</h2>
            <p class="subtitle">Modération du dictionnaire Gbé Tché</p>
          </div>
          <div class="header-stats">
            <div class="stat-pill">
              <span class="stat-label">En attente</span>
              <span class="stat-value">{{ pendingCount }}</span>
            </div>
            <div class="stat-pill secondary">
              <span class="stat-label">Sans audio</span>
              <span class="stat-value">{{ noAudioCount }}</span>
            </div>
            <div class="stat-pill tertiary">
              <span class="stat-label">Total</span>
              <span class="stat-value">{{ allWords.length }}</span>
            </div>
            <button @click="$emit('refresh')" class="btn-refresh-pulse" title="Actualiser">
              <lucide-icon name="refresh-cw" />
            </button>
          </div>
        </div>

        <!-- MAIN TABS -->
        <div class="admin-main-tabs">
          <button
            @click="activeTab = 'library'"
            :class="{ active: activeTab === 'library' }"
            class="main-tab-btn"
          >
            <lucide-icon name="library" />
            <span>Bibliothèque des mots</span>
            <span class="tab-count">{{ allWords.length }}</span>
          </button>
          <button
            @click="activeTab = 'audio-studio'"
            :class="{ active: activeTab === 'audio-studio' }"
            class="main-tab-btn studio-tab"
          >
            <lucide-icon name="mic" />
            <span>Studio Audio</span>
            <span class="tab-count accent">{{ noAudioCount }}</span>
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           ZONE 1 — BIBLIOTHÈQUE DES MOTS
      ════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'library'">

        <!-- Filter bar + Search -->
        <div class="library-toolbar glass-card" style="border-radius: 20px; padding: 16px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <div class="filter-chips" style="display: flex; gap: 8px; flex-wrap: wrap; flex: 1;">
            <button @click="libraryFilter = 'all'"      :class="{ 'chip-active': libraryFilter === 'all' }"      class="filter-chip">Tous</button>
            <button @click="libraryFilter = 'pending'"  :class="{ 'chip-active': libraryFilter === 'pending' }"  class="filter-chip">En attente <span class="chip-badge">{{ pendingCount }}</span></button>
            <button @click="libraryFilter = 'approved'" :class="{ 'chip-active': libraryFilter === 'approved' }" class="filter-chip">Approuvés</button>
            <button @click="libraryFilter = 'no-audio'" :class="{ 'chip-active': libraryFilter === 'no-audio' }" class="filter-chip">Sans audio <span class="chip-badge warn">{{ noAudioCount }}</span></button>
          </div>
          <div class="admin-search-wrap" style="min-width: 220px;">
            <lucide-icon name="search" className="search-icon" />
            <input v-model="adminSearch" placeholder="Rechercher..." class="admin-search-input" />
          </div>
        </div>

        <!-- Words grid -->
        <div class="moderation-grid-v3">
          <div
            v-for="w in displayWords"
            :key="w.id"
            class="mod-card-v3 glass-card"
            :class="{ 'editing-glow': editingId === w.id, 'validated': w.status === 'approved' }"
          >
            <div class="card-top-v3">
              <span class="ref-tag">
                #{{ w.id }}
                <span class="status-badge" :class="w.status">{{ w.status }}</span>
                <span v-if="!w.audio_url" class="no-audio-badge">🔇 sans audio</span>
              </span>
              <div class="quick-actions">
                <button v-if="editingId !== w.id" @click="startEdit(w)" class="btn-mini edit" title="Modifier">
                  <lucide-icon name="edit-3" />
                </button>
                <button v-else @click="cancelEdit" class="btn-mini cancel" title="Annuler">
                  <lucide-icon name="x" />
                </button>
              </div>
            </div>

            <div class="card-content-v3">
              <div class="field-pair">
                <div class="f-group">
                  <label>Français</label>
                  <input v-if="editingId === w.id" v-model="editForm.french" class="mod-input" />
                  <div v-else class="mod-text main">{{ w.french }}</div>
                </div>
                <div class="f-group">
                  <label>Fon</label>
                  <input v-if="editingId === w.id" v-model="editForm.fon" class="mod-input font-fon" />
                  <div v-else class="mod-text main font-fon">{{ w.fon }}</div>
                </div>
              </div>

              <div class="f-group mt-15">
                <label>Phonétique</label>
                <input v-if="editingId === w.id" v-model="editForm.phonetic" class="mod-input" />
                <div v-else class="mod-text">{{ w.phonetic || '--' }}</div>
              </div>

              <div class="f-group mt-15">
                <label>Exemple</label>
                <textarea v-if="editingId === w.id" v-model="editForm.example" class="mod-textarea"></textarea>
                <div v-else class="mod-text example-box">" {{ w.example || "Pas d'exemple" }} "</div>
              </div>

              <!-- Audio section (only in edit mode) -->
              <div v-if="editingId === w.id" class="mod-audio-box mt-20">
                <div class="audio-control-item">
                  <label><lucide-icon name="volume-2" /> Mot prononcé</label>
                  <audio-recorder @recorded="editForm.wordAudioBlob = $event" />
                </div>
                <div class="audio-control-item">
                  <label><lucide-icon name="mic-2" /> Phrase exemple</label>
                  <audio-recorder @recorded="editForm.phraseAudioBlob = $event" />
                </div>
              </div>

              <!-- Audio preview (view mode) -->
              <div v-else class="audio-preview-strip mt-15">
                <div class="audio-pill" :class="{ active: !!w.audio_url }">
                  <lucide-icon :name="w.audio_url ? 'volume-2' : 'volume-x'" />
                  <span v-if="w.audio_url">Audio mot</span>
                  <span v-else>Pas d'audio</span>
                  <audio v-if="w.audio_url" :src="w.audio_url" controls class="premium-mini-player" />
                </div>
              </div>
            </div>

            <div class="card-actions-v3">
              <template v-if="editingId === w.id">
                <button @click="saveEdit" class="btn-action-v3 save">
                  <lucide-icon name="save" /> Enregistrer
                </button>
              </template>
              <template v-else>
                <button v-if="w.status === 'pending'" @click="approveWord(w.id)" :disabled="processingIds.includes(w.id)" class="btn-action-v3 approve">
                  <lucide-icon :name="processingIds.includes(w.id) ? 'loader' : 'check-circle-2'" :class="{ spin: processingIds.includes(w.id) }" />
                  {{ processingIds.includes(w.id) ? 'Approbation...' : 'Approuver' }}
                </button>
                <button @click="deleteWord(w.id)" :disabled="processingIds.includes(w.id)" class="btn-action-v3 delete">
                  <lucide-icon :name="processingIds.includes(w.id) ? 'loader' : 'trash-2'" :class="{ spin: processingIds.includes(w.id) }" />
                  {{ processingIds.includes(w.id) ? 'Suppression...' : 'Supprimer' }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <div v-if="displayWords.length === 0" class="empty-state-v3 zoom-in">
          <div class="empty-icon"><lucide-icon name="search-x" :size="64" /></div>
          <h3>Aucun mot trouvé</h3>
          <p v-if="adminSearch">Aucun résultat pour "{{ adminSearch }}"</p>
          <p v-else>Cette section est actuellement vide.</p>
        </div>
      </div>

      <!-- ═══════════════════════════════════════════════════════
           ZONE 2 — STUDIO AUDIO
      ════════════════════════════════════════════════════════ -->
      <div v-if="activeTab === 'audio-studio'" class="studio-zone">

        <!-- Loading -->
        <div v-if="studioLoading" class="studio-card glass-card" style="padding: 80px 40px; text-align:center;">
          <div class="spinner"></div>
          <p style="margin-top: 20px; opacity: 0.7;">Chargement des mots à enregistrer...</p>
        </div>

        <!-- Error -->
        <div v-else-if="studioError" class="studio-card glass-card" style="padding: 60px 40px; text-align:center; border-color: rgba(239,68,68,0.3);">
          <lucide-icon name="alert-triangle" style="color: #ef4444;" :size="48" />
          <p style="color: #ef4444; margin-top: 16px; font-weight: 600;">{{ studioError }}</p>
          <button @click="fetchStudioWords" class="btn-premium mini" style="margin-top: 20px;">Réessayer</button>
        </div>

        <!-- Tous les mots ont un audio -->
        <div v-else-if="studioWords.length === 0" class="studio-card glass-card" style="padding: 100px 40px; text-align:center; background: linear-gradient(135deg, rgba(255,215,0,0.05) 0%, rgba(255,255,255,0.02) 100%);">
          <div style="font-size: 4rem; margin-bottom: 20px;">🎉</div>
          <h3 style="font-size: 2rem; font-weight: 800; color: white;">Studio à jour !</h3>
          <p style="margin-top: 10px; opacity: 0.7; max-width: 450px; margin-left:auto; margin-right:auto;">
            Tous les mots du dictionnaire possèdent un enregistrement audio. Revenez plus tard pour les nouveaux ajouts !
          </p>
        </div>

        <!-- Studio actif -->
        <div v-else class="studio-layout">

          <!-- Progress bar -->
          <div class="studio-progress-bar glass-card" style="border-radius: 20px; padding: 20px 28px; margin-bottom: 24px; display: flex; align-items: center; gap: 20px;">
            <div style="flex: 1;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <span style="font-size: 0.85rem; opacity: 0.7; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">Progression audio</span>
                <span style="font-size: 0.9rem; font-weight: 700; color: var(--primary);">{{ studioIndex + 1 }} / {{ studioWords.length }} <span style="opacity: 0.5; font-weight: 400;">({{ studioTotal }} restants en base)</span></span>
              </div>
              <div style="height: 6px; background: rgba(255,255,255,0.08); border-radius: 99px; overflow: hidden;">
                <div :style="'width: ' + Math.round(((studioIndex + 1) / studioWords.length) * 100) + '%; height: 100%; background: linear-gradient(90deg, var(--primary), #ff9f43); border-radius: 99px; transition: width 0.4s;'"></div>
              </div>
            </div>
            <button @click="fetchStudioWords" class="btn-refresh-pulse" title="Recharger la liste">
              <lucide-icon name="refresh-cw" />
            </button>
          </div>

          <!-- Main studio card -->
          <div class="studio-card glass-card scale-in">

            <!-- Word display -->
            <div class="word-display-box" style="text-align: center; padding: 40px 40px 30px; border-bottom: 1px solid rgba(255,255,255,0.07);">
              <div class="fon-label font-fon" style="font-size: 3.5rem; font-weight: 900; color: white; line-height: 1.2; margin-bottom: 12px;">
                {{ studioCurrentWord.fon }}
              </div>
              <div class="fr-label" style="font-size: 1.2rem; opacity: 0.7;">
                signifie : <strong style="color: var(--primary);">{{ studioCurrentWord.french }}</strong>
              </div>
              <div v-if="studioCurrentWord.phonetic" style="margin-top: 10px; font-size: 1rem; opacity: 0.5; font-family: monospace;">
                {{ studioCurrentWord.phonetic }}
              </div>
              <button @click="studioSpeakHint" class="btn-hint" style="margin-top: 20px;" title="Écouter une aide TTS">
                <lucide-icon name="volume-2" /> Indice audio (TTS)
              </button>
            </div>

            <!-- Controls -->
            <div class="studio-controls-grid" style="padding: 30px 40px;">

              <!-- Phonetic field -->
              <div class="control-box">
                <label class="control-title">1. Phonétique (facultatif)</label>
                <p class="control-desc">Corrigez ou ajoutez la transcription phonétique.</p>
                <input
                  v-model="studioPhonetic"
                  class="input-field"
                  :placeholder="studioCurrentWord.phonetic || 'Ex: [fɔ̃ tché]'"
                  style="background: rgba(0,0,0,0.25);"
                />
              </div>

              <!-- Audio recorder -->
              <div class="control-box">
                <label class="control-title">2. Voix Humaine (obligatoire)</label>
                <p class="control-desc">Enregistrez une voix claire et naturelle.</p>
                <audio-recorder ref="studioRecorder" @recorded="studioAudioBlob = $event" />
              </div>
            </div>

            <!-- Footer actions -->
            <div class="studio-footer-actions" style="padding: 0 40px 40px; display: flex; gap: 16px; justify-content: flex-end; align-items: center;">
              <button @click="studioSkip" class="btn-skip" :disabled="studioWords.length <= 1">
                Passer <lucide-icon name="chevrons-right" />
              </button>
              <button
                @click="studioSubmit"
                class="btn-save-next"
                :disabled="studioSubmitting || !studioAudioBlob"
                :style="(!studioAudioBlob || studioSubmitting) ? 'opacity: 0.5;' : ''"
              >
                <span v-if="studioSubmitting" style="display:flex;align-items:center;gap:8px;">
                  Enregistrement... <div class="spinner mini"></div>
                </span>
                <span v-else style="display:flex;align-items:center;gap:8px;">
                  <lucide-icon name="check" /> Sauvegarder &amp; Suivant
                </span>
              </button>
            </div>
          </div>

          <!-- Mini-list of upcoming words -->
          <div class="glass-card" style="border-radius: 20px; padding: 20px; margin-top: 24px;">
            <h4 style="margin:0 0 14px; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6;">Prochains mots à enregistrer</h4>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <div
                v-for="(w, i) in studioWords.slice(0, 12)"
                :key="w.id"
                @click="studioIndex = i; resetStudio()"
                class="upcoming-chip"
                :class="{ 'current-chip': i === studioIndex }"
                style="cursor: pointer;"
              >
                {{ w.fon }}
              </div>
            </div>
          </div>

        </div>
      </div>

    </div>
  `
}
