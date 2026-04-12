// app/src/App.js
import Navbar from './components/Navbar.js'
import Toast from './components/Toast.js'
import Home from './views/Home.js'
import Login from './views/Login.js'
import Register from './views/Register.js'
import Dictionary from './views/Dictionary.js'
import Profile from './views/Profile.js'
import Admin from './views/Admin.js'
import AddWord from './views/AddWord.js'
import ForgotPassword from './views/ForgotPassword.js'

const { ref, onMounted, nextTick } = Vue;

export default {
  components: { Navbar, Home, Login, Register, Dictionary, Profile, Admin, AddWord, ForgotPassword, Toast },
  setup() {
    const currentPage = ref('home');
    const user = ref(JSON.parse(localStorage.getItem('user')) || null);
    const token = ref(localStorage.getItem('token') || null);
    const words = ref([]);
    const favorites = ref([]);
    const pendingWords = ref([]);
    const searchQuery = ref('');
    const notification = ref(null);

    const API = '/api';

    const isNavigating = ref(false);
    const notify = (msg, type = 'success') => {
      notification.value = { msg, type };
      setTimeout(() => notification.value = null, 3000);
    };

    const navigate = (page) => {
      console.log('Navigating to:', page);
      currentPage.value = page;
      nextTick(() => {
        lucide.createIcons();
      });
    };

    const handleSearch = async (q) => {
      try {
        const res = await axios.get(`${API}/dictionary/search?q=${q}`);
        words.value = res.data; 
        searchQuery.value = q;
        if (res.data.length === 0 && q.trim() !== '') {
          notify("Mot non trouvé. Suggérez-le !", "info");
          navigate('add-word');
          return;
        }
        navigate('dictionary');
      } catch (e) {
        notify("Erreur de recherche", "error");
      }
    };

    const handleRegister = async (data) => {
      try {
        const res = await axios.post(`${API}/auth/register`, data);
        if (res.data.success) {
          notify("Compte créé ! Bienvenue dans la communauté.");
          navigate('login');
        }
      } catch (e) { notify("Erreur d'inscription", "error"); }
    };

    const handleLogin = async (creds) => {
      try {
        const res = await axios.post(`${API}/auth/login`, creds);
        if (res.data.success) {
          user.value = res.data.user;
          token.value = res.data.token;
          localStorage.setItem('user', JSON.stringify(user.value));
          localStorage.setItem('token', token.value);
          notify("Ravi de vous revoir, " + user.value.name);
          navigate('home');
          if (user.value.role === 'admin') fetchAdminData();
        } else {
          notify(res.data.message, "error");
        }
      } catch (e) {
        notify("Erreur serveur", "error");
      }
    };

    const adminApprove = async (id) => {
      try {
        await axios.post(`${API}/admin/approve`, { id });
        notify("Mot approuvé !");
        fetchAdminData();
      } catch (e) { notify("Erreur", "error"); }
    };

    const adminReject = async (id) => {
      try {
        await axios.post(`${API}/admin/reject`, { id });
        notify("Mot rejeté");
        fetchAdminData();
      } catch (e) { notify("Erreur", "error"); }
    };

    const handleUpdateProfile = async (newData) => {
      try {
        const res = await axios.post(`${API}/auth/profile-update`, newData);
        if (res.data.success) {
          user.value = res.data.user;
          localStorage.setItem('user', JSON.stringify(user.value));
          notify("Profil mis à jour !");
        }
      } catch (e) { notify("Erreur de mise à jour", "error"); }
    };

    const handleUpdateWord = async (word) => {
      try {
        await axios.post(`${API}/admin/update`, word);
        notify("Mot mis à jour !");
        fetchAdminData();
      } catch (e) { notify("Erreur de mise à jour", "error"); }
    };

    const handleLogout = () => {
      user.value = null;
      token.value = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      notify("Déconnexion réussie");
      navigate('home');
    };

    const fetchAdminData = async (id) => {
      try {
        const res = await axios.get(`${API}/admin/pending`);
        pendingWords.value = res.data;
      } catch (e) {}
    };

    const handleAddWord = async (wordData) => {
      try {
        const res = await axios.post(`${API}/dictionary/add`, wordData);
        if (res.data.success) {
          notify("Merci pour votre contribution ! Elle sera validée bientôt.");
          navigate('home');
        }
      } catch (e) {
        notify("Erreur lors de l'envoi", "error");
      }
    };

    onMounted(() => {
      console.log('App Mounted');
      lucide.createIcons();
      if (window.gsap) {
        gsap.to(".blob-1", { x: 100, y: 50, duration: 20, repeat: -1, yoyo: true });
        gsap.to(".blob-2", { x: -80, y: -40, duration: 25, repeat: -1, yoyo: true });
      }
    });

    return { 
      currentPage, user, words, favorites, pendingWords, searchQuery, notification,
      navigate, handleSearch, handleLogin, handleLogout, notify,
      handleRegister, handleUpdateProfile, adminApprove, adminReject, handleUpdateWord, fetchAdminData,
      handleAddWord
    };
  },
  template: `
    <div class="app-shell">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <toast :notification="notification" />

      <navbar 
        :user="user" 
        :currentPage="currentPage" 
        @navigate="navigate" 
        @logout="handleLogout" 
      />

      <main class="main-content">
        <home v-if="currentPage === 'home'" @search="handleSearch" />
        <dictionary 
          v-if="currentPage === 'dictionary'" 
          :words="words" 
          :query="searchQuery" 
          :favorites="favorites"
          @navigate="navigate"
        />
        <login v-if="currentPage === 'login'" @login="handleLogin" @navigate="navigate" />
        <register v-if="currentPage === 'register'" @register="handleRegister" @navigate="navigate" />
        <forgot-password v-if="currentPage === 'forgot-password'" @navigate="navigate" />
        <profile v-if="currentPage === 'profile'" :user="user" :favorites="[]" @navigate="navigate" @logout="handleLogout" @updateProfile="handleUpdateProfile" />
        <admin v-if="currentPage === 'admin'" :pendingWords="pendingWords" @approve="adminApprove" @reject="adminReject" @updateWord="handleUpdateWord" />
        <add-word v-if="currentPage === 'add-word'" :prefill="searchQuery" @navigate="navigate" @addWord="handleAddWord" />
      </main>
    </div>
  `
}
