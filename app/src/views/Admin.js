// app/src/views/Admin.js
import AudioRecorder from '../components/AudioRecorder.js';
import LucideIcon from '../components/LucideIcon.js'

export default {
  components: { AudioRecorder, LucideIcon },
  props: ['pendingWords', 'allWords'],
  emits: ['approve', 'delete', 'updateWord', 'refresh'],
  data() {
    return {
      activeTab: 'pending', // 'pending' or 'dictionary'
      adminSearch: '',
      editingId: null,
      editForm: { 
        french: '', fon: '', phonetic: '', example: '', 
        wordAudioBlob: null, phraseAudioBlob: null 
      }
    }
  },
  computed: {
    displayWords() {
      const source = this.activeTab === 'pending' ? this.pendingWords : this.allWords;
      if (!this.adminSearch) return source;
      
      const q = this.adminSearch.toLowerCase();
      return source.filter(w => 
        w.french.toLowerCase().includes(q) || 
        w.fon.toLowerCase().includes(q)
      );
    }
  },
  methods: {
    startEdit(word) {
      this.editingId = word.id;
      this.editForm = { ...word, wordAudioBlob: null, phraseAudioBlob: null };
    },
    async saveEdit() {
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
        const audio_base64 = await blobToBase64(this.editForm.wordAudioBlob);
        const example_audio_base64 = await blobToBase64(this.editForm.phraseAudioBlob);

        this.$emit('updateWord', { 
          ...this.editForm, 
          audio_base64, 
          example_audio_base64 
        });
        this.editingId = null;
      } catch (e) {
        console.error("Save error:", e);
      }
    },
    cancelEdit() {
      this.editingId = null;
    }
  },
  template: `
    <div class="view-admin-v3">
      <!-- DASHBOARD HEADER -->
      <div class="admin-dashboard-header slide-down">
        <div class="header-main">
          <div class="title-group">
            <h2 class="premium-title">Gestion du Dictionnaire</h2>
            <p class="subtitle">Contrôle éditorial et modération des contributions</p>
          </div>
          <div class="header-stats">
            <div class="stat-pill">
              <span class="stat-label">Attente</span>
              <span class="stat-value">{{ pendingWords.length }}</span>
            </div>
            <div class="stat-pill secondary">
              <span class="stat-label">Total</span>
              <span class="stat-value">{{ allWords.length }}</span>
            </div>
            <button @click="$emit('refresh')" class="btn-refresh-pulse" title="Actualiser">
              <lucide-icon name="refresh-cw" />
            </button>
          </div>
        </div>

        <!-- TABS & SEARCH -->
        <div class="admin-nav-bar">
          <div class="tabs-group">
            <button @click="activeTab = 'pending'" :class="{ active: activeTab === 'pending' }" class="tab-btn">
              <lucide-icon name="clock" /> Suggestions
            </button>
            <button @click="activeTab = 'dictionary'" :class="{ active: activeTab === 'dictionary' }" class="tab-btn">
              <lucide-icon name="book-open" /> Bibliothèque Globale
            </button>
          </div>
          <div class="admin-search-wrap">
            <lucide-icon name="search" className="search-icon" />
            <input v-model="adminSearch" placeholder="Rechercher un mot..." class="admin-search-input" />
          </div>
        </div>
      </div>

      <!-- MODERATION GRID -->
      <div class="moderation-grid-v3">
        <div v-for="w in displayWords" :key="w.id" class="mod-card-v3 glass-card" :class="{ 'editing-glow': editingId === w.id, 'validated': w.status === 'approved' }">
          
          <div class="card-top-v3">
            <span class="ref-tag">ID #{{ w.id }} • <span class="status-badge">{{ w.status }}</span></span>
            <div class="quick-actions">
               <button v-if="editingId !== w.id" @click="startEdit(w)" class="btn-mini edit" title="Modifier"><lucide-icon name="edit-3" /></button>
               <button v-else @click="cancelEdit" class="btn-mini cancel" title="Annuler"><lucide-icon name="x" /></button>
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
              <label>Exemple / Contexte</label>
              <textarea v-if="editingId === w.id" v-model="editForm.example" class="mod-textarea"></textarea>
              <div v-else class="mod-text example-box">" {{ w.example || "Pas d'exemple" }} "</div>
            </div>

            <div class="mod-audio-box mt-20">
              <div class="audio-control-item">
                <label><lucide-icon name="volume-2" /> Mot prononcé</label>
                <div v-if="editingId === w.id" class="edit-recorder-wrap">
                  <audio-recorder @recorded="editForm.wordAudioBlob = $event" />
                  <p class="info-text">Changer l'audio</p>
                </div>
                <div v-else class="audio-wrap">
                  <audio v-if="w.audio_url" :src="w.audio_url" controls class="premium-mini-player"></audio>
                  <span v-else class="no-audio-tag">Aucun audio</span>
                </div>
              </div>

              <div class="audio-control-item">
                <label><lucide-icon name="mic-2" /> Phrase prononcée</label>
                <div v-if="editingId === w.id" class="edit-recorder-wrap">
                  <audio-recorder @recorded="editForm.phraseAudioBlob = $event" />
                  <p class="info-text">Changer l'audio</p>
                </div>
                <div v-else class="audio-wrap">
                  <audio v-if="w.example_audio_url" :src="w.example_audio_url" controls class="premium-mini-player"></audio>
                  <span v-else class="no-audio-tag">Aucun audio</span>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER ACTIONS -->
          <div class="card-actions-v3">
            <template v-if="editingId === w.id">
              <button @click="saveEdit" class="btn-action-v3 save"><lucide-icon name="save" /> Enregistrer les modifications</button>
            </template>
            <template v-else>
              <button v-if="w.status === 'pending'" @click="$emit('approve', w.id)" class="btn-action-v3 approve"><lucide-icon name="check-circle-2" /> Approuver</button>
              <button @click="$emit('delete', w.id)" class="btn-action-v3 delete"><lucide-icon name="trash-2" /> Supprimer</button>
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
  `
}
