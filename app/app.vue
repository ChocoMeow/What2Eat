<script setup lang="ts">
type AppLocale = 'en' | 'zh-HK'

const saved = useCookie<AppLocale | null>('what2eat_lang')
const { locale, setLocale } = useI18n()

if (saved.value === 'en' || saved.value === 'zh-HK') {
  setLocale(saved.value)
}

watch(locale, (code) => {
  if (code === 'en' || code === 'zh-HK') saved.value = code
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
