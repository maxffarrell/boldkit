<script setup lang="ts">
import { computed } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  class?: string
  size?: number
  strokeWidth?: number
  filled?: boolean
  /** Fill colour when `filled`, outline colour when not. */
  color?: string
  /** Outline colour. Defaults to the foreground token. */
  strokeColor?: string
  animation?:
    | 'none'
    // smooth presets
    | 'spin' | 'pulse' | 'float' | 'wiggle' | 'bounce' | 'glitch'
    // stepped presets — hard, non-interpolated motion (v3.5)
    | 'spin-step' | 'pulse-hard' | 'marquee-stamp'
  speed?: 'slow' | 'normal' | 'fast'
}

const props = withDefaults(defineProps<Props>(), {
  size: 100,
  strokeWidth: 3,
  filled: true,
  animation: 'none',
  speed: 'normal',
})

/**
 * Resolve the outline colour.
 *
 * `color` used to apply to `fill` only, so `<Shape :filled="false" color="red" />`
 * rendered a black outline and the prop was a silent no-op. When the shape *is*
 * its outline, `color` is what the caller meant.
 */
const strokeValue = computed(() => {
  if (props.strokeColor) return props.strokeColor
  if (!props.filled && props.color) return props.color
  return 'hsl(var(--foreground))'
})

const animClass = computed(() => {
  if (!props.animation || props.animation === 'none') return ''
  const s = props.speed && props.speed !== 'normal' ? `-${props.speed}` : ''
  return `shape-animate-${props.animation}${s}`
})
</script>

<template>
  <svg
    aria-hidden="true"
    :width="size"
    :height="size * 0.6"
    viewBox="0 0 100 60"
    :class="cn('text-secondary', animClass, props.class)"
  >
    <path
      d="M5 15 Q15 5 30 10 Q50 18 70 8 Q85 3 95 15 Q100 25 95 35 Q85 47 70 42 Q50 35 30 45 Q15 52 5 42 Q0 35 5 25 Q5 20 5 15 Z"
      :fill="filled ? (color || 'currentColor') : 'none'"
      :stroke="strokeValue"
      :stroke-width="strokeWidth"
      stroke-linejoin="round"
    />
    <!-- Lens-shaped crossing detail matching React implementation -->
    <path d="M38 28 Q50 22 62 28 Q50 34 38 28 Z"
      fill="hsl(var(--background))"
      :stroke="strokeValue"
      :stroke-width="strokeWidth" />
  </svg>
</template>
