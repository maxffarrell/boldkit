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
  const a = props.animation
  if (!a || a === 'none') return ''
  const s = props.speed && props.speed !== 'normal' ? `-${props.speed}` : ''
  return `shape-animate-${a}${s}`
})
</script>

<template>
  <svg
    aria-hidden="true"
    :width="size"
    :height="size * 0.6"
    viewBox="0 0 100 60"
    :class="cn('text-primary', animClass, props.class)"
  >
    <path
      d="M5 55 Q5 10 50 10 Q95 10 95 55"
      fill="none"
      :stroke="filled ? (color || 'hsl(var(--destructive))') : 'none'"
      stroke-width="10"
      stroke-linecap="round"
    />
    <path
      d="M15 55 Q15 22 50 22 Q85 22 85 55"
      fill="none"
      :stroke="filled ? (color || 'hsl(var(--warning))') : 'none'"
      stroke-width="10"
      stroke-linecap="round"
    />
    <path
      d="M25 55 Q25 34 50 34 Q75 34 75 55"
      fill="none"
      :stroke="filled ? (color || 'hsl(var(--info))') : 'none'"
      stroke-width="10"
      stroke-linecap="round"
    />
    <path
      d="M5 55 Q5 10 50 10 Q95 10 95 55"
      fill="none"
      :stroke="strokeValue"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
    <path
      d="M15 55 Q15 22 50 22 Q85 22 85 55"
      fill="none"
      :stroke="strokeValue"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
    <path
      d="M25 55 Q25 34 50 34 Q75 34 75 55"
      fill="none"
      :stroke="strokeValue"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
  </svg>
</template>
