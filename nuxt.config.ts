import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: ['@nuxtjs/i18n', '@nuxtjs/color-mode'],

  nitro: {
    preset: 'bun',
    esbuild: {
      options: {
        drop: process.env.NODE_ENV === 'production' ? ['console'] : [],
      },
    },
  },

  app: {
    head: {
      title: '食咩好',
      htmlAttrs: { lang: 'zh-HK' },
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'preconnect',
          href: 'https://fonts.gstatic.com',
          crossorigin: '',
        },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700&family=Figtree:wght@400;500;600;700&display=swap',
        },
        { rel: 'icon', type: 'image/webp', href: '/icons/icon_144x144.webp' },
        { rel: 'apple-touch-icon', href: '/icons/icon_144x144.webp' },
      ],
      meta: [
        {
          name: 'description',
          content: '用 AI 幫你喺任何地方搵食。',
        },
      ],
    },
  },

  i18n: {
    locales: [
      { code: 'zh-HK', language: 'zh-HK', name: '繁體中文', file: 'zh-HK.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' },
    ],
    defaultLocale: 'zh-HK',
    langDir: 'locales',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
  },

  colorMode: {
    classSuffix: '',
    preference: 'system',
    fallback: 'light',
    storageKey: 'what2eat-color-mode',
  },
})
