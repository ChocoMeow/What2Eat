<script setup lang="ts">
import type { OpenStatus, PriceTier, RecommendationItem } from '~~/shared/schemas/recommendation'
import { foodImageUrl, isHttpUrl } from '~/utils/restaurantLinks'
import { shareRestaurant } from '~/utils/shareRestaurant'

const props = defineProps<{
  item: Partial<RecommendationItem>
  location: string
  index?: number
}>()

const { t } = useI18n()
const toast = ref('')
const imageFailed = ref(false)
let toastTimer: ReturnType<typeof setTimeout> | undefined

const name = computed(() => props.item.name || '')
const cuisine = computed(() => props.item.cuisine || '')
const dish = computed(() => props.item.suggestedDish || '')

const priceLabel = computed(() => {
  const tier = props.item.priceTier
  return tier === 'budget' || tier === 'mid-range' || tier === 'high-end'
    ? t(`price.${tier as PriceTier}`)
    : ''
})

const status = computed(() => {
  const s = props.item.openStatus
  return s === 'open' || s === 'closed' || s === 'unknown' ? (s as OpenStatus) : null
})

const rating = computed(() => {
  const v = props.item.rating
  if (typeof v !== 'number' || Number.isNaN(v)) return null
  return Math.min(5, Math.max(0, v))
})

const stars = computed(() => (rating.value == null ? 0 : Math.round(rating.value)))

const imageSrc = computed(() =>
  foodImageUrl(
    props.item.imagePrompt || `${dish.value} ${cuisine.value} food`,
    `${name.value}-${dish.value}`,
  ),
)

const links = computed(() =>
  (
    [
      { href: props.item.mapsUrl, label: t('results.googleMaps') },
      { href: props.item.openRiceUrl, label: t('results.openRice') },
      { href: props.item.websiteUrl, label: t('results.website') },
    ] as const
  ).filter((l) => isHttpUrl(l.href)),
)

async function onShare() {
  try {
    const result = await shareRestaurant({
      name: name.value,
      cuisine: cuisine.value,
      priceLabel: priceLabel.value,
      suggestedDish: dish.value,
      location: props.location,
      shareTitle: t('results.shareTitle'),
      shareTextTemplate: t('results.shareText'),
      shareUrl: links.value[0]?.href,
    })
    if (result === 'copied') {
      toast.value = t('results.copied')
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => {
        toast.value = ''
      }, 2000)
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') return
  }
}

watch(name, () => {
  imageFailed.value = false
})
onBeforeUnmount(() => clearTimeout(toastTimer))
</script>

<template>
  <article
    class="relative flex h-full gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-4 sm:gap-5 sm:p-5"
    :style="{ transitionDelay: `${(index ?? 0) * 40}ms` }"
  >
    <div class="flex min-w-0 flex-1 flex-col">
      <div class="mb-2">
        <div class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <h3 class="font-display text-lg font-semibold tracking-tight text-ink sm:text-xl">
            {{ name }}
          </h3>
          <span
            v-if="priceLabel"
            class="text-xs font-medium text-muted"
          >{{ priceLabel }}</span>
        </div>
        <p
          v-if="cuisine"
          class="mt-1 text-sm font-medium text-teal"
        >
          {{ cuisine }}
        </p>

        <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <div
            v-if="rating != null"
            class="inline-flex items-center gap-1.5"
          >
            <span
              class="inline-flex gap-0.5 text-saffron"
              aria-hidden="true"
            >
              <span
                v-for="n in 5"
                :key="n"
                class="text-[0.7rem] leading-none"
                :class="n <= stars ? 'opacity-100' : 'opacity-25'"
              >★</span>
            </span>
            <span class="font-semibold tabular-nums text-ink">{{ rating.toFixed(1) }}</span>
          </div>
          <span
            v-if="status"
            class="rounded-md px-2 py-0.5 text-xs font-semibold"
            :class="{
              'bg-teal/15 text-teal': status === 'open',
              'bg-saffron/15 text-saffron': status === 'closed',
              'bg-canvas text-muted': status === 'unknown',
            }"
          >
            {{ $t(`results.openStatus.${status}`) }}
          </span>
        </div>

        <p
          v-if="item.hours"
          class="mt-1.5 text-xs text-muted"
        >
          <span class="font-medium text-ink">{{ $t('results.hours') }}:</span>
          {{ item.hours }}
        </p>
      </div>

      <p
        v-if="item.summary"
        class="mb-2 text-sm font-medium leading-snug text-ink"
      >
        {{ item.summary }}
      </p>
      <p
        v-if="item.description"
        class="mb-3 flex-1 text-sm leading-relaxed text-muted"
      >
        {{ item.description }}
      </p>
      <p
        v-if="dish"
        class="mb-3 text-sm text-ink"
      >
        <span class="font-semibold text-saffron">{{ $t('results.suggestedDish') }}:</span>
        {{ dish }}
      </p>

      <div class="mt-auto space-y-2 border-t border-line pt-3">
        <div
          v-if="links.length"
          class="flex flex-wrap gap-x-4 gap-y-2 text-sm"
        >
          <a
            v-for="link in links"
            :key="link.label"
            :href="link.href!"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-teal underline-offset-4 hover:underline"
          >
            {{ link.label }}
          </a>
        </div>
        <button
          type="button"
          class="text-sm font-medium text-ink underline-offset-4 hover:text-saffron hover:underline"
          @click="onShare"
        >
          {{ $t('results.share') }}
        </button>
      </div>
    </div>

    <div class="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-canvas sm:h-32 sm:w-36">
      <img
        v-if="!imageFailed"
        :src="imageSrc"
        :alt="dish || name"
        class="size-full object-cover"
        loading="lazy"
        @error="imageFailed = true"
      >
      <div
        v-else
        class="flex size-full items-center justify-center bg-gradient-to-br from-teal/20 to-saffron/20 p-2 text-center text-xs text-muted"
      >
        {{ cuisine }}
      </div>
    </div>

    <Transition name="toast">
      <p
        v-if="toast"
        class="absolute bottom-3 left-4 rounded-lg bg-ink px-3 py-1.5 text-xs font-medium text-surface"
      >
        {{ toast }}
      </p>
    </Transition>
  </article>
</template>
