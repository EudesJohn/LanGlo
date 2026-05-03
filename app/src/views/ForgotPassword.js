// app/src/views/ForgotPassword.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['navigate', 'submit'],
  components: { LucideIcon },
  data() {
    return {
      email: '',
      submitted: false,
      loading: false
    }
  },
  methods: {
    async handleSubmit() {
      this.loading = true;
      this.$emit('submit', this.email);
      // Logic for transition (handled in App.js)
      setTimeout(() => {
        this.loading = false;
        this.submitted = true;
      }, 800);
    }
  },
  template: `
    <div class="auth-container-v2">
      <div class="auth-glow-card glass-card">
        <template v-if="!submitted">
          <div class="auth-header-v2">
            <h2 class="gradient-text">Récupération</h2>
            <p>On va vous aider à retrouver votre accès en un éclair.</p>
          </div>
          
          <form @submit.prevent="handleSubmit">
            <div class="input-wrapper-v2">
              <lucide-icon name="mail" />
              <input type="email" v-model="email" class="input-v2" placeholder="Votre email de secours" required />
            </div>
            
            <button type="submit" class="btn-auth-premium" :disabled="loading">
              <span v-if="!loading">Envoyer le lien magique <lucide-icon name="sparkles" /></span>
              <span v-else>Envoi en cours...</span>
            </button>
          </form>
        </template>

        <template v-else>
          <div class="success-state" style="text-align: center; padding: 20px 0;">
            <div class="success-icon-wrapper" style="margin-bottom: 30px; width: 100px; height: 100px; font-size: 2.5rem;">
              <lucide-icon name="mail-check" :size="48" />
            </div>
            <h2 style="font-size: 2.2rem; margin-bottom: 15px;">Vérifiez votre boîte !</h2>
            <p style="opacity: 0.6; margin-bottom: 35px; line-height: 1.6;">
              Un lien de réinitialisation vient d'être envoyé à <br><b>{{ email }}</b>.
            </p>
            <button @click="$emit('navigate', 'login')" class="btn-outline wide" style="border-radius: 15px;">
              <lucide-icon name="arrow-left" /> Retour à la connexion
            </button>
          </div>
        </template>
        
        <div v-if="!submitted" class="auth-footer-v2">
          <a @click="$emit('navigate', 'login')" style="display: flex; align-items: center; justify-content: center; gap: 8px;">
            <lucide-icon name="chevron-left" /> Retour à la connexion
          </a>
        </div>
      </div>
    </div>
  `
}
