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
      <div class="mx-auto flex max-w-5xl items-center justify-end gap-2 px-4 py-3 sm:px-6">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>

    <main class="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">
      <slot />
    </main>
  </div>
</template>
