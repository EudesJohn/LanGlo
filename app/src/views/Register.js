// app/src/views/Register.js

export default {
  emits: ['register', 'navigate'],
  data() { 
    return { 
      name: '', email: '', password: '', 
      nationality: 'Béninoise', ethnicity: 'Fon' 
    } 
  },
  methods: {
    handleRegister() {
      this.$emit('register', { 
        name: this.name, email: this.email, password: this.password,
        nationality: this.nationality, ethnicity: this.ethnicity 
      });
    }
  },
  template: `
    <div class="view-auth">
      <div class="auth-card glass-card wide-auth">
        <h2>Créer un compte</h2>
        <p>Rejoignez Gbé Tché et contribuez à la culture Fon.</p>
        
        <form @submit.prevent="handleRegister">
          <div class="form-grid">
            <div class="form-group">
              <label><i data-lucide="user"></i> Nom complet</label>
              <input type="text" v-model="name" class="input-field" placeholder="Eudes Johnson" required />
            </div>
            <div class="form-group">
              <label><i data-lucide="mail"></i> Email</label>
              <input type="email" v-model="email" class="input-field" placeholder="exemple@mail.com" required />
            </div>
            <div class="form-group">
              <label><i data-lucide="lock"></i> Mot de passe</label>
              <input type="password" v-model="password" class="input-field" placeholder="••••••••" required />
            </div>
            <div class="form-group">
              <label><i data-lucide="flag"></i> Nationalité</label>
              <input type="text" v-model="nationality" class="input-field" required />
            </div>
            <div class="form-group full-width">
              <label><i data-lucide="users"></i> Ethnie</label>
              <select v-model="ethnicity" class="input-field">
                <option value="Fon">Fon (Bénin)</option>
                <option value="Goun">Goun (Bénin)</option>
                <option value="Mahi">Mahi (Bénin)</option>
                <option value="Yoruba">Yoruba</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
          </div>
          <button type="submit" class="btn-premium wide">
            <i data-lucide="user-plus"></i> Créer mon compte
          </button>
        </form>
        <p class="auth-footer">Déjà membre ? <a @click="$emit('navigate', 'login')">Connectez-vous</a></p>
      </div>
    </div>
  `
}
