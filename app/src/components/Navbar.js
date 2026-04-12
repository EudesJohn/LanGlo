// app/src/components/Navbar.js

export default {
  props: ['user', 'currentPage'],
  emits: ['navigate', 'logout'],
  template: `
    <header class="navbar glass-card">
      <div class="logo clickable" @click="$emit('navigate', 'home')">
        <span class="gradient-text">Gbé Tché</span>
      </div>
      
      <nav class="nav-links">
        <button v-if="user" @click="$emit('navigate', 'add-word')" class="nav-btn">
          <i data-lucide="plus"></i> Suggérer
        </button>
        <button v-if="user?.role === 'admin'" @click="$emit('navigate', 'admin')" class="nav-btn admin-btn">
          <i data-lucide="shield"></i> Admin
        </button>
        <button v-if="user" @click="$emit('navigate', 'profile')" class="nav-btn">
          <i data-lucide="user"></i> {{ user.name }}
        </button>
        <button v-if="!user" @click="$emit('navigate', 'login')" class="btn-premium">
          <i data-lucide="log-in"></i> Connexion
        </button>
        <button v-else @click="$emit('logout')" class="logout-btn">
          <i data-lucide="log-out"></i>
        </button>
      </nav>
    </header>
  `
}
