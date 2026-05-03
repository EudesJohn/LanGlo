// app/src/components/LucideIcon.js

const { ref, onMounted, watch, nextTick, computed } = Vue;

export default {
  props: {
    name: {
      type: String,
      required: true
    },
    size: {
      type: [Number, String],
      default: 20
    },
    className: {
      type: String,
      default: ''
    }
  },
  setup(props) {
    const iconTarget = ref(null);

    const renderIcon = () => {
      if (window.lucide && iconTarget.value) {
        lucide.createIcons({
          root: iconTarget.value
        });
      }
    };

    onMounted(renderIcon);
    
    // Re-render if the icon name changes
    watch(() => props.name, () => {
      nextTick(renderIcon);
    });

    // We use a computed for the initial raw HTML to prevent Vue 
    // from tracking the <i> tag once Lucide replaces it.
    const rawHtml = computed(() => {
      return `<i data-lucide="${props.name}" class="${props.className}" style="width: ${props.size}px; height: ${props.size}px;"></i>`;
    });

    return { iconTarget, rawHtml };
  },
  template: `<span ref="iconTarget" v-html="rawHtml" style="display: inline-flex; align-items: center; justify-content: center;"></span>`
};
