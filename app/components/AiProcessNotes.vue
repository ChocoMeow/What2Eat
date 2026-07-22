<script setup lang="ts">
const props = defineProps<{
  text?: string
  live?: boolean
  fallback?: string
}>()

const expanded = ref(false)

const lines = computed(() => {
  const raw = (props.text || '').trim()
  if (!raw) return []
  const byNewline = raw.split(/\r?\n/u).map((l) => l.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline
  const sentences = byNewline[0]?.match(/[^.!?。！？]+[.!?。！？]+(?:\s+|$)|[^.!?。！？]+$/gu)
  return sentences && sentences.length > 1
    ? sentences.map((s) => s.trim()).filter(Boolean)
    : byNewline
})

const canExpand = computed(() => lines.value.length > 1)
const preview = computed(() => lines.value.at(-1) || props.fallback || '')
const display = computed(() =>
  expanded.value || !canExpand.value
    ? (props.text?.trim() || props.fallback || '')
    : preview.value,
)

watch(
  () => props.text,
  (next, prev) => {
    if (!next || (prev && next.length < prev.length)) expanded.value = false
  },
)
</script>

<template>
  <div
    class="gemini-process"
    :class="live ? '' : 'rounded-2xl border border-line/70 bg-surface/60 px-4 py-3'"
    role="status"
    aria-live="polite"
  >
    <div class="flex items-start gap-2.5">
      <span
        v-if="live"
        class="gemini-dots mt-2 shrink-0"
        aria-hidden="true"
      >
        <span /><span /><span />
      </span>

      <div class="min-w-0 flex-1">
        <p
          v-if="!live"
          class="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted"
        >
          {{ $t('results.processLabel') }}
        </p>
        <p
          class="text-sm leading-relaxed sm:text-[0.95rem]"
          :class="live && !expanded ? 'gemini-process__text--shimmer' : 'whitespace-pre-wrap text-muted'"
        >
          {{ display }}
        </p>
      </div>

      <button
        v-if="canExpand"
        type="button"
        class="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors duration-200 ease-smooth hover:bg-canvas hover:text-ink"
        :aria-expanded="expanded"
        :aria-label="expanded ? $t('results.processCollapse') : $t('results.processExpand')"
        @click="expanded = !expanded"
      >
        <svg
          class="size-4 transition-transform duration-200 ease-smooth"
          :class="expanded ? 'rotate-180' : ''"
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6.5 8 10.5 12 6.5"
            stroke="currentColor"
            stroke-width="1.75"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
  </div>
</template>
