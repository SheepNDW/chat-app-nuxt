// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  future: {
    compatibilityVersion: 4,
  },
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/test-utils/module', '@nuxtjs/mdc'],
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    openaiApiKey: '',
  },
  vite: {
    optimizeDeps: {
      include: ['debug'],
    },
  },
  mdc: {
    highlight: {
      theme: 'material-theme-palenight',
      langs: ['html', 'markdown', 'vue', 'typescript', 'javascript'],
    },
  },
});
