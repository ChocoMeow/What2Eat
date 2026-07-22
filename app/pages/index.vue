<script setup lang="ts">
import { useObject } from '@ai-sdk/vue'
import {
  recommendationSchema,
  type CuisineOption,
  type PriceTier,
} from '~~/shared/schemas/recommendation'

const { t, locale } = useI18n()
const isSearching = useState('w2e-searching', () => false)

const location = ref('')
const cuisines = ref<CuisineOption[]>([])
const priceTier = ref<PriceTier | null>('mid-range')
const formError = ref('')
const requestError = ref('')
const resultsReady = ref(false)
const formExpanded = ref(false)
const cancelled = ref(false)

function isAbortError(err: unknown) {
  return err instanceof Error && (err.name === 'AbortError' || /abort|cancel/i.test(err.message))
}

function failRequest() {
  if (cancelled.value) {
    cancelled.value = false
    return
  }
  resultsReady.value = false
  formExpanded.value = true
  requestError.value = t('results.error')
}

const { object, submit, isLoading, error, clear, stop } = useObject({
  api: '/api/recommend',
  schema: recommendationSchema,
  onError(err) {
    if (isAbortError(err)) {
      cancelled.value = false
      return
    }
    failRequest()
  },
  onFinish({ object: finished, error: finishError }) {
    if (cancelled.value || isAbortError(finishError)) {
      cancelled.value = false
      return
    }
    if (finishError || !finished?.recommendations?.length) {
      failRequest()
      return
    }
    requestError.value = ''
    resultsReady.value = true
    formExpanded.value = false
  },
})

watch(isLoading, (v) => {
  isSearching.value = !!v
}, { immediate: true })

watch(error, (err) => {
  if (err && !cancelled.value && !isAbortError(err) && !requestError.value) failRequest()
})

onBeforeUnmount(() => {
  if (isLoading.value) stop()
  isSearching.value = false
})

const processText = computed(() => object.value?.process?.trim() || '')
const recommendations = computed(
  () => object.value?.recommendations?.filter((r) => r?.name) ?? [],
)
const sessionActive = computed(
  () => !requestError.value && (resultsReady.value || !!isLoading.value),
)
const formMinimized = computed(
  () =>
    !formExpanded.value
    && !requestError.value
    && (!!isLoading.value || resultsReady.value),
)
const canCollapseForm = computed(
  () => resultsReady.value && !isLoading.value && !requestError.value,
)
const bannerError = computed(() => formError.value || requestError.value)

function runRecommend(mode: 'search' | 'random') {
  if (!location.value.trim()) {
    formError.value = t('form.locationRequired')
    return
  }
  formError.value = ''
  cancelled.value = false
  resultsReady.value = false
  requestError.value = ''
  formExpanded.value = false
  clear()
  const code = String(locale.value || '')
  submit({
    location: location.value.trim(),
    cuisines: mode === 'search' ? cuisines.value : [],
    priceTier: mode === 'search' ? priceTier.value : null,
    mode,
    locale: code === 'zh-HK' || code.startsWith('zh') ? 'zh-HK' : 'en',
  })
}

function cancelSearch() {
  if (!isLoading.value) return
  cancelled.value = true
  stop()
  clear()
  resultsReady.value = false
  requestError.value = ''
  formError.value = ''
  formExpanded.value = true
  isSearching.value = false
}
</script>

<template>
  <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
    <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        class="brand-stage pointer-events-none z-10 shrink-0 px-4 sm:px-6"
        :class="sessionActive ? 'brand-stage--active' : 'brand-stage--idle'"
      >
        <div class="brand-block relative mx-auto w-full max-w-5xl">
          <p class="brand-title font-display font-bold tracking-tight text-ink">
            {{ $t('brand') }}
          </p>
          <p
            v-if="!sessionActive"
            class="mx-auto mt-4 max-w-xl text-center text-lg leading-relaxed text-muted"
          >
            {{ $t('tagline') }}
          </p>
        </div>
      </div>

      <div
        class="results-scroll-wrap relative min-h-0"
        :class="sessionActive ? 'results-scroll-wrap--active' : 'results-scroll-wrap--idle'"
      >
        <section
          id="results"
          class="results-pane relative z-0 mx-auto w-full max-w-5xl min-h-0 px-4 sm:px-6"
          :class="sessionActive ? 'results-pane--visible' : 'results-pane--hidden'"
          aria-live="polite"
        >
          <div
            v-if="sessionActive"
            class="pb-14 pt-2"
          >
            <Transition name="fade-rise">
              <div
                v-if="isLoading && !requestError"
                class="mx-auto max-w-2xl py-5"
              >
                <AiProcessNotes
                  :text="processText"
                  :fallback="$t('results.searching')"
                  live
                />
              </div>
            </Transition>

            <div
              v-if="resultsReady && !isLoading && processText"
              class="mb-5"
            >
              <AiProcessNotes :text="processText" />
            </div>

            <h2
              v-if="recommendations.length"
              class="mb-5 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              {{ $t('results.title') }}
            </h2>

            <TransitionGroup
              name="card-list"
              tag="div"
              class="relative grid grid-cols-1 gap-4 sm:grid-cols-2"
            >
              <RestaurantCard
                v-for="(item, index) in recommendations"
                :key="`${item?.name}-${index}`"
                :item="item || {}"
                :location="location"
                :index="index"
              />
            </TransitionGroup>
          </div>
        </section>
        <div
          v-if="sessionActive"
          class="results-fade"
          aria-hidden="true"
        />
      </div>
    </div>

    <div class="composer-dock relative z-30 shrink-0 px-4 pb-4 pt-1 sm:px-6 sm:pb-5">
      <div class="composer-stack mx-auto max-w-3xl">
        <Transition name="form-error">
          <div
            v-if="bannerError"
            class="form-error-banner"
            role="alert"
          >
            {{ bannerError }}
          </div>
        </Transition>
        <div
          class="composer-shell border border-line bg-surface/90 shadow-[0_-8px_40px_-12px_rgba(26,35,50,0.12)] backdrop-blur-xl dark:bg-surface/80 dark:shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.35)]"
          :class="[
            bannerError ? 'composer-shell--with-error' : 'rounded-2xl',
            formMinimized ? 'composer-shell--compact' : 'p-4 sm:p-5',
          ]"
        >
          <SearchForm
            v-model:location="location"
            v-model:cuisines="cuisines"
            v-model:price-tier="priceTier"
            :minimized="formMinimized"
            :busy="!!isLoading"
            :can-collapse="canCollapseForm"
            @search="runRecommend('search')"
            @random="runRecommend('random')"
            @cancel="cancelSearch"
            @expand="formExpanded = true"
            @collapse="formExpanded = false"
          />
        </div>
      </div>
    </div>
  </div>
</template>
