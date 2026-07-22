<script setup lang="ts">
import {
  CUISINE_OPTIONS,
  PRICE_TIERS,
  type CuisineOption,
  type PriceTier,
} from '~~/shared/schemas/recommendation'

type PlaceSuggestion = {
  id: string
  label: string
  name: string
}

const { t, locale } = useI18n()

const props = withDefaults(
  defineProps<{
    minimized?: boolean
    busy?: boolean
    canCollapse?: boolean
  }>(),
  { minimized: false, busy: false, canCollapse: false },
)

const emit = defineEmits<{
  search: []
  random: []
  cancel: []
  expand: []
  collapse: []
}>()

const location = defineModel<string>('location', { default: '' })
const cuisines = defineModel<CuisineOption[]>('cuisines', {
  default: () => [] as CuisineOption[],
})
const priceTier = defineModel<PriceTier | null>('priceTier', { default: 'mid-range' })

const locating = ref(false)
const geoError = ref('')

const suggestions = ref<PlaceSuggestion[]>([])
const suggestionsOpen = ref(false)
const suggestionsLoading = ref(false)
const activeIndex = ref(-1)
const suppressSuggest = ref(false)
const locationInputRef = ref<HTMLInputElement | null>(null)
const listboxId = 'location-suggestions'
const dropdownStyle = ref<Record<string, string>>({})

let debounceTimer: ReturnType<typeof setTimeout> | undefined
let suggestRequestId = 0

const showSuggestions = computed(
  () => suggestionsOpen.value && !props.minimized,
)

function updateDropdownPosition() {
  const el = locationInputRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const gap = 6
  const maxHeight = Math.min(224, Math.max(120, rect.top - 16))

  dropdownStyle.value = {
    position: 'fixed',
    left: `${rect.left}px`,
    width: `${rect.width}px`,
    bottom: `${window.innerHeight - rect.top + gap}px`,
    maxHeight: `${maxHeight}px`,
    zIndex: '200',
  }
}

function openSuggestions() {
  suggestionsOpen.value = true
  nextTick(() => updateDropdownPosition())
}

watch(showSuggestions, (open) => {
  if (open) nextTick(() => updateDropdownPosition())
})

watch(
  () => props.minimized,
  (minimized) => {
    if (minimized) closeSuggestions()
  },
)

const summaryText = computed(() => {
  const place = location.value.trim() || t('form.locationPlaceholder')
  const price = priceTier.value ? t(`price.${priceTier.value}`) : ''
  const cuisineCount = cuisines.value.length
  const cuisineBit = cuisineCount
    ? t('form.cuisineLabel') + ` · ${cuisineCount}`
    : ''
  return [place, cuisineBit, price].filter(Boolean).join(' · ')
})

function toggleCuisine(key: CuisineOption) {
  if (cuisines.value.includes(key)) {
    cuisines.value = cuisines.value.filter((c) => c !== key)
  } else {
    cuisines.value = [...cuisines.value, key]
  }
}

async function fetchSuggestions(query: string) {
  const requestId = ++suggestRequestId
  const q = query.trim()

  if (q.length < 2) {
    suggestions.value = []
    suggestionsLoading.value = false
    suggestionsOpen.value = false
    return
  }

  suggestionsLoading.value = true
  try {
    const data = await $fetch<{ suggestions: PlaceSuggestion[] }>(
      '/api/places/autocomplete',
      {
        query: {
          q,
          lang: locale.value,
        },
      },
    )
    if (requestId !== suggestRequestId) return
    suggestions.value = data.suggestions
    openSuggestions()
    activeIndex.value = -1
  } catch {
    if (requestId !== suggestRequestId) return
    suggestions.value = []
    openSuggestions()
  } finally {
    if (requestId === suggestRequestId) {
      suggestionsLoading.value = false
    }
  }
}

function onLocationInput() {
  if (suppressSuggest.value) {
    suppressSuggest.value = false
    return
  }
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchSuggestions(location.value)
  }, 400)
}

function selectSuggestion(item: PlaceSuggestion) {
  suppressSuggest.value = true
  location.value = item.label
  suggestions.value = []
  suggestionsOpen.value = false
  activeIndex.value = -1
  locationInputRef.value?.focus()
}

function closeSuggestions() {
  suggestionsOpen.value = false
  activeIndex.value = -1
}

function onLocationBlur() {
  setTimeout(() => closeSuggestions(), 140)
}

function onLocationKeydown(event: KeyboardEvent) {
  if (!suggestionsOpen.value || (!suggestions.value.length && !suggestionsLoading.value)) {
    if (event.key === 'Escape') closeSuggestions()
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (!suggestions.value.length) return
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (!suggestions.value.length) return
    activeIndex.value =
      activeIndex.value <= 0 ? suggestions.value.length - 1 : activeIndex.value - 1
  } else if (event.key === 'Enter' && activeIndex.value >= 0) {
    event.preventDefault()
    const item = suggestions.value[activeIndex.value]
    if (item) selectSuggestion(item)
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closeSuggestions()
  }
}

