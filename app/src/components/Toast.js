// app/src/components/Toast.js

export default {
  props: ['notification'],
  template: `
    <transition name="toast-anim">
      <div v-if="notification" :class="['toast-msg', notification.type]">
        {{ notification.msg }}
      </div>
    </transition>
  `
}
