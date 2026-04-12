// app/src/views/Login.js

export default {
  emits: ['login', 'navigate'],
  data() { return { email: '', password: '' } },
  template: `
    <div class="view-auth">
      <div class="auth-card glass-card">
        <h2>Connexion</h2>
        <p>Accédez à vos favoris et contribuez au dictionnaire Gbé Tché.</p>
        <form @submit.prevent="$emit('login', {email, password})">
          <div class="form-group">
            <label>Email</label>
            <input type="email" v-model="email" class="input-field" required />
          </div>
          <div class="form-group">
            <label>Mot de passe</label>
            <input type="password" v-model="password" class="input-field" required />
            <div style="text-align: right; margin-top: 5px;">
              <a class="small-link" @click="$emit('navigate', 'forgot-password')">Mot de passe oublié ?</a>
            </div>
          </div>
          <button type="submit" class="btn-premium wide">Se connecter</button>

          <div class="divider"><span>OU</span></div>

          <button type="button" class="btn-outline wide google-btn">
            <i data-lucide="mail"></i> Continuer avec Google
          </button>
        </form>
        <p class="auth-footer">Pas encore de compte ? <a @click="$emit('navigate', 'register')">S'inscrire</a></p>
      </div>
    </div>
  `
}
