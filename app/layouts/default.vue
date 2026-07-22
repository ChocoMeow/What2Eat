<script setup lang="ts">
const isSearching = useState('w2e-searching', () => false)
</script>

<template>
  <div
    class="app-shell relative flex h-dvh max-h-dvh flex-col overflow-hidden bg-canvas"
    :class="{ 'app-shell--searching': isSearching }"
  >
    <div
      class="hero-orbs pointer-events-none absolute inset-0 overflow-hidden"
      aria-hidden="true"
    >
      <span class="hero-orb hero-orb--bottom" />
    </div>
    <div
      class="grain pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
    <header class="relative z-20 shrink-0">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
        <NuxtLink
          to="/"
          class="flex items-center gap-2 rounded-lg outline-offset-4 transition-opacity hover:opacity-80"
          :aria-label="$t('brand')"
        >
          <img
            src="/icons/icon_144x144.webp"
            alt=""
            class="size-8 rounded-lg sm:size-9"
            width="36"
            height="36"
            decoding="async"
          >
        </NuxtLink>
        <div class="flex items-center gap-2">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <slot />
    </main>
  </div>
</template>
