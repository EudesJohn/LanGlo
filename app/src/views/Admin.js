// app/src/views/Admin.js
import AudioRecorder from '../components/AudioRecorder.js';
import LucideIcon from '../components/LucideIcon.js'

const API = '/api';

export default {
  components: { AudioRecorder, LucideIcon },
  props: ['pendingWords', 'allWords'],
  emits: ['approve', 'delete', 'updateWord', 'refresh'],
  data() {
    return {
      activeTab: 'library',
      // Library — pagination côté serveur
      libWords: [],
      libTotal: 0,
      libTotalPages: 1,
      libPage: 1,
      libLimit: 50,
      libFilter: 'all',
      libSearch: '',
      libSearchDebounce: null,
      libLoading: false,
      // Edition
      editingId: null,
      editForm: { french: '', fon: '', phonetic: '', example: '', wordAudioBlob: null, phraseAudioBlob: null },
      processingIds: [],
      // Audio Studio
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
  computed: {
    pendingCount() { return this.pendingWords.length; },
    noAudioCount() { return this.studioTotal; },
  },
  watch: {
    activeTab(tab) {
      if (tab === 'library' && this.libWords.length === 0) this.fetchLibrary();
      if (tab === 'audio-studio' && this.studioWords.length === 0) this.fetchStudioWords();
    },
    libFilter() { this.libPage = 1; this.fetchLibrary(); },
    libSearch() {
      clearTimeout(this.libSearchDebounce);
      this.libSearchDebounce = setTimeout(() => { this.libPage = 1; this.fetchLibrary(); }, 400);
    }
  },
  mounted() {
    this.fetchLibrary();
    this.fetchStudioWordCount();
  },
  methods: {
    // ── Library ─────────────────────────────────────────────────
    async fetchLibrary() {
      this.libLoading = true;
      try {
        const params = new URLSearchParams({
          page: this.libPage,
          limit: this.libLimit,
          filter: this.libFilter,
          q: this.libSearch
        });
        const res = await axios.get(`${API}/admin/all?${params}`);
        this.libWords     = res.data.data || [];
        this.libTotal     = res.data.total || 0;
        this.libTotalPages = res.data.totalPages || 1;
      } catch (e) {
        console.error('Library fetch error:', e);
      } finally {
        this.libLoading = false;
      }
    },
    prevPage() { if (this.libPage > 1) { this.libPage--; this.fetchLibrary(); } },
    nextPage() { if (this.libPage < this.libTotalPages) { this.libPage++; this.fetchLibrary(); } },
    goPage(p)  { this.libPage = p; this.fetchLibrary(); },

    async fetchStudioWordCount() {
      try {
        const res = await axios.get(`${API}/dictionary/studio-list`);
        this.studioTotal = res.data.totalRemaining || 0;
      } catch(e) {}
    },

    approveWord(id) {
      if (this.processingIds.includes(id)) return;
      this.processingIds.push(id);
      this.$emit('approve', id);
      setTimeout(() => { this.processingIds = this.processingIds.filter(x => x !== id); this.fetchLibrary(); }, 1500);
    },
    deleteWord(id) {
      if (this.processingIds.includes(id)) return;
      this.processingIds.push(id);
      this.$emit('delete', id);
      setTimeout(() => { this.processingIds = this.processingIds.filter(x => x !== id); this.fetchLibrary(); }, 1500);
    },
    startEdit(word) {
      this.editingId = word.id;
      this.editForm = { ...word, wordAudioBlob: null, phraseAudioBlob: null };
    },
    async saveEdit() {
      const toB64 = blob => new Promise((res, rej) => {
        if (!blob) return res(null);
        const r = new FileReader();
        r.onloadend = () => res(r.result.split(',')[1]);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      const audio_base64         = await toB64(this.editForm.wordAudioBlob);
      const example_audio_base64 = await toB64(this.editForm.phraseAudioBlob);
      this.$emit('updateWord', { ...this.editForm, audio_base64, example_audio_base64 });
      this.editingId = null;
      setTimeout(() => this.fetchLibrary(), 800);
    },
    cancelEdit() { this.editingId = null; },

    // ── Audio Studio ─────────────────────────────────────────────
    async fetchStudioWords() {
      this.studioLoading = true; this.studioError = null;
      try {
        const res = await axios.get(`${API}/dictionary/studio-list`);
        this.studioWords = res.data.words || [];
        this.studioTotal = res.data.totalRemaining || 0;
        this.studioIndex = 0; this.resetStudio();
      } catch { this.studioError = 'Impossible de charger les mots.'; }
      finally { this.studioLoading = false; }
    },
    resetStudio() {
      this.studioPhonetic = this.studioCurrentWord?.phonetic || '';
      this.studioAudioBlob = null;
      if (this.$refs.studioRecorder) this.$refs.studioRecorder.resetAudio();
    },
    get studioCurrentWord() { return this.studioWords[this.studioIndex] || null; },
    studioSkip() {
      if (this.studioWords.length <= 1) return;
      this.studioIndex = (this.studioIndex + 1) % this.studioWords.length;
      this.resetStudio();
    },
    studioSpeakHint() {
      if (!this.studioCurrentWord || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const t = this.studioCurrentWord.fon.replace(/ɖ/g,'d').replace(/ɔ/g,'o').replace(/ɛ/g,'e');
      const u = new SpeechSynthesisUtterance(t); u.lang='fr-FR'; u.rate=0.8;
      window.speechSynthesis.speak(u);
    },
    async studioSubmit() {
      if (this.studioSubmitting || !this.studioCurrentWord || !this.studioAudioBlob) return;
      this.studioSubmitting = true;
      try {
        const r = new FileReader();
        const audio_base64 = await new Promise((res,rej) => { r.onloadend=()=>res(r.result.split(',')[1]); r.onerror=rej; r.readAsDataURL(this.studioAudioBlob); });
        const result = await axios.post(`${API}/dictionary/studio-update`, { id: this.studioCurrentWord.id, phonetic: this.studioPhonetic, audio_base64 });
        if (result.data.success) {
          this.studioWords.splice(this.studioIndex, 1);
          this.studioTotal--;
          if (this.studioWords.length === 0 && this.studioTotal > 0) await this.fetchStudioWords();
          else { if (this.studioIndex >= this.studioWords.length) this.studioIndex = 0; this.resetStudio(); }
        } else alert(result.data.message || 'Erreur');
      } catch { alert('Erreur lors de la sauvegarde.'); }
      finally { this.studioSubmitting = false; }
    }
  },
  template: `
    <div class="view-admin-v3">

      <!-- HEADER -->
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
              <span class="stat-label">Total base</span>
              <span class="stat-value">{{ libTotal.toLocaleString() }}</span>
            </div>
            <button @click="$emit('refresh'); fetchLibrary();" class="btn-refresh-pulse" title="Actualiser">
              <lucide-icon name="refresh-cw" />
            </button>
          </div>
        </div>

        <div class="admin-main-tabs">
          <button @click="activeTab = 'library'" :class="{ active: activeTab === 'library' }" class="main-tab-btn">
            <lucide-icon name="library" />
            <span>Bibliothèque des mots</span>
            <span class="tab-count">{{ libTotal.toLocaleString() }}</span>
          </button>
          <button @click="activeTab = 'audio-studio'" :class="{ active: activeTab === 'audio-studio' }" class="main-tab-btn studio-tab">
            <lucide-icon name="mic" />
            <span>Studio Audio</span>
            <span class="tab-count accent">{{ noAudioCount.toLocaleString() }}</span>
          </button>
        </div>
      </div>

      <!-- ══════════ ZONE 1 — BIBLIOTHÈQUE ══════════ -->
      <div v-if="activeTab === 'library'">

        <!-- Toolbar -->
        <div class="library-toolbar glass-card" style="border-radius:20px;padding:16px 20px;margin-bottom:24px;display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div class="filter-chips" style="display:flex;gap:8px;flex-wrap:wrap;flex:1;">
            <button @click="libFilter='all'"      :class="{'chip-active':libFilter==='all'}"      class="filter-chip">Tous</button>
            <button @click="libFilter='pending'"  :class="{'chip-active':libFilter==='pending'}"  class="filter-chip">En attente <span class="chip-badge">{{ pendingCount }}</span></button>
            <button @click="libFilter='approved'" :class="{'chip-active':libFilter==='approved'}" class="filter-chip">Approuvés</button>
            <button @click="libFilter='no-audio'" :class="{'chip-active':libFilter==='no-audio'}" class="filter-chip">Sans audio <span class="chip-badge warn">{{ noAudioCount }}</span></button>
          </div>
          <div class="admin-search-wrap" style="min-width:220px;">
            <lucide-icon name="search" className="search-icon" />
            <input v-model="libSearch" placeholder="Rechercher..." class="admin-search-input" />
          </div>
        </div>

        <!-- Loading spinner -->
        <div v-if="libLoading" style="text-align:center;padding:60px;">
          <div class="spinner"></div>
        </div>

        <!-- Words grid -->
        <div v-else class="moderation-grid-v3">
          <div v-for="w in libWords" :key="w.id" class="mod-card-v3 glass-card" :class="{'editing-glow':editingId===w.id,'validated':w.status==='approved'}">

            <div class="card-top-v3">
              <span class="ref-tag">
                #{{ w.id }}
                <span class="status-badge" :class="w.status">{{ w.status }}</span>
                <span v-if="!w.audio_url" class="no-audio-badge">🔇 sans audio</span>
              </span>
              <div class="quick-actions">
                <button v-if="editingId!==w.id" @click="startEdit(w)" class="btn-mini edit"><lucide-icon name="edit-3" /></button>
                <button v-else @click="cancelEdit" class="btn-mini cancel"><lucide-icon name="x" /></button>
              </div>
            </div>

            <div class="card-content-v3">
              <div class="field-pair">
                <div class="f-group">
                  <label>Français</label>
                  <input v-if="editingId===w.id" v-model="editForm.french" class="mod-input" />
                  <div v-else class="mod-text main">{{ w.french }}</div>
                </div>
                <div class="f-group">
                  <label>Fon</label>
                  <input v-if="editingId===w.id" v-model="editForm.fon" class="mod-input font-fon" />
                  <div v-else class="mod-text main font-fon">{{ w.fon }}</div>
                </div>
              </div>

              <div class="f-group mt-15">
                <label>Phonétique</label>
                <input v-if="editingId===w.id" v-model="editForm.phonetic" class="mod-input" />
                <div v-else class="mod-text">{{ w.phonetic || '--' }}</div>
              </div>

              <div class="f-group mt-15">
                <label>Exemple</label>
                <textarea v-if="editingId===w.id" v-model="editForm.example" class="mod-textarea"></textarea>
                <div v-else class="mod-text example-box">" {{ w.example || "Pas d'exemple" }} "</div>
              </div>

              <div v-if="editingId===w.id" class="mod-audio-box mt-20">
                <div class="audio-control-item">
                  <label><lucide-icon name="volume-2" /> Mot prononcé</label>
                  <audio-recorder @recorded="editForm.wordAudioBlob = $event" />
                </div>
                <div class="audio-control-item">
                  <label><lucide-icon name="mic-2" /> Phrase exemple</label>
                  <audio-recorder @recorded="editForm.phraseAudioBlob = $event" />
                </div>
              </div>

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
              <template v-if="editingId===w.id">
                <button @click="saveEdit" class="btn-action-v3 save"><lucide-icon name="save" /> Enregistrer</button>
              </template>
              <template v-else>
                <button v-if="w.status==='pending'" @click="approveWord(w.id)" :disabled="processingIds.includes(w.id)" class="btn-action-v3 approve">
                  <lucide-icon :name="processingIds.includes(w.id)?'loader':'check-circle-2'" :class="{spin:processingIds.includes(w.id)}" />
                  {{ processingIds.includes(w.id) ? 'Approbation...' : 'Approuver' }}
                </button>
                <button @click="deleteWord(w.id)" :disabled="processingIds.includes(w.id)" class="btn-action-v3 delete">
                  <lucide-icon :name="processingIds.includes(w.id)?'loader':'trash-2'" :class="{spin:processingIds.includes(w.id)}" />
                  {{ processingIds.includes(w.id) ? 'Suppression...' : 'Supprimer' }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="!libLoading && libWords.length === 0" class="empty-state-v3 zoom-in">
          <div class="empty-icon"><lucide-icon name="search-x" :size="64" /></div>
          <h3>Aucun mot trouvé</h3>
          <p>{{ libSearch ? 'Aucun résultat pour "' + libSearch + '"' : 'Cette section est vide.' }}</p>
        </div>

        <!-- Pagination -->
        <div v-if="libTotalPages > 1" class="admin-pagination">
          <button @click="prevPage" :disabled="libPage <= 1" class="page-btn">
            <lucide-icon name="chevron-left" />
          </button>
          <div class="page-info">
            Page <strong>{{ libPage }}</strong> / {{ libTotalPages }}
            <span style="opacity:0.5;font-size:0.85rem;"> — {{ libTotal.toLocaleString() }} mots</span>
          </div>
          <button @click="nextPage" :disabled="libPage >= libTotalPages" class="page-btn">
            <lucide-icon name="chevron-right" />
          </button>
        </div>
      </div>

      <!-- ══════════ ZONE 2 — STUDIO AUDIO ══════════ -->
      <div v-if="activeTab === 'audio-studio'" class="studio-zone">

        <div v-if="studioLoading" class="studio-card glass-card" style="padding:80px 40px;text-align:center;">
          <div class="spinner"></div>
          <p style="margin-top:20px;opacity:0.7;">Chargement...</p>
        </div>

        <div v-else-if="studioError" class="studio-card glass-card" style="padding:60px 40px;text-align:center;border-color:rgba(239,68,68,0.3);">
          <lucide-icon name="alert-triangle" style="color:#ef4444;" :size="48" />
          <p style="color:#ef4444;margin-top:16px;font-weight:600;">{{ studioError }}</p>
          <button @click="fetchStudioWords" class="btn-premium mini" style="margin-top:20px;">Réessayer</button>
        </div>

        <div v-else-if="studioWords.length === 0" class="studio-card glass-card" style="padding:100px 40px;text-align:center;">
          <div style="font-size:4rem;margin-bottom:20px;">🎉</div>
          <h3 style="font-size:2rem;font-weight:800;color:white;">Studio à jour !</h3>
          <p style="margin-top:10px;opacity:0.7;">Tous les mots ont un enregistrement audio.</p>
        </div>

        <div v-else class="studio-layout">
          <!-- Progress -->
          <div class="studio-progress-bar glass-card" style="border-radius:20px;padding:20px 28px;margin-bottom:24px;display:flex;align-items:center;gap:20px;">
            <div style="flex:1;">
              <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <span style="font-size:0.85rem;opacity:0.7;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Progression audio</span>
                <span style="font-size:0.9rem;font-weight:700;color:var(--primary);">{{ studioIndex+1 }} / {{ studioWords.length }} <span style="opacity:0.5;font-weight:400;">({{ studioTotal.toLocaleString() }} restants)</span></span>
              </div>
              <div style="height:6px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;">
                <div :style="'width:'+Math.round(((studioIndex+1)/studioWords.length)*100)+'%;height:100%;background:linear-gradient(90deg,var(--primary),#ff9f43);border-radius:99px;transition:width 0.4s;'"></div>
              </div>
            </div>
            <button @click="fetchStudioWords" class="btn-refresh-pulse"><lucide-icon name="refresh-cw" /></button>
          </div>

          <!-- Studio card -->
          <div class="studio-card glass-card scale-in">
            <div class="word-display-box" style="text-align:center;padding:40px 40px 30px;border-bottom:1px solid rgba(255,255,255,0.07);">
              <div class="fon-label font-fon" style="font-size:3.5rem;font-weight:900;color:white;line-height:1.2;margin-bottom:12px;">
                {{ studioWords[studioIndex].fon }}
              </div>
              <div style="font-size:1.2rem;opacity:0.7;">
                signifie : <strong style="color:var(--primary);">{{ studioWords[studioIndex].french }}</strong>
              </div>
              <div v-if="studioWords[studioIndex].phonetic" style="margin-top:10px;font-size:1rem;opacity:0.5;font-family:monospace;">{{ studioWords[studioIndex].phonetic }}</div>
              <button @click="studioSpeakHint" class="btn-hint" style="margin-top:20px;">
                <lucide-icon name="volume-2" /> Indice TTS
              </button>
            </div>

            <div class="studio-controls-grid" style="padding:30px 40px;">
              <div class="control-box">
                <label class="control-title">1. Phonétique (facultatif)</label>
                <p class="control-desc">Corrigez ou ajoutez la transcription phonétique.</p>
                <input v-model="studioPhonetic" class="input-field" :placeholder="studioWords[studioIndex].phonetic || 'Ex: [fɔ̃ tché]'" style="background:rgba(0,0,0,0.25);" />
              </div>
              <div class="control-box">
                <label class="control-title">2. Voix Humaine (obligatoire)</label>
                <p class="control-desc">Enregistrez une voix claire et naturelle.</p>
                <audio-recorder ref="studioRecorder" @recorded="studioAudioBlob = $event" />
              </div>
            </div>

            <div style="padding:0 40px 40px;display:flex;gap:16px;justify-content:flex-end;align-items:center;">
              <button @click="studioSkip" class="btn-skip" :disabled="studioWords.length <= 1">Passer <lucide-icon name="chevrons-right" /></button>
              <button @click="studioSubmit" class="btn-save-next" :disabled="studioSubmitting || !studioAudioBlob" :style="(!studioAudioBlob||studioSubmitting)?'opacity:0.5;':''">
                <span v-if="studioSubmitting" style="display:flex;align-items:center;gap:8px;">Enregistrement... <div class="spinner mini"></div></span>
                <span v-else style="display:flex;align-items:center;gap:8px;"><lucide-icon name="check" /> Sauvegarder &amp; Suivant</span>
              </button>
            </div>
          </div>

          <!-- Queue -->
          <div class="glass-card" style="border-radius:20px;padding:20px;margin-top:24px;">
            <h4 style="margin:0 0 14px;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.08em;opacity:0.6;">Prochains mots</h4>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              <div v-for="(w,i) in studioWords.slice(0,12)" :key="w.id" @click="studioIndex=i;resetStudio()" class="upcoming-chip" :class="{'current-chip':i===studioIndex}">{{ w.fon }}</div>
            </div>
          </div>
        </div>
      </div>

    </div>
  `
}
