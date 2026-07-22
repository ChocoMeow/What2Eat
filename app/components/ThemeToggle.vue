<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggle() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-sm font-medium text-ink transition-colors duration-200 ease-smooth hover:border-teal"
    :aria-label="isDark ? $t('nav.light') : $t('nav.dark')"
    @click="toggle"
  >
    <span class="relative size-4" aria-hidden="true">
      <svg
        v-if="isDark"
        class="size-4 text-saffron"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
      <svg
        v-else
        class="size-4 text-teal"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M21 14.5A8.5 8.5 0 1 1 12.5 3a6.5 6.5 0 0 0 8.5 11.5z" />
      </svg>
    </span>
    <span class="hidden sm:inline">{{ isDark ? $t('nav.light') : $t('nav.dark') }}</span>
  </button>
</template>
