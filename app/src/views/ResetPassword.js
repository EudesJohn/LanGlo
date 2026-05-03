// app/src/views/ResetPassword.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['reset-password', 'navigate'],
  components: { LucideIcon },
  data() { 
    return { 
      password: '', 
      confirmPassword: '', 
      showPassword: false,
      loading: false 
    } 
  },
  methods: {
    async handleSubmit() {
      if (this.password !== this.confirmPassword) {
        alert("Les mots de passe ne correspondent pas !");
        return;
      }
      this.loading = true;
      this.$emit('reset-password', {
        password: this.password,
        onComplete: () => this.loading = false
      });
    }
  },
  template: `
    <div class="auth-container-v2">
      <div class="auth-glow-card glass-card">
        <div class="auth-header-v2">
          <h2 class="gradient-text">Nouveau Mot de Passe</h2>
          <p>Sécurisez votre compte avec un nouveau secret.</p>
        </div>

        <form @submit.prevent="handleSubmit">
            <div class="auth-field-group">
              <label class="auth-label">NOUVEAU MOT DE PASSE</label>
              <div class="input-wrapper-v2">
                <lucide-icon name="lock" />
                <input :type="showPassword ? 'text' : 'password'" v-model="password" class="input-v2" placeholder="Minimum 6 caractères" required />
                <button type="button" class="eye-btn" @click="showPassword = !showPassword">
                  <lucide-icon :name="showPassword ? 'eye-off' : 'eye'" />
                </button>
              </div>
            </div>

          <div class="auth-field-group">
            <label class="auth-label">CONFIRMER LE MOT DE PASSE</label>
            <div class="input-wrapper-v2">
              <lucide-icon name="shield-check" />
              <input :type="showPassword ? 'text' : 'password'" v-model="confirmPassword" class="input-v2" placeholder="Répéter le mot de passe" required />
            </div>
          </div>

          <button type="submit" class="btn-auth-premium" :disabled="loading">
            <template v-if="!loading">
              Mettre à jour le mot de passe <lucide-icon name="check-circle" />
            </template>
            <template v-else>
              <div class="spinner"></div> Mise à jour...
            </template>
          </button>
        </form>

        <div class="auth-footer-v2">
          <a @click="$emit('navigate', 'login')">Retour à la connexion</a>
        </div>
      </div>
    </div>
  `
}
