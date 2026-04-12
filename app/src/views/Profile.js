// app/src/views/Profile.js

export default {
  props: ['user', 'favorites'],
  data() {
    return {
      isEditing: false,
      editForm: { name: '', pseudo: '', nationality: '', ethnicity: '' }
    }
  },
  methods: {
    startEdit() {
      this.isEditing = true;
      this.editForm = { ...this.user };
    },
    async saveProfile() {
      this.$emit('updateProfile', this.editForm);
      this.isEditing = false;
    }
  },
  template: `
    <div class="view-profile">
      <div class="profile-header glass-card">
        <div class="avatar-large clickable" title="Changer de photo">
          {{ user?.pseudo?.[0] || user?.name?.[0] }}
          <div class="avatar-overlay"><i data-lucide="camera"></i></div>
        </div>
        
        <div v-if="!isEditing" class="profile-info">
          <h2>{{ user?.pseudo || user?.name }}</h2>
          <p>{{ user?.email }}</p>
          <div class="badge-row">
            <span class="badge">{{ user?.role }}</span>
            <span class="badge secondary">{{ user?.ethnicity }}</span>
            <span class="badge secondary">{{ user?.nationality }}</span>
          </div>
        </div>
        <div v-else class="profile-info editing">
           <input v-model="editForm.pseudo" placeholder="Pseudo" class="input-field mini" />
           <input v-model="editForm.name" placeholder="Nom complet" class="input-field mini" />
           <div class="badge-row">
              <input v-model="editForm.nationality" placeholder="Nationalité" class="input-field mini" />
              <select v-model="editForm.ethnicity" class="input-field mini">
                <option value="Fon">Fon</option>
                <option value="Goun">Goun</option>
                <option value="Autre">Autre</option>
              </select>
           </div>
        </div>

        <div class="profile-actions">
           <button v-if="!isEditing" @click="startEdit" class="nav-btn"><i data-lucide="edit"></i> Modifier</button>
           <button v-else @click="saveProfile" class="btn-check wide">Enregistrer</button>
           <button @click="$emit('logout')" class="nav-btn logout-btn-text"><i data-lucide="log-out"></i> Déconnexion</button>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="stat-card glass-card">
          <h4>0</h4>
          <p>Mots suggérés</p>
        </div>
        <div class="stat-card glass-card">
          <h4>1</h4>
          <p>Jour d'activité</p>
        </div>
        <div class="stat-card glass-card">
          <h4>{{ favorites.length }}</h4>
          <p>Favoris</p>
        </div>
      </div>

      <div class="favorites-section">
        <h3>Mes favoris ({{ favorites.length }})</h3>
        <div v-if="favorites.length === 0" class="empty-favs">
          <p>Vous n'avez pas encore de mots favoris.</p>
          <button @click="$emit('navigate', 'home')" class="btn-premium">Explorer</button>
        </div>
        <div v-else class="words-grid mini">
          <div v-for="w in favorites" :key="w.id" class="word-card-small glass-card">
            <h4>{{ w.fon }}</h4>
            <p>{{ w.french }}</p>
            <button @click="$emit('toggleFavorite', w.id)" class="remove-fav"><i data-lucide="x"></i></button>
          </div>
        </div>
      </div>
    </div>
  `
}
