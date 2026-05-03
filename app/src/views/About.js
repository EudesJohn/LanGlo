// app/src/views/About.js
import LucideIcon from '../components/LucideIcon.js'

export default {
  emits: ['navigate'],
  components: { LucideIcon },
  template: `
    <div class="about-view pb-60">
      <div class="container">
        <header class="about-hero">
          <h1 class="gradient-text">L'Odyssée Gbé Tché</h1>
          <p>Plus qu'un dictionnaire, un sanctuaire pour la langue Fon.</p>
        </header>

        <section class="about-section glass-card">
          <div class="section-icon"><lucide-icon name="heart" /></div>
          <h3>Notre Mission</h3>
          <p>
            La langue Fon (Gbé) est le battement de cœur du Bénin. <strong>Gbé Tché</strong> a été conçu pour préserver 
            cette richesse linguistique à l'ère du numérique. Notre mission est de construire le pont entre 
            les traditions orales de nos ancêtres et la technologie moderne.
          </p>
        </section>

        <div class="about-grid">
          <div class="about-card glass-card">
            <lucide-icon name="users" />
            <h4>Collaboratif</h4>
            <p>Chaque mot, chaque expression est le fruit d'une contribution communautaire validée par des experts.</p>
          </div>
          <div class="about-card glass-card">
            <lucide-icon name="mic" />
            <h4>Authentique</h4>
            <p>Nous intégrons des enregistrements audio pour capturer la sonorité exacte et la mélodie du Fon.</p>
          </div>
          <div class="about-card glass-card">
            <lucide-icon name="shield-check" />
            <h4>Patrimoine</h4>
            <p>En numérisant notre langue, nous assurons qu'elle ne s'efface jamais des mémoires futures.</p>
          </div>
        </div>

        <section class="about-section glass-card alt">
          <h3>Pourquoi Gbé Tché ?</h3>
          <p>
            "Gbé Tché" signifie "Ma Langue". C'est un cri de fierté et un engagement envers notre culture. 
            Dans un monde globalisé, il est vital de posséder des outils qui nous permettent de parler 
            notre langue maternelle avec précision et fierté. Que vous soyez un étudiant, un curieux 
            ou un locuteur natif, Gbé Tché est votre compagnon.
          </p>
          <div class="cta-wrapper" style="margin-top: 30px;">
            <button @click="$emit('navigate', 'add-word')" class="btn-premium">
              Devenir contributeur <lucide-icon name="plus" />
            </button>
          </div>
        </section>

        <footer class="about-footer">
          <p>Développé avec ❤️ pour la communauté Fon.</p>
        </footer>
      </div>
    </div>
  `
}
