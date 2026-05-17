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
import ResetPassword from './views/ResetPassword.js'
import LinkInvalid from './views/LinkInvalid.js'
import About from './views/About.js'
import Ethnicities from './views/Ethnicities.js'
import Footer from './components/Footer.js'
import LucideIcon from './components/LucideIcon.js'

const { ref, onMounted, nextTick, computed } = Vue;

export default {
  components: { Navbar, Home, Login, Register, Dictionary, Profile, Admin, AddWord, ForgotPassword, ResetPassword, LinkInvalid, About, Ethnicities, Toast, AppFooter: Footer, LucideIcon },
  setup() {
    const currentPage = ref('home');
    const user = ref(JSON.parse(localStorage.getItem('user')) || null);
    const token = ref(localStorage.getItem('token') || null);
    const words = ref([]);
    const favorites = ref([]);
    const pendingWords = ref([]);
    const allWords = ref([]);
    const searchQuery = ref('');
    const stats = ref({ words: 0, contributors: 0 });
    const notification = ref(null);
    const navbarKey = ref(0);

    const API = '/api';
    const supabaseClient = ref(null);

    const initSupabase = async () => {
      try {
        console.log("Fetching Supabase config...");
        const res = await axios.get(`${API}/config/supabase`);
        const { supabaseUrl, supabaseAnonKey } = res.data;
        if (!supabaseUrl || !supabaseAnonKey) throw new Error("Credentials missing from API response");
        supabaseClient.value = supabase.createClient(supabaseUrl, supabaseAnonKey);
        console.log("✅ Supabase initialized successfully");
        return true;
      } catch (e) {
        console.error("❌ Failed to initialize Supabase:", e);
        notify("Erreur de connexion à la base de données", "error");
        return false;
      }
    };

    const isProfileComplete = computed(() => {
      if (!user.value) return true;
      return Boolean(user.value.nationality && user.value.ethnicity && String(user.value.nationality).trim() !== '' && String(user.value.ethnicity).trim() !== '');
    });

    const notify = (msg, type = 'success') => {
      notification.value = { msg, type };
      setTimeout(() => notification.value = null, 3000);
    };

    const navigate = (page) => {
      const isAdmin = user.value?.role === 'admin';
      if (user.value && !isProfileComplete.value && page !== 'profile' && !isAdmin) {
        notify("Veuillez compléter votre profil pour continuer", "info");
        currentPage.value = 'profile';
      } else {
        currentPage.value = page;
        if (page === 'admin') fetchAdminData();
        navbarKey.value++;
      }
    };

    const handleGoogleLogin = async (data) => {
      console.log("handleGoogleLogin triggered");
      try {
        if (!supabaseClient.value) await initSupabase();
        if (!supabaseClient.value) {
          notify("Erreur d'initialisation Supabase. Vérifiez votre connexion.", "error");
          if (data && data.onComplete) data.onComplete();
          return;
        }
        
        const { error } = await supabaseClient.value.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              access_type: 'offline',
              prompt: 'select_account',
            },
          }
        });
        if (error) throw error;
      } catch (e) {
        console.error("Google Login Error:", e);
        notify("Erreur de connexion Google : " + (e.message || "Inconnue"), "error");
      } finally {
        if (data && data.onComplete) data.onComplete();
      }
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
        } else {
          notify(res.data.message || "Erreur lors de l'inscription", "error");
        }
      } catch (e) {
        notify(e.response?.data?.message || "Erreur d'inscription", "error");
      } finally {
        if (data.onComplete) data.onComplete();
      }
    };

    const handleLogin = async (creds) => {
      try {
        const res = await axios.post(`${API}/auth/login`, creds);
        if (res.data.success) {
          user.value = res.data.user;
          token.value = res.data.token;
          localStorage.setItem('user', JSON.stringify(user.value));
          localStorage.setItem('token', token.value);
          navbarKey.value++;
          notify("Ravi de vous revoir, " + user.value.name);
          navigate('home');
          if (user.value.role === 'admin') fetchAdminData();
        } else {
          notify(res.data.message, "error");
        }
      } catch (e) {
        notify("Erreur serveur", "error");
      } finally {
        if (creds.onComplete) creds.onComplete();
      }
    };

    const adminApprove = async (id) => {
      try {
        const res = await axios.post(`${API}/admin/approve`, { id });
        notify(res.data.message || "Mot approuvé !");
        fetchAdminData();
      } catch (e) { 
        const errMsg = e.response?.data?.message || "Erreur de validation";
        notify(errMsg, "error"); 
      }
    };

    const adminDelete = async (id) => {
      if (!confirm("Supprimer définitivement ce mot ?")) return;
      try {
        const res = await axios.post(`${API}/admin/delete`, { id });
        notify(res.data.message || "Mot supprimé !");
        fetchAdminData();
      } catch (e) { 
        const errMsg = e.response?.data?.message || "Erreur lors de la suppression";
        notify(errMsg, "error"); 
      }
    };

    const handleUpdateProfile = async (newData) => {
      try {
        // Try direct update first (more reliable with RLS if session exists)
        // If there is an avatar to upload, we MUST use the backend API
        if (supabaseClient.value && user.value && !newData.avatar_base64) {
          const cleanData = {
            name: newData.name,
            pseudo: newData.pseudo || null,
            nationality: newData.nationality || "Béninoise",
            ethnicity: newData.ethnicity || "Fon",
            avatar_url: newData.avatar_url || user.value.avatar_url || null
          };
          
          console.log("Attempting Direct Update:", cleanData);

          const { data: updatedUser, error } = await supabaseClient.value
            .from('users')
            .update(cleanData)
            .eq('id', user.value.id)
            .select()
            .single();
          
          if (error) {
            console.warn("Direct Update failed, falling back to API. Error:", error.message);
          } else if (updatedUser) {
            user.value = { ...user.value, ...updatedUser };
            localStorage.setItem('user', JSON.stringify(user.value));
            navbarKey.value++;
            notify("Profil mis à jour !");
            if (newData.onSuccess) newData.onSuccess();
            return;
          }
        }

        // Fallback to API (handles avatars and backend syncing)
        console.log("Calling Profile Update API...");
        const res = await axios.post(`${API}/auth/profile-update`, {
          id: user.value?.id,
          email: user.value?.email,
          ...newData
        });
        
        if (res.data.success) {
          user.value = res.data.user;
          localStorage.setItem('user', JSON.stringify(user.value));
          navbarKey.value++;
          notify("Profil mis à jour !");
          if (newData.onSuccess) newData.onSuccess();
        } else {
          throw new Error(res.data.message || "Erreur inconnue");
        }
      } catch (e) { 
        console.error("Profile update error:", e);
        const detail = e.response?.data?.details || e.message;
        notify("Échec de la mise à jour : " + detail, "error"); 
        if (newData.onError) newData.onError();
      }
    };


    const handleUpdateWord = async (word) => {
      try {
        await axios.post(`${API}/admin/update`, word);
        notify("Mot mis à jour !");
        fetchAdminData();
      } catch (e) { 
        const errMsg = e.response?.data?.message || "Erreur de mise à jour";
        notify(errMsg, "error"); 
      }
    };

    const handleLogout = () => {
      user.value = null;
      token.value = null;
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navbarKey.value++;
      notify("Déconnexion réussie");
      navigate('home');
    };

    const fetchAdminData = async () => {
      try {
        const [pendingRes, allRes] = await Promise.all([
          axios.get(`${API}/admin/pending`),
          axios.get(`${API}/admin/all`)
        ]);
        pendingWords.value = pendingRes.data;
        allWords.value = allRes.data;
      } catch (e) {
        console.error("Erreur de chargement Admin:", e);
      }
    };

    const handleAddWord = async (wordData) => {
      try {
        const res = await axios.post(`${API}/dictionary/add`, {
          ...wordData,
          added_by: user.value?.id || null
        });
        if (res.data.success) {
          notify("Merci pour votre contribution ! Elle sera validée bientôt.");
          navigate('home');
        }
      } catch (e) {
        const errorMsg = e.response?.data?.message || "Erreur lors de l'envoi";
        notify(errorMsg, "error");
        console.error("Détails de l'erreur API:", e.response?.data || e.message);
      } finally {
        if (wordData.onComplete) wordData.onComplete();
      }
    };

    const handleForgotPassword = async (email) => {
      try {
        const res = await axios.post(`${API}/auth/forgot-password`, { email });
        if (res.data.success) {
          notify(res.data.message);
        }
      } catch (e) {
        notify("Erreur lors de la demande", "error");
      }
    };

    const handleResetPassword = async (data) => {
      try {
        if (!supabaseClient.value) await initSupabase();
        const { error } = await supabaseClient.value.auth.updateUser({ password: data.password });
        if (error) throw error;
        notify("Mot de passe mis à jour ! Vous pouvez maintenant vous connecter.");
        navigate('login');
      } catch (e) {
        notify(e.message || "Erreur lors de la mise à jour", "error");
      } finally {
        if (data.onComplete) data.onComplete();
      }
    };

    onMounted(async () => {
      console.log('App Mounted');
      
      // Check for LocalStorage access
      try {
        localStorage.setItem('test', '1');
        localStorage.removeItem('test');
      } catch (e) {
        notify("Le stockage local est bloqué par votre navigateur. La connexion pourrait ne pas fonctionner.", "error");
        console.error("LocalStorage is blocked:", e);
      }

      await initSupabase();

      // Check for Recovery Link (Password Reset)
      const hash = window.location.hash;
      if (hash.includes('type=recovery')) {
        if (hash.includes('error=')) {
          navigate('link-invalid');
        } else {
          navigate('reset-password');
          notify("Veuillez saisir votre nouveau mot de passe.", "info");
        }
      }

      // Check for Supabase Session (OAuth)
      const { data: { session } } = await supabaseClient.value.auth.getSession();
      if (session) {
        const authUser = session.user;

        // Initial user object (cached or fresh)
        if (!user.value) {
          user.value = {
            ...authUser,
            ...authUser.user_metadata,
            name: authUser.user_metadata.full_name || authUser.user_metadata.name,
            role: 'user'
          };
        }

        // Sync full profile from database (Source of Truth)
        const { data: dbUser } = await supabaseClient.value
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .single();

        if (dbUser) {
          if (user.value.role !== dbUser.role) navbarKey.value++;
          user.value = {
            ...user.value,
            ...dbUser
          };
        } else {
          // If the user is new (not in public.users), create them automatically
          await supabaseClient.value.from('users').insert([{
            id: authUser.id,
            email: authUser.email,
            name: user.value.name,
            role: 'user'
          }]);
        }

        localStorage.setItem('user', JSON.stringify(user.value));
        localStorage.setItem('token', session.access_token);

        if (user.value.role === 'admin') fetchAdminData();

        // Check if profile needs completion
        if (!isProfileComplete.value) {
          navigate('profile');
          notify("Merci de compléter vos informations !", "info");
        }
      }

      if (window.gsap) {
        gsap.to(".blob-1", { x: 100, y: 50, duration: 20, repeat: -1, yoyo: true });
        gsap.to(".blob-2", { x: -80, y: -40, duration: 25, repeat: -1, yoyo: true });
      }

      // Fetch Global Stats
      if (supabaseClient.value) {
        try {
          const [wCount, uCount] = await Promise.all([
            supabaseClient.value.from('words').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
            supabaseClient.value.from('users').select('id', { count: 'exact', head: true })
          ]);
          
          if (wCount.error) console.error("Words fetch error:", wCount.error);
          if (uCount.error) console.error("Users fetch error:", uCount.error);
          
          stats.value = { 
            words: wCount.count || 0, 
            contributors: uCount.count || 0 
          };
          console.log("Stats loaded:", stats.value);
        } catch (e) { 
          console.error("Stats fetching exception:", e); 
        }
      }
    });

    return {
      currentPage, user, words, favorites, pendingWords, allWords, searchQuery, notification, stats, navbarKey,
      navigate, handleSearch, handleLogin, handleLogout, notify, isProfileComplete,
      handleRegister, handleUpdateProfile, adminApprove, adminDelete, handleUpdateWord, fetchAdminData,
      handleAddWord, handleForgotPassword, handleGoogleLogin, handleResetPassword
    };
  },
  template: `
    <div class="app-shell">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>

      <toast :notification="notification" />

      <navbar 
        :key="navbarKey"
        :user="user" 
        :currentPage="currentPage" 
        :isProfileComplete="isProfileComplete"
        @navigate="navigate" 
        @logout="handleLogout" 
      />

      <main class="main-content">
        <home v-if="currentPage === 'home'" :stats="stats" @search="handleSearch" />
        <dictionary 
          v-if="currentPage === 'dictionary'" 
          :words="words" 
          :query="searchQuery" 
          :favorites="favorites"
          @navigate="navigate"
        />
        <login v-if="currentPage === 'login'" @login="handleLogin" @google-login="handleGoogleLogin" @navigate="navigate" />
        <register v-if="currentPage === 'register'" @register="handleRegister" @navigate="navigate" />
        <forgot-password v-if="currentPage === 'forgot-password'" @submit="handleForgotPassword" @navigate="navigate" />
        <reset-password v-if="currentPage === 'reset-password'" @reset-password="handleResetPassword" @navigate="navigate" />
        <link-invalid v-if="currentPage === 'link-invalid'" @navigate="navigate" />
        <profile v-if="currentPage === 'profile'" :user="user" :favorites="favorites" @navigate="navigate" @logout="handleLogout" @updateProfile="handleUpdateProfile" />
        <admin v-if="currentPage === 'admin'" :pendingWords="pendingWords" :allWords="allWords" @approve="adminApprove" @delete="adminDelete" @updateWord="handleUpdateWord" @refresh="fetchAdminData" />
        <add-word v-if="currentPage === 'add-word'" :prefill="searchQuery" @navigate="navigate" @addWord="handleAddWord" />
        <about v-if="currentPage === 'about'" @navigate="navigate" />
        <ethnicities v-if="currentPage === 'ethnicities'" @navigate="navigate" />
      </main>

      <app-footer @navigate="navigate" @notify="notify" />
    </div>
  `
}