async function useMyLocation() {
  geoError.value = ''
  closeSuggestions()
  if (!navigator.geolocation) {
    geoError.value = t('form.geoUnavailable')
    return
  }

  locating.value = true
  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 12000,
      })
    })

    const { latitude, longitude } = position.coords
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
        { headers: { Accept: 'application/json' } },
      )
      if (res.ok) {
        const data = (await res.json()) as {
          address?: {
            suburb?: string
            neighbourhood?: string
            city?: string
            town?: string
            village?: string
            state?: string
            country?: string
          }
          display_name?: string
        }
        const a = data.address
        const parts = [
          a?.neighbourhood || a?.suburb,
          a?.city || a?.town || a?.village,
          a?.state,
          a?.country,
        ].filter(Boolean)
        suppressSuggest.value = true
        location.value = parts.length
          ? parts.join(', ')
          : data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      } else {
        suppressSuggest.value = true
        location.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      }
    } catch {
      suppressSuggest.value = true
      location.value = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? Number((err as GeolocationPositionError).code)
        : 0
    geoError.value = code === 1 ? t('form.geoDenied') : t('form.geoUnavailable')
  } finally {
    locating.value = false
  }
}

function onSearch() {
  closeSuggestions()
  emit('search')
}

function onRandom() {
  closeSuggestions()
  emit('random')
}

function focusLocation() {
  if (props.minimized || props.busy) return
  nextTick(() => locationInputRef.value?.focus())
}

onMounted(() => {
  window.addEventListener('resize', updateDropdownPosition)
  window.addEventListener('scroll', updateDropdownPosition, true)
  focusLocation()
})

watch(() => props.minimized, (minimized, wasMinimized) => {
  if (wasMinimized && !minimized) focusLocation()
})

onBeforeUnmount(() => {
  clearTimeout(debounceTimer)
  window.removeEventListener('resize', updateDropdownPosition)
  window.removeEventListener('scroll', updateDropdownPosition, true)
})
</script>

