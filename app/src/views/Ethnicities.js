// app/src/views/Ethnicities.js

export default {
  emits: ['navigate'],
  template: `
    <div class="about-view pb-60">
      <div class="container">
        <header class="about-hero">
          <h1 class="gradient-text">La Mosaïque du Bénin</h1>
          <p>Un pays, une multitude de cultures liées par l'histoire.</p>
        </header>

        <section class="about-section glass-card">
          <h3>L'Unité dans la Diversité</h3>
          <p>
            Le Bénin est riche de plus de 40 groupes ethniques, chacun apportant sa propre mélodie à l'identité nationale. 
            Gbé Tché met en avant le Fon, mais reconnaît la splendeur de toutes nos origines.
          </p>
        </section>

        <div class="ethnic-grid">
          <div class="ethnic-card glass-card">
            <h4>Les Fon</h4>
            <span class="ethnic-region">Sud & Centre</span>
            <p>Le plus grand groupe ethnique du pays, héritiers du prestigieux Royaume de Dahomey.</p>
          </div>
          <div class="ethnic-card glass-card">
            <h4>Les Yoruba (Nago)</h4>
            <span class="ethnic-region">Sud-Est</span>
            <p>Une culture rayonnante partagée avec le Nigéria voisin, célèbre pour ses traditions et son art.</p>
          </div>
          <div class="ethnic-card glass-card">
            <h4>Les Bariba</h4>
            <span class="ethnic-region">Nord</span>
            <p>Peuple guerrier et cavalier du Nikki, fiers gardiens des traditions du septentrion.</p>
          </div>
          <div class="ethnic-card glass-card">
            <h4>Les Adja / Goun</h4>
            <span class="ethnic-region">Sud-Ouest</span>
            <p>Bâtisseurs de cités historiques comme Porto-Novo, connus pour leur organisation sociale raffinée.</p>
          </div>
          <div class="ethnic-card glass-card">
            <h4>Les Somba (Ditammari)</h4>
            <span class="ethnic-region">Atacora</span>
            <p>Célèbres pour leurs "Tata Somba", d'admirables forteresses en terre uniques au monde.</p>
          </div>
        </div>

        <footer class="about-footer">
          <p>Quelle est votre ethnie ? Complétez votre profil pour nous aider à catégoriser les expressions !</p>
          <button @click="$emit('navigate', 'profile')" class="btn-premium mini" style="margin-top:20px;">Mon Profil</button>
        </footer>
      </div>
    </div>
  `
}
