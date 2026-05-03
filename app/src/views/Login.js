// app/src/views/Login.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['login', 'navigate'],
  components: { LucideIcon },
  data() { return { email: '', password: '', loading: false, loadingGoogle: false, showPassword: false } },
  methods: {
    async handleSubmit() {
      this.loading = true;
      this.$emit('login', {
        email: this.email, 
        password: this.password,
        onComplete: () => this.loading = false
      });
    },
    handleGoogleSubmit() {
      this.loadingGoogle = true;
      this.$emit('google-login');
    }
  },
  template: `
    <div class="auth-container-v2">
      <div class="auth-glow-card glass-card">
        <div class="auth-header-v2">
          <h2 class="gradient-text">Connexion</h2>
          <p>Heureux de vous revoir sur Gbé Tché.</p>
        </div>

        <form @submit.prevent="handleSubmit">
          <div class="auth-field-group">
            <label class="auth-label">ADRESSE EMAIL</label>
            <div class="input-wrapper-v2">
              <lucide-icon name="mail" />
              <input type="email" v-model="email" class="input-v2" placeholder="Ex: eudes@exemple.com" required />
            </div>
          </div>

          <div class="auth-field-group">
            <label class="auth-label">MOT DE PASSE</label>
            <div class="input-wrapper-v2">
              <lucide-icon name="lock" />
              <input :type="showPassword ? 'text' : 'password'" v-model="password" class="input-v2" placeholder="Votre secret" required />
              <button type="button" class="eye-btn" @click="showPassword = !showPassword">
                <lucide-icon :name="showPassword ? 'eye-off' : 'eye'" />
              </button>
            </div>
            <div style="text-align: right; margin-top: 8px;">
              <a class="small-link" @click="$emit('navigate', 'forgot-password')">Mot de passe oublié ?</a>
            </div>
          </div>

          <button type="submit" class="btn-auth-premium" :disabled="loading || loadingGoogle">
            <template v-if="!loading">
              Accéder à mon compte <lucide-icon name="arrow-right" />
            </template>
            <template v-else>
              <div class="spinner"></div> Connexion...
            </template>
          </button>

          <div class="divider"><span>OU</span></div>

          <button type="button" @click="handleGoogleSubmit" class="google-btn-v2" :disabled="loading || loadingGoogle">
            <template v-if="!loadingGoogle">
              <img src="https://www.gstatic.com/images/branding/product/1x/gsa_512dp.png" width="18" style="margin-right: 8px;">
              Continuer avec Google
            </template>
            <template v-else>
              <div class="spinner" style="border-top-color: var(--primary);"></div> Redirection...
            </template>
          </button>
        </form>

        <div class="auth-footer-v2">
          <span>Pas encore de compte ?</span>
          <a @click="$emit('navigate', 'register')">Rejoindre la communauté</a>
        </div>
      </div>
    </div>
  `
}
