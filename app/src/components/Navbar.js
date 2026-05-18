// app/src/components/Navbar.js
import LucideIcon from './LucideIcon.js'

export default {
  props: ['user', 'currentPage', 'isProfileComplete'],
  emits: ['navigate', 'logout', 'search'],
  components: { LucideIcon },
  data() {
    return {
      isMenuOpen: false
    }
  },
  methods: {
    handleNav(page) {
      this.isMenuOpen = false;
      this.$emit('navigate', page);
    }
  },
  template: `
    <header class="navbar glass-card">
      <div class="container navbar-inner">
        <div class="logo clickable" @click="handleNav('home')">
          <span class="gradient-text">Gbé Tché</span>
        </div>
        
        <!-- MOBILE HAMBURGER -->
        <button class="mobile-toggle" @click="isMenuOpen = !isMenuOpen">
          <lucide-icon v-if="!isMenuOpen" name="menu" />
          <lucide-icon v-else name="x" />
        </button>
  
        <nav class="nav-links" :class="{ 'mobile-open': isMenuOpen }">
          <button @click="$emit('search', ''); isMenuOpen = false" class="nav-btn">
            <lucide-icon name="book-open" /> <span>Dictionnaire</span>
          </button>
          <template v-if="user">
            <button v-if="user?.fon_level === 'Intermediaire' || user?.fon_level === 'Avancé'" @click="handleNav('add-word')" class="nav-btn">
              <lucide-icon name="plus" /> <span>Suggérer</span>
            </button>
            <button v-if="user?.role === 'admin'" @click="handleNav('admin')" class="nav-btn admin-btn">
              <lucide-icon name="shield" /> <span>Admin</span>
            </button>
            <button @click="handleNav('profile')" class="nav-btn user-profile-btn">
               <img v-if="user.avatar_url" :src="user.avatar_url" class="nav-avatar" />
               <lucide-icon v-else name="user" /> 
               <span class="user-name-nav">{{ user.pseudo || user.name }}</span>
            </button>
            <button @click="$emit('logout'); isMenuOpen = false" class="logout-btn">
              <lucide-icon name="log-out" /> <span class="logout-text">Déconnexion</span>
            </button>
          </template>
          
          <button v-if="!user" @click="handleNav('login')" class="btn-premium">
            <lucide-icon name="log-in" /> Connexion
          </button>
        </nav>
      </div>
    </header>
  `
}
