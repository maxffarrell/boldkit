import { onMounted, onUnmounted, watch, type Ref } from 'vue'

/**
 * Shared animation loop for the ASCII shapes.
 *
 * Each of the 17 shapes used to hand-roll its own `requestAnimationFrame`
 * loop, which meant none of them:
 *
 *   - respected `prefers-reduced-motion` — a JS loop that rewrites text every
 *     frame is invisible to a CSS media query, so reduced-motion users got
 *     full-speed flicker (`AsciiMatrix`/`AsciiVortex` especially);
 *   - stopped while scrolled off-screen — at `size="hero"` that is a
 *     120×60 grid reallocated 60×/second, forever;
 *   - stopped in a background tab.
 *
 * The canvas effects already centralise exactly these three concerns in
 * `canvas-effect-core`; this is the ASCII equivalent. Kept dependency-free so
 * the registry can ship this folder standalone.
 */
export interface AsciiLoopOptions {
  /** Whether animation is requested at all. */
  animated: () => boolean
  /** Time multiplier applied to the elapsed milliseconds. */
  speedMul: () => number
  /** Build the frame for elapsed time `t`. */
  buildFrame: (t: number) => string[]
  /** Where to write each frame. */
  lines: Ref<string[]>
  /** Restart the loop when any of these change. */
  deps: () => unknown[]
  /** Root element, observed so the loop pauses while off-screen. */
  el: Ref<HTMLElement | null>
}

function reducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useAsciiLoop(options: AsciiLoopOptions) {
  let rafId = 0
  let startTime = 0
  let onScreen = true
  let mounted = false
  let observer: IntersectionObserver | null = null
  let motionMql: MediaQueryList | null = null

  const draw = (now: number) => {
    options.lines.value = options.buildFrame((now - startTime) * options.speedMul())
  }

  const frame = (now: number) => {
    draw(now)
    rafId = requestAnimationFrame(frame)
  }

  const shouldAnimate = () =>
    mounted &&
    options.animated() &&
    onScreen &&
    typeof document !== 'undefined' &&
    !document.hidden &&
    !reducedMotion()

  const syncLoop = () => {
    if (shouldAnimate()) {
      if (!rafId) rafId = requestAnimationFrame(frame)
    } else if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
  }

  const restart = () => {
    if (!mounted) return
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    startTime = typeof performance !== 'undefined' ? performance.now() : 0
    if (!options.animated()) {
      options.lines.value = options.buildFrame(0)
      return
    }
    // Always paint one frame, so a paused or reduced-motion shape still shows
    // its artwork rather than an empty box.
    draw(startTime)
    syncLoop()
  }

  onMounted(() => {
    mounted = true

    if (typeof IntersectionObserver !== 'undefined' && options.el.value) {
      observer = new IntersectionObserver((entries) => {
        onScreen = entries.some((e) => e.isIntersecting)
        syncLoop()
      })
      observer.observe(options.el.value)
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', syncLoop)
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      motionMql = window.matchMedia('(prefers-reduced-motion: reduce)')
      motionMql.addEventListener('change', syncLoop)
    }

    restart()
  })

  onUnmounted(() => {
    mounted = false
    if (rafId) cancelAnimationFrame(rafId)
    rafId = 0
    observer?.disconnect()
    observer = null
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', syncLoop)
    }
    motionMql?.removeEventListener('change', syncLoop)
    motionMql = null
  })

  watch(options.deps, restart)

  return { restart }
}
