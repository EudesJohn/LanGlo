// app/src/views/Register.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['register', 'navigate'],
  components: { LucideIcon },
  data() { 
    return { 
      name: '', email: '', password: '', 
      nationality: 'Béninoise', ethnicity: 'Fon',
      fon_level: 'Aucune maitrise',
      customEthnicity: '',
      loading: false,
      showPassword: false
    } 
  },
  methods: {
    handleSubmit() {
      this.loading = true;
      const finalEthnicity = this.ethnicity === 'Autre' ? this.customEthnicity : this.ethnicity;
      this.$emit('register', {
        name: this.name,
        email: this.email,
        password: this.password,
        nationality: this.nationality,
        ethnicity: finalEthnicity,
        fon_level: this.fon_level,
        onComplete: () => this.loading = false
      });
    }
  },
  template: `
    <div class="auth-container-v2">
      <div class="auth-glow-card glass-card" style="max-width: 600px;">
        <div class="auth-header-v2">
          <h2 class="gradient-text">Inscription</h2>
          <p>Rejoignez les protecteurs de la langue Fon.</p>
        </div>
        
        <form @submit.prevent="handleSubmit">
          <div class="form-grid">
            <div class="auth-field-group">
              <label class="auth-label">NOM COMPLET</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="user" />
                <input type="text" v-model="name" class="input-v2" placeholder="Ex: Eudes Johnson" required />
              </div>
            </div>
            
            <div class="auth-field-group">
              <label class="auth-label">ADRESSE EMAIL</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="mail" />
                <input type="email" v-model="email" class="input-v2" placeholder="votre@email.com" required />
              </div>
            </div>

            <div class="auth-field-group">
              <label class="auth-label">MOT DE PASSE</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="lock" />
                <input :type="showPassword ? 'text' : 'password'" v-model="password" class="input-v2" placeholder="Minimum 6 caractères" required />
                <button type="button" class="eye-btn" @click="showPassword = !showPassword">
                  <lucide-icon :name="showPassword ? 'eye-off' : 'eye'" />
                </button>
              </div>
            </div>

            <div class="auth-field-group">
              <label class="auth-label">NATIONALITÉ</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="flag" />
                <input type="text" v-model="nationality" class="input-v2" placeholder="Ex: Béninoise" required />
              </div>
            </div>

            <div class="auth-field-group full-width">
              <label class="auth-label">ETHNIE / LANGUE MATERNELLE</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="users" />
                <select v-model="ethnicity" class="input-v2" style="padding-left: 50px;">
                  <option value="Fon">Fon (Bénin)</option>
                  <option value="Goun">Goun (Bénin)</option>
                  <option value="Mahi">Mahi (Bénin)</option>
                  <option value="Yoruba">Yoruba</option>
                  <option value="Mina">Mina</option>
                  <option value="Nago">Nago</option>
                  <option value="Bariba">Bariba</option>
                  <option value="Dendi">Dendi</option>
                  <option value="Yoa">Yoa</option>
                  <option value="Lokpa">Lokpa</option>
                  <option value="Autre">Autre (Saisir manuellement)</option>
                </select>
              </div>
            </div>
            
            <div class="auth-field-group full-width">
              <label class="auth-label">NIVEAU EN LANGUE FON</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="book" />
                <select v-model="fon_level" class="input-v2" style="padding-left: 50px;" required>
                  <option value="Aucune maitrise">Aucune maîtrise</option>
                  <option value="Débutant">Débutant</option>
                  <option value="Intermediaire">Intermédiaire</option>
                  <option value="Avancé">Avancé</option>
                </select>
              </div>
            </div>

            <!-- Custom Ethnicity Input -->
            <div v-if="ethnicity === 'Autre'" class="auth-field-group full-width" style="animation: slideUp 0.3s ease-out;">
              <label class="auth-label">PRÉCISEZ VOTRE ETHNIE</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="edit-2" />
                <input type="text" v-model="customEthnicity" class="input-v2" placeholder="Saisissez votre ethnie..." required />
              </div>
            </div>
          </div>

          <button type="submit" class="btn-auth-premium" style="margin-top: 10px;" :disabled="loading">
            <template v-if="!loading">
              Créer mon compte <lucide-icon name="user-plus" />
            </template>
            <template v-else>
              <div class="spinner"></div> Création en cours...
            </template>
          </button>
        </form>

        <div class="auth-footer-v2">
          <span>Déjà parmi nous ?</span>
          <a @click="$emit('navigate', 'login')">Se connecter</a>
        </div>
      </div>
    </div>
  `
}
