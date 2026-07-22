import { useObject } from '@ai-sdk/vue'
import type { AiSessionMeta } from '~~/shared/aiMeta'
import {
  recommendationSchema,
  type CuisineOption,
  type PriceTier,
} from '~~/shared/schemas/recommendation'
import { createRecommendFetch } from '~/utils/recommendStream'

const PROVIDER_ERROR = /AI_APICallError|Provider returned error|Failed after \d+ attempts/i
const SEARCH_TIMEOUT_MS = 120_000

function isAbort(err: unknown) {
  return err instanceof Error && (err.name === 'AbortError' || /abort|cancel/i.test(err.message))
}

export function useRecommendSearch(resultsEl: Ref<HTMLElement | null> = ref(null)) {
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
  const sessionMeta = ref<AiSessionMeta | null>(null)
  const searchStartedAt = ref<number | null>(null)

  const resetSession = () => {
    isSearching.value = false
    searchStartedAt.value = null
    sessionMeta.value = null
  }

  const { object, submit, isLoading, clear, stop } = useObject({
    api: '/api/recommend',
    schema: recommendationSchema,
    fetch: createRecommendFetch((meta) => {
      sessionMeta.value = meta
    }),
    onError(err) {
      if (isAbort(err)) {
        cancelled.value = false
        resetSession()
        return
      }
      fail(err)
    },
    onFinish({ object: finished, error: finishError }) {
      if (cancelled.value || isAbort(finishError)) {
        cancelled.value = false
        resetSession()
        return
      }
      if (finishError || !finished?.recommendations?.length) {
        fail(finishError)
        return
      }
      requestError.value = ''
      resultsReady.value = true
      formExpanded.value = false
    },
  })

  function fail(err?: unknown) {
    if (cancelled.value) {
      cancelled.value = false
      resetSession()
      return
    }
    stop()
    resultsReady.value = false
    formExpanded.value = true
    requestError.value =
      err instanceof Error && PROVIDER_ERROR.test(err.message)
        ? t('results.providerError')
        : t('results.error')
    resetSession()
  }

  let searchTimeout: ReturnType<typeof setTimeout> | undefined

  watch(isLoading, (loading) => {
    isSearching.value = !!loading
    clearTimeout(searchTimeout)
    if (!loading) return
    searchTimeout = setTimeout(() => {
      if (isLoading.value) fail(new Error('Search timed out'))
    }, SEARCH_TIMEOUT_MS)
  })

  onBeforeUnmount(() => {
    clearTimeout(searchTimeout)
    if (isLoading.value) stop()
    isSearching.value = false
  })

  const processText = computed(() => object.value?.process?.trim() || '')
  const recommendations = computed(
    () => object.value?.recommendations?.filter((r) => r?.name) ?? [],
  )
  const sessionActive = computed(
    () => !requestError.value && (resultsReady.value || isLoading.value),
  )
  const formMinimized = computed(
    () => !formExpanded.value && !requestError.value && (isLoading.value || resultsReady.value),
  )
  const canCollapseForm = computed(
    () => resultsReady.value && !isLoading.value && !requestError.value,
  )
  const bannerError = computed(() => formError.value || requestError.value)
  const showInsight = computed(
    () => isLoading.value || resultsReady.value || !!processText.value,
  )

  useResultsAutoScroll(resultsEl, isLoading, [
    () => processText.value,
    () => recommendations.value.length,
    () => sessionActive.value,
  ])

  function requestLocale() {
    const code = String(locale.value || '')
    return code === 'zh-HK' || code.startsWith('zh') ? 'zh-HK' : 'en'
  }

  function runRecommend(mode: 'search' | 'random') {
    if (!location.value.trim()) {
      formError.value = t('form.locationRequired')
      return
    }
    formError.value = ''
    cancelled.value = false
    resultsReady.value = false
    requestError.value = ''
    sessionMeta.value = null
    searchStartedAt.value = Date.now()
    formExpanded.value = false
    clear()
    submit({
      location: location.value.trim(),
      cuisines: mode === 'search' ? cuisines.value : [],
      priceTier: mode === 'search' ? priceTier.value : null,
      mode,
      locale: requestLocale(),
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
    resetSession()
  }

  return {
    location,
    cuisines,
    priceTier,
    formError,
    requestError,
    resultsReady,
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
    runRecommend,
    cancelSearch,
  }
}
