// app/src/views/Admin.js

export default {
  props: ['pendingWords'],
  emits: ['approve', 'reject', 'updateWord'],
  data() {
    return {
      editingId: null,
      editForm: { french: '', fon: '' }
    }
  },
  methods: {
    startEdit(word) {
      this.editingId = word.id;
      this.editForm = { ...word };
      setTimeout(() => lucide.createIcons(), 10);
    },
    saveEdit() {
      this.$emit('updateWord', { ...this.editForm });
      this.editingId = null;
    }
  },
  template: `
    <div class="view-admin">
      <div class="section-header">
        <h2>Panel Administration</h2>
        <span class="badge">{{ pendingWords.length }} en attente</span>
      </div>

      <div class="admin-table glass-card">
        <table>
          <thead>
            <tr>
              <th>Français</th>
              <th>Fon</th>
              <th>Phonétique</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in pendingWords" :key="w.id">
              <td>
                <input v-if="editingId === w.id" v-model="editForm.french" class="input-field mini" />
                <span v-else>{{ w.french }}</span>
              </td>
              <td>
                <input v-if="editingId === w.id" v-model="editForm.fon" class="input-field mini" />
                <span v-else>{{ w.fon }}</span>
              </td>
              <td>
                <input v-if="editingId === w.id" v-model="editForm.phonetic" class="input-field mini" />
                <span v-else>{{ w.phonetic }}</span>
              </td>
              <td class="table-actions">
                <template v-if="editingId === w.id">
                  <button @click="saveEdit" class="btn-check"><i data-lucide="save"></i></button>
                  <button @click="editingId = null" class="btn-x"><i data-lucide="x"></i></button>
                </template>
                <template v-else>
                  <button @click="startEdit(w)" class="btn-edit" title="Modifier"><i data-lucide="edit-3"></i></button>
                  <button @click="$emit('approve', w.id)" class="btn-check" title="Approuver"><i data-lucide="check"></i></button>
                  <button @click="$emit('reject', w.id)" class="btn-x" title="Rejeter"><i data-lucide="x"></i></button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="pendingWords.length === 0" class="empty-admin">
          <i data-lucide="check-circle" style="width:48px; height:48px; color: var(--primary)"></i>
          <p>Tous les mots ont été validés !</p>
        </div>
      </div>
    </div>
  `
}
