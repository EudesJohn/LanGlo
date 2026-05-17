// app/src/views/Profile.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  props: ['user', 'favorites'],
  emits: ['updateProfile', 'logout', 'navigate', 'toggleFavorite'],
  components: { LucideIcon },
  data() {
    return {
      isEditing: false,
      isSaving: false,
      editForm: { name: '', pseudo: '', nationality: '', ethnicity: '' },
      customEthnicity: '',
      avatar_base64: null,
      previewAvatar: null
    }
  },
  methods: {
    startEdit() {
      this.isEditing = true;
      this.editForm = { ...this.user };
      this.previewAvatar = this.user.avatar_url;
      if (!['Fon', 'Goun', 'Yoruba', 'Mina', 'Nago', 'Bariba', 'Dendi'].includes(this.user.ethnicity)) {
        this.editForm.ethnicity = 'Autre';
        this.customEthnicity = this.user.ethnicity;
      }
    },
    triggerFileInput() {
      this.$refs.fileInput.click();
    },
    onFileChange(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        this.previewAvatar = event.target.result;
        this.avatar_base64 = event.target.result.split(',')[1];
      };
      reader.readAsDataURL(file);
    },
    async saveProfile() {
      this.isSaving = true;
      const finalEthnicity = this.editForm.ethnicity === 'Autre' ? this.customEthnicity : this.editForm.ethnicity;
      this.$emit('updateProfile', {
        ...this.editForm,
        ethnicity: finalEthnicity,
        avatar_base64: this.avatar_base64,
        onSuccess: () => {
          this.isEditing = false;
          this.avatar_base64 = null;
          this.isSaving = false;
        },
        onError: () => {
          this.isSaving = false;
        }
      });
    },
    cancelEdit() {
      this.isEditing = false;
    }
  },
  template: `
    <div class="view-profile">
      <div class="container">
        <div class="profile-grid-main">
          <!-- Sidebar: Personal Info -->
          <div class="profile-sidebar">
            <div class="profile-card glass-card">
              
              <div class="avatar-large" @click="isEditing ? triggerFileInput() : null" style="margin: 0 auto; cursor: pointer;">
                <img v-if="previewAvatar || user.avatar_url" :src="previewAvatar || user.avatar_url" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" />
                <div v-else>{{ user?.pseudo?.[0] || user?.name?.[0] }}</div>
                <div v-if="isEditing" class="avatar-overlay"><lucide-icon name="camera" /></div>
                <input type="file" ref="fileInput" @change="onFileChange" accept="image/*" style="display:none" />
              </div>
              
              <div v-if="!isEditing">
                <h2>{{ user?.pseudo || user?.name }}</h2>
                <p style="opacity: 0.6; margin-bottom: 20px;">{{ user?.email }}</p>
                
                <div class="profile-details">
                  <div class="detail-item">
                    <span class="detail-label">Rôle</span>
                    <span class="badge">{{ user?.role }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Ethnie</span>
                    <span class="detail-value">{{ user?.ethnicity || 'Non spécifié' }}</span>
                  </div>
                  <div class="detail-item">
                    <span class="detail-label">Nationalité</span>
                    <span class="detail-value">{{ user?.nationality || 'Non spécifié' }}</span>
                  </div>
                </div>
  
                <button @click="startEdit" class="btn-premium mini wide" style="margin-top: 20px;">
                  <lucide-icon name="edit-3" /> Modifier le profil
                </button>
              </div>
  
              <div v-else class="profile-info editing">
                <div class="form-group">
                  <label>Pseudo</label>
                  <input v-model="editForm.pseudo" class="input-field mini" />
                </div>
                <div class="form-group">
                  <label>Nom Complet</label>
                  <input v-model="editForm.name" class="input-field mini" />
                </div>
                <div class="form-group">
                  <label>Ethnie</label>
                  <select v-model="editForm.ethnicity" class="input-field mini">
                    <option value="Fon">Fon</option>
                    <option value="Goun">Goun</option>
                    <option value="Yoruba">Yoruba</option>
                    <option value="Mina">Mina</option>
                    <option value="Nago">Nago</option>
                    <option value="Bariba">Bariba</option>
                    <option value="Dendi">Dendi</option>
                    <option value="Autre">Autre (Saisir...)</option>
                  </select>
                </div>
                <div v-if="editForm.ethnicity === 'Autre'" class="form-group">
                   <input v-model="customEthnicity" class="input-field mini" placeholder="Nom de l'ethnie..." />
                </div>
                <div class="form-group">
                  <label>Nationalité</label>
                  <input v-model="editForm.nationality" class="input-field mini" />
                </div>
                
                <div style="display:flex; gap:10px; margin-top:20px;">
                  <button @click="saveProfile" class="btn-premium mini" style="flex:1" :disabled="isSaving">
                    <span v-if="isSaving">Enregistrement...</span>
                    <span v-else>Sauvegarder</span>
                  </button>
                  <button @click="cancelEdit" class="btn-outline mini" style="padding: 8px 15px;" :disabled="isSaving">Annuler</button>
                </div>
              </div>
  
              <button @click="$emit('logout')" class="nav-btn logout-btn-text" style="margin-top:20px; width:100%; justify-content:center;">
                <lucide-icon name="log-out" /> Déconnexion
              </button>
            </div>
          </div>
  
          <!-- Main Content: Stats & Activity -->
          <div class="profile-main-content">
            <div class="profile-stats-grid" style="margin-bottom: 30px;">
              <div class="stat-card glass-card">
                <h4>{{ user?.contributions_count || 0 }}</h4>
                <p>Mots suggérés</p>
              </div>
              <div class="stat-card glass-card">
                <h4>{{ favorites.length }}</h4>
                <p>Favoris</p>
              </div>
              <div class="stat-card glass-card">
                <h4>{{ user?.rank || 'New' }}</h4>
                <p>Classement</p>
              </div>
            </div>
  
            <div class="favorites-section glass-card" style="padding: 30px;">
              <h3 class="section-title"><lucide-icon name="heart" :size="24" className="inline-icon" /> Mes Favoris</h3>
              <div v-if="favorites.length === 0" class="empty-favs" style="text-align: center; padding: 40px 0;">
                <p style="opacity: 0.6; margin-bottom: 20px;">Votre liste de favoris est vide.</p>
                <button @click="$emit('navigate', 'home')" class="btn-premium mini">Découvrir des mots</button>
              </div>
              <div v-else class="words-grid-profile">
                <div v-for="w in favorites" :key="w.id" class="fav-mini-card">
                  <div class="fav-info">
                    <span class="fav-fon font-fon">{{ w.fon }}</span>
                    <span class="fav-french">{{ w.french }}</span>
                  </div>
                  <button @click="$emit('toggleFavorite', w.id)" class="btn-x-mini">
                    <lucide-icon name="x" :size="14" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}
