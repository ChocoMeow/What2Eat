<script setup lang="ts">
const resultsEl = ref<HTMLElement | null>(null)

const {
  location,
  cuisines,
  priceTier,
  formExpanded,
  sessionMeta,
  searchStartedAt,
  isLoading,
  processText,
  recommendations,
  sessionActive,
  formMinimized,
  canCollapseForm,
  bannerError,
  showInsight,
  requestError,
  runRecommend,
  cancelSearch,
} = useRecommendSearch(resultsEl)
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
          ref="resultsEl"
          class="results-pane relative z-0 mx-auto w-full max-w-5xl min-h-0 px-4 sm:px-6"
          :class="sessionActive ? 'results-pane--visible' : 'results-pane--hidden'"
          aria-live="polite"
        >
          <div v-if="sessionActive" class="pb-14 pt-2">
            <Transition name="fade-rise">
              <div
                v-if="showInsight"
                class="mx-auto mb-5 max-w-2xl py-5"
              >
                <AiProcessNotes
                  :text="processText"
                  :fallback="$t('results.searching')"
                  :live="isLoading"
                  :meta="sessionMeta"
                  :started-at="searchStartedAt"
                />
              </div>
            </Transition>

            <h2
              v-if="recommendations.length"
              class="mb-5 font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl"
            >
              {{ $t('results.title') }}
            </h2>

            <div class="card-grid relative grid grid-cols-1 gap-4 sm:grid-cols-2">
              <RestaurantCard
                v-for="(item, index) in recommendations"
                :key="index"
                :item="item || {}"
                :location="location"
                :settled="!isLoading"
              />
            </div>
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
            :busy="isLoading && !requestError"
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
