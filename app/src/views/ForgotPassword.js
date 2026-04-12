// d:/Dico Fon/app/src/views/ForgotPassword.js

export default {
  emits: ['navigate'],
  data() {
    return {
      email: '',
      submitted: false
    }
  },
  template: `
    <div class="view-auth page-animate">
      <div class="auth-card glass-card">
        <template v-if="!submitted">
          <h2>Récupération</h2>
          <p>On va vous aider à retrouver votre accès.</p>
          
          <form @submit.prevent="submitted = true">
            <div class="form-group">
              <label><i data-lucide="mail"></i> Votre Email</label>
              <input type="email" v-model="email" class="input-field" placeholder="exemple@mail.com" required />
            </div>
            <button type="submit" class="btn-premium wide">Recevoir le lien magique</button>
          </form>
        </template>
        <template v-else>
          <div class="success-state page-animate">
            <div class="success-icon-wrapper">
              <i data-lucide="send" size="48"></i>
            </div>
            <h2>Email envoyé !</h2>
            <p>Vérifiez votre boîte mail <b>{{ email }}</b>.</p>
            <button @click="$emit('navigate', 'login')" class="btn-premium wide">
              <i data-lucide="arrow-left"></i> Retour à la connexion
            </button>
          </div>
        </template>
        
        <p v-if="!submitted" class="auth-footer">
          <a @click="$emit('navigate', 'login')"><i data-lucide="chevron-left"></i> Retour</a>
        </p>
      </div>
    </div>
  `
}
