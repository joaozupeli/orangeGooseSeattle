import { onMounted, onUnmounted, watch } from 'vue'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

let lenis = null

export function setLenis(instance) {
  lenis = instance
}

function whenFontsReady() {
  if (typeof document === 'undefined' || !document.fonts) return Promise.resolve()
  return document.fonts.ready
}

let refreshTimer
function refreshSoon() {
  window.clearTimeout(refreshTimer)
  refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 180)
}

function watchLayoutChanges() {
  whenFontsReady().then(refreshSoon)

  if (document.readyState === 'complete') refreshSoon()
  else window.addEventListener('load', refreshSoon, { once: true })

  document.addEventListener(
    'load',
    (event) => {
      if (event.target instanceof HTMLImageElement) refreshSoon()
    },
    true,
  )
}

export function scrollToHash(hash) {
  const target = document.querySelector(hash)
  if (!target) return

  const offset =
    -Number.parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
      10,
    ) || -76

  if (lenis) {
    lenis.scrollTo(target, {
      offset,
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    })
  } else {
    window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY + offset })
  }
}

function handleAnchorClicks() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest?.('a[href^="#"]')
    if (!link) return

    const hash = link.getAttribute('href')
    if (!hash || hash === '#' || !document.querySelector(hash)) return

    event.preventDefault()
    scrollToHash(hash)
  })
}

export function startMotion() {
  ScrollTrigger.config({ ignoreMobileResize: true })
  watchLayoutChanges()
  handleAnchorClicks()
}

function observeOnce(elements, onVisible, options = {}) {
  const { threshold = 0, rootMargin = '0px 0px -10% 0px' } = options

  if (typeof IntersectionObserver === 'undefined') {
    onVisible(elements)
    return null
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target)
    if (!visible.length) return

    visible.forEach((el) => observer.unobserve(el))
    onVisible(visible)
  }, { threshold, rootMargin })

  elements.forEach((el) => observer.observe(el))
  return observer
}

export function useReveal(rootRef, options = {}) {
  let observer

  onMounted(() => {
    const root = rootRef.value
    if (!root) return

    const {
      selector = '[data-anim]',
      y = 40,
      duration = 1.25,
      stagger = 0.1,
      ease = 'expo.out',
      threshold,
    } = options

    const items = selector ? Array.from(root.querySelectorAll(selector)) : [root]
    if (!items.length) return

    gsap.set(items, { opacity: 0, y })

    observer = observeOnce(
      items,
      (visible) => {
        gsap.to(visible, { opacity: 1, y: 0, duration, stagger, ease, overwrite: 'auto' })
      },
      { threshold },
    )
  })

  onUnmounted(() => observer?.disconnect())
}

export function useSplitReveal(elRef, options = {}) {
  let observer
  let split
  let cancelled = false

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    const { duration = 1.4, stagger = 0.1, delay = 0, ease = 'expo.out' } = options

    gsap.set(el, { opacity: 0 })

    whenFontsReady().then(() => {
      if (cancelled || !elRef.value) return

      split = new SplitText(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' })
      gsap.set(el, { opacity: 1 })
      gsap.set(split.lines, { yPercent: 110 })

      observer = observeOnce([el], () => {
        gsap.to(split.lines, {
          yPercent: 0,
          duration,
          delay,
          stagger,
          ease,
          onComplete: () => split?.revert(),
        })
      })
    })
  })

  onUnmounted(() => {
    cancelled = true
    observer?.disconnect()
    split?.revert()
  })
}

export function useCountUp(elRef, endValue, options = {}) {
  let observer
  let tween

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    const { duration = 2, suffix = '', ease = 'power2.out' } = options
    const counter = { value: 0 }
    const render = () => {
      el.textContent = `${Math.round(counter.value).toLocaleString('pt-BR')}${suffix}`
    }

    render()

    observer = observeOnce([el], () => {
      tween = gsap.to(counter, { value: endValue, duration, ease, onUpdate: render })
    }, { threshold: 0.4 })
  })

  onUnmounted(() => {
    observer?.disconnect()
    tween?.kill()
  })
}

export function useParallax(elRef, options = {}) {
  let tween

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    const { yPercent = 12, scale = 1 } = options

    tween = gsap.fromTo(
      el,
      { yPercent: -yPercent / 2, scale },
      {
        yPercent: yPercent / 2,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
          invalidateOnRefresh: true,
        },
      },
    )
  })

  onUnmounted(() => {
    tween?.scrollTrigger?.kill()
    tween?.kill()
  })
}

export function useMarquee(trackRef, options = {}) {
  let tween

  onMounted(() => {
    const track = trackRef.value
    if (!track) return

    const { duration = 26, reverse = false } = options

    tween = gsap.to(track, {
      xPercent: reverse ? 0 : -50,
      startAt: { xPercent: reverse ? -50 : 0 },
      duration,
      ease: 'none',
      repeat: -1,
    })
  })

  onUnmounted(() => tween?.kill())
}

export function useScrollProgress(elRef) {
  let tween

  onMounted(() => {
    const el = elRef.value
    if (!el) return

    tween = gsap.fromTo(
      el,
      { scaleX: 0 },
      {
        scaleX: 1,
        ease: 'none',
        scrollTrigger: {
          trigger: document.documentElement,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.3,
          invalidateOnRefresh: true,
        },
      },
    )
  })

  onUnmounted(() => {
    tween?.scrollTrigger?.kill()
    tween?.kill()
  })
}

export function useStaggerOnChange(containerRef, source, options = {}) {
  const { selector = '[data-stagger]', y = 26 } = options

  function animate() {
    const container = containerRef.value
    if (!container) return

    const items = container.querySelectorAll(selector)
    if (!items.length) return

    gsap.fromTo(
      items,
      { opacity: 0, y },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.055, ease: 'power3.out', overwrite: true },
    )
  }

  watch(source, () => requestAnimationFrame(animate))
}
