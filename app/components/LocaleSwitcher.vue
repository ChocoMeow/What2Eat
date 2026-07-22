<script setup lang="ts">
const { locale, setLocale } = useI18n()

function switchTo(code: 'en' | 'zh-HK') {
  setLocale(code)
}
</script>

<template>
  <div
    class="inline-flex items-center gap-0.5 rounded-lg border border-line bg-surface p-0.5"
    role="group"
    :aria-label="$t('nav.language')"
  >
    <button
      type="button"
      class="rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-200 ease-smooth"
      :class="
        locale === 'zh-HK'
          ? 'bg-teal text-white'
          : 'text-muted hover:text-ink'
      "
      :aria-pressed="locale === 'zh-HK'"
      @click="switchTo('zh-HK')"
    >
      繁
    </button>
    <button
      type="button"
      class="rounded-md px-2.5 py-1 text-sm font-medium transition-colors duration-200 ease-smooth"
      :class="
        locale === 'en'
          ? 'bg-teal text-white'
          : 'text-muted hover:text-ink'
      "
      :aria-pressed="locale === 'en'"
      @click="switchTo('en')"
    >
      EN
    </button>
  </div>
</template>
