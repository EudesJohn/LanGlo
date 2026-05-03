// app/src/components/Footer.js
import LucideIcon from './LucideIcon.js'

export default {
  emits: ['navigate', 'notify'],
  components: { LucideIcon },
  data() {
    return {
      emailNewsletter: ''
    }
  },
  methods: {
    handleSocialClick(platform) {
      this.$emit('notify', `Merci de partager Gbé Tché sur ${platform} !`, 'info');
    },
    handleNewsletter() {
      if (!this.emailNewsletter) return;
      this.$emit('notify', "Inscription réussie ! Vous recevrez bientôt nos actualités.");
      this.emailNewsletter = '';
    }
  },
  template: `
    <footer class="footer glass-card">
      <div class="container">
        <div class="footer-grid">
          <div class="footer-brand">
            <h2 class="gradient-text">Gbé Tché</h2>
            <p>Préserver, apprendre et célébrer la richesse de la langue Fon au quotidien.</p>
            <div class="social-links">
              <a href="#" @click.prevent="handleSocialClick('Twitter')"><lucide-icon name="send" :size="18" /></a>
              <a href="#" @click.prevent="handleSocialClick('Facebook')"><lucide-icon name="users" :size="18" /></a>
              <a href="#" @click.prevent="handleSocialClick('Instagram')"><lucide-icon name="camera" :size="18" /></a>
              <a href="#" @click.prevent="handleSocialClick('GitHub')"><lucide-icon name="code-2" :size="18" /></a>
            </div>
          </div>
  
          <div class="footer-links">
            <h4>Navigation</h4>
            <ul>
              <li><a href="#" @click.prevent="$emit('navigate', 'home')">Accueil</a></li>
              <li><a href="#" @click.prevent="$emit('navigate', 'dictionary')">Dictionnaire</a></li>
              <li><a href="#" @click.prevent="$emit('navigate', 'add-word')">Contribuer</a></li>
            </ul>
          </div>
  
          <div class="footer-links">
            <h4>Communauté</h4>
            <ul>
              <li><a href="#" @click.prevent="$emit('navigate', 'about')">À propos</a></li>
              <li><a href="#" @click.prevent="$emit('navigate', 'ethnicities')">Ethnies du Bénin</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
  
          <div class="footer-newsletter">
            <h4>REJOIGNEZ-NOUS</h4>
            <p>Recevez un mot du jour chaque matin par email.</p>
            <form @submit.prevent="handleNewsletter" class="mini-form">
              <input type="email" v-model="emailNewsletter" placeholder="votre@email.com" class="input-field mini" required>
              <button type="submit" class="btn-premium mini"><lucide-icon name="send" :size="16" /></button>
            </form>
          </div>
        </div>
        
        <div class="footer-bottom">
          <p>&copy; 2026 Gbé Tché. Fait avec passion pour le patrimoine béninois.</p>
          <div class="bottom-links">
            <a href="#">Confidentialité</a>
            <a href="#">CGU</a>
          </div>
        </div>
      </div>
    </footer>
  `
}