<template>
  <form
    class="search-form"
    :class="{ 'search-form--minimized': minimized }"
    @submit.prevent="onSearch"
  >
    <!-- Compact bar (only when minimized) -->
    <div class="search-form__bar">
      <div class="flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-ink">
            {{ summaryText }}
          </p>
          <p
            v-if="busy"
            class="mt-0.5 flex items-center gap-0.5 text-xs text-muted"
          >
            <span>{{ $t('form.searchingShort') }}</span>
            <span
              class="searching-dots inline-flex w-4 justify-start"
              aria-hidden="true"
            >
              <span>.</span><span>.</span><span>.</span>
            </span>
          </p>
        </div>
        <button
          v-if="busy"
          type="button"
          class="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-200 ease-smooth hover:border-saffron hover:text-saffron"
          @click="emit('cancel')"
        >
          {{ $t('form.cancelSearch') }}
        </button>
        <button
          v-else
          type="button"
          class="shrink-0 rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-ink transition-colors duration-200 ease-smooth hover:border-teal"
          @click="emit('expand')"
        >
          {{ $t('form.editSearch') }}
        </button>
      </div>
    </div>

    <!-- Full fields (height-animated) -->
    <div class="search-form__details">
      <div class="search-form__details-inner space-y-3">
        <div
          v-if="canCollapse"
          class="flex justify-end"
        >
          <button
            type="button"
            class="rounded-lg border border-line px-3 py-1.5 text-sm font-medium text-muted transition-colors duration-200 ease-smooth hover:border-teal hover:text-ink"
            @click="emit('collapse')"
          >
            {{ $t('form.collapseSearch') }}
          </button>
        </div>
        <div class="space-y-2">
          <label
            for="location"
            class="block text-sm font-semibold text-ink"
          >
            {{ $t('form.locationLabel') }}
          </label>
          <div class="flex flex-col gap-2 sm:flex-row">
            <div class="relative w-full flex-1">
              <input
                id="location"
                ref="locationInputRef"
                v-model="location"
                type="text"
                role="combobox"
                autocomplete="off"
                :disabled="busy || minimized"
                :aria-expanded="suggestionsOpen"
                :aria-controls="listboxId"
                aria-autocomplete="list"
                :aria-activedescendant="
                  activeIndex >= 0 ? `location-option-${activeIndex}` : undefined
                "
                :placeholder="$t('form.locationPlaceholder')"
                class="w-full rounded-xl border border-line bg-canvas/60 px-4 py-3 text-ink outline-none transition-colors duration-200 ease-smooth placeholder:text-muted focus:border-teal disabled:opacity-60"
                @input="onLocationInput"
                @keydown="onLocationKeydown"
                @focus="location.trim().length >= 2 && suggestions.length && openSuggestions()"
                @blur="onLocationBlur"
              >
            </div>
            <button
              type="button"
              class="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-line bg-canvas/60 px-4 py-3 text-sm font-medium text-ink transition-all duration-200 ease-smooth hover:border-teal disabled:opacity-60"
              :disabled="locating || busy || minimized"
              @click="useMyLocation"
            >
              <span
                class="size-2 rounded-full bg-teal"
                :class="locating ? 'animate-pulse' : ''"
              />
              {{ locating ? $t('form.locating') : $t('form.useMyLocation') }}
            </button>
          </div>
          <p
            v-if="geoError"
            class="text-sm text-saffron"
          >
            {{ geoError }}
          </p>
        </div>

        <Teleport to="body">
          <div
            v-if="showSuggestions"
            :id="listboxId"
            role="listbox"
            :aria-label="$t('form.locationSuggestions')"
            class="overflow-y-auto rounded-xl border border-line bg-surface shadow-lg shadow-ink/20 [scrollbar-width:thin] [scrollbar-color:color-mix(in_srgb,var(--w2e-muted)_45%,transparent)_transparent]"
            :style="dropdownStyle"
          >
            <p
              v-if="suggestionsLoading"
              class="px-4 py-3 text-sm text-muted"
            >
              {{ $t('form.locationSearching') }}
            </p>
            <template v-else-if="suggestions.length">
              <button
                v-for="(item, index) in suggestions"
                :id="`location-option-${index}`"
                :key="item.id"
                type="button"
                role="option"
                class="flex w-full flex-col items-start gap-0.5 border-b border-line px-4 py-2.5 text-left transition-colors duration-150 ease-smooth last:border-b-0"
                :class="
                  index === activeIndex
                    ? 'bg-teal/10 text-ink'
                    : 'text-ink hover:bg-canvas'
                "
                :aria-selected="index === activeIndex"
                @mousedown.prevent="selectSuggestion(item)"
              >
                <span class="text-sm font-medium">{{ item.name }}</span>
                <span class="line-clamp-1 text-xs text-muted">{{ item.label }}</span>
              </button>
            </template>
            <p
              v-else
              class="px-4 py-3 text-sm text-muted"
            >
              {{ $t('form.locationNoResults') }}
            </p>
          </div>
        </Teleport>

        <div class="space-y-2">
          <p class="text-sm font-semibold text-ink">
            {{ $t('form.cuisineLabel') }}
          </p>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="key in CUISINE_OPTIONS"
              :key="key"
              type="button"
              class="rounded-full border px-3 py-1 text-sm font-medium transition-all duration-200 ease-smooth disabled:opacity-60"
              :disabled="busy || minimized"
              :class="
                cuisines.includes(key)
                  ? 'scale-[1.02] border-teal bg-teal text-white'
                  : 'border-line bg-canvas/60 text-muted hover:border-teal hover:text-ink'
              "
              :aria-pressed="cuisines.includes(key)"
              @click="toggleCuisine(key)"
            >
              {{ $t(`cuisines.${key}`) }}
            </button>
          </div>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div class="space-y-2">
            <p class="text-sm font-semibold text-ink">
              {{ $t('form.priceLabel') }}
            </p>
            <div class="inline-flex rounded-xl border border-line bg-canvas/60 p-1">
              <button
                v-for="tier in PRICE_TIERS"
                :key="tier"
                type="button"
                class="rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ease-smooth disabled:opacity-60"
                :disabled="busy || minimized"
                :class="
                  priceTier === tier
                    ? 'bg-saffron text-white shadow-sm'
                    : 'text-muted hover:text-ink'
                "
                :aria-pressed="priceTier === tier"
                @click="priceTier = tier"
              >
                {{ $t(`price.${tier}`) }}
              </button>
            </div>
          </div>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-xl bg-teal px-5 py-2.5 text-sm font-semibold text-white transition-transform duration-200 ease-smooth hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              :disabled="busy || minimized"
            >
              {{ $t('form.findPlaces') }}
            </button>
            <button
              type="button"
              class="inline-flex flex-col items-center justify-center rounded-xl border-2 border-saffron bg-surface px-4 py-2 text-sm font-semibold text-ink transition-all duration-200 ease-smooth hover:bg-saffron/10 active:scale-[0.98] disabled:opacity-60"
              :disabled="busy || minimized"
              :title="$t('form.feedMeHint')"
              @click="onRandom"
            >
              <span>{{ $t('form.feedMe') }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </form>
</template>
