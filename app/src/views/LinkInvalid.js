// app/src/views/LinkInvalid.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['navigate'],
  components: { LucideIcon },
  template: `
    <div class="auth-container-v2">
      <div class="auth-glow-card glass-card">
        <div class="auth-header-v2" style="color: #ff4b4b;">
          <lucide-icon name="alert-circle" :size="64" />
          <h2 class="gradient-text" style="--primary: #ff4b4b; --secondary: #ff9d9d;">Lien Non Valide</h2>
          <p>Désolé, ce lien de récupération a expiré ou a déjà été utilisé.</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="opacity: 0.6; font-size: 0.95rem; line-height: 1.6;">
            Pour des raisons de sécurité, les liens de réinitialisation ne sont valables que 24 heures et pour une seule utilisation.
          </p>
        </div>

        <button @click="$emit('navigate', 'forgot-password')" class="btn-auth-premium" style="background: linear-gradient(135deg, #ff4b4b, #ff8181);">
          Demander un nouveau lien <lucide-icon name="refresh-cw" :size="16" />
        </button>

        <div class="auth-footer-v2">
          <a @click="$emit('navigate', 'login')">Retour à la connexion</a>
        </div>
      </div>
    </div>
  `
}
