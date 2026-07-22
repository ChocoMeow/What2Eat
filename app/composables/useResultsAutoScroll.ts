const PIN_THRESHOLD = 96
const EASE = 0.14

export function useResultsAutoScroll(
  container: Ref<HTMLElement | null>,
  loading: Ref<boolean | undefined>,
  sources: Array<() => unknown>,
) {
  const follow = ref(true)
  let lastScrollTop = 0
  let touchY = 0
  let raf = 0

  function nearBottom(el: HTMLElement) {
    return el.scrollHeight - el.scrollTop - el.clientHeight <= PIN_THRESHOLD
  }

  function stopFollow() {
    follow.value = false
    cancelAnimationFrame(raf)
    raf = 0
  }

  function onScroll() {
    const el = container.value
    if (!el) return

    if (el.scrollTop < lastScrollTop - 1) {
      stopFollow()
    } else if (nearBottom(el)) {
      follow.value = true
      if (loading.value) scheduleScroll()
    }

    lastScrollTop = el.scrollTop
  }

  function onWheel(e: WheelEvent) {
    if (e.deltaY < 0) stopFollow()
  }

  function onTouchStart(e: TouchEvent) {
    touchY = e.touches[0]?.clientY ?? 0
  }

  function onTouchMove(e: TouchEvent) {
    const y = e.touches[0]?.clientY ?? 0
    if (y > touchY) stopFollow()
    touchY = y
  }

  function tick() {
    const el = container.value
    if (!el || !follow.value || !loading.value) {
      raf = 0
      return
    }

    const target = el.scrollHeight - el.clientHeight
    const diff = target - el.scrollTop
    if (Math.abs(diff) < 1) {
      el.scrollTop = target
      lastScrollTop = el.scrollTop
      raf = 0
      return
    }

    el.scrollTop += diff * EASE
    lastScrollTop = el.scrollTop
    raf = requestAnimationFrame(tick)
  }

  function scheduleScroll() {
    if (!follow.value || !loading.value || raf) return
    raf = requestAnimationFrame(tick)
  }

  watch(loading, (active) => {
    if (active) {
      follow.value = true
      lastScrollTop = container.value?.scrollTop ?? 0
    } else {
      cancelAnimationFrame(raf)
      raf = 0
    }
  })

  watch(
    () => sources.map((read) => read()),
    () => {
      if (!loading.value) return
      nextTick(scheduleScroll)
    },
  )

  watch(container, (el, _, onCleanup) => {
    if (!el) return
    lastScrollTop = el.scrollTop
    el.addEventListener('scroll', onScroll, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: true })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: true })
    onCleanup(() => {
      el.removeEventListener('scroll', onScroll)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    })
  }, { immediate: true })

  onBeforeUnmount(() => cancelAnimationFrame(raf))

  return { follow, scheduleScroll }
}
