<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { cn } from '@/lib/utils'
import { useAsciiLoop } from './useAsciiLoop'
import {
  SIZE_MAP, CHARSETS, SPEED_MAP, makeGrid, gridToLines, MULTICOLOR_PALETTE,
  type AsciiSize, type AsciiCharset, type AsciiSpeed,
} from './constants'

interface Props {
  class?: string
  size?: AsciiSize
  charset?: AsciiCharset
  color?: string
  speed?: AsciiSpeed
  animated?: boolean
  multicolor?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  size: 'md', charset: 'classic', speed: 'normal', animated: true, multicolor: false,
})

const rootEl = ref<HTMLElement | null>(null)
const lines = shallowRef<string[]>(buildFrame(0))

function drawDonut(grid: string[][], cols: number, rows: number, t: number, chars: string[]) {
  // a1k0n donut.c algorithm — ring lies in XZ plane so hole is always visible
  const A = t * 0.00083, B = t * 0.00125
  const cosA = Math.cos(A), sinA = Math.sin(A)
  const cosB = Math.cos(B), sinB = Math.sin(B)
  const R1 = 1.0, R2 = 2.0, K2 = 5.0
  const cx = cols / 2, cy = rows / 2
  const aspect = 0.5
  const K1 = Math.min(cols * aspect, rows) * K2 / (K2 + R1 + R2) * 0.9
  const zbuf: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-Infinity))

  for (let theta = 0; theta < 2 * Math.PI; theta += 0.07) {
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    const h = R2 + R1 * cosT
    for (let phi = 0; phi < 2 * Math.PI; phi += 0.02) {
      const cosP = Math.cos(phi), sinP = Math.sin(phi)
      const ycomp = sinP * h * cosA - sinT * sinA
      const zDist = sinP * h * sinA + sinT * cosA + K2
      if (zDist <= 0) continue
      const ooz = 1 / zDist
      const xp = Math.round(cx + K1 * ooz * (cosP * h * cosB - ycomp * sinB))
      const yp = Math.round(cy - K1 * ooz * (cosP * h * sinB + ycomp * cosB) * aspect)
      if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue
      const L = (sinT * sinA - sinP * cosT * cosA) * cosB
              - sinP * cosT * sinA
              - sinT * cosA
              - cosP * cosT * sinB
      if (L > 0 && ooz > zbuf[yp][xp]) {
        zbuf[yp][xp] = ooz
        grid[yp][xp] = chars[Math.min(Math.floor(L * (chars.length - 1)), chars.length - 1)]
      }
    }
  }
}

function buildFrame(t: number): string[] {
  const { cols, rows } = SIZE_MAP[props.size]
  const chars = CHARSETS[props.charset]
  const g = makeGrid(cols, rows)
  drawDonut(g, cols, rows, t, chars)
  return gridToLines(g)
}

// Reduced-motion, off-screen and background-tab handling all live in
// useAsciiLoop — see that file for why a raw rAF loop wasn't enough.
useAsciiLoop({
  animated: () => props.animated,
  speedMul: () => SPEED_MAP[props.speed],
  buildFrame,
  lines,
  deps: () => [props.size, props.charset, props.speed, props.animated],
  el: rootEl,
})
</script>

<template>
  <pre
    ref="rootEl"
    aria-hidden="true"
    :class="cn('inline-block border-3 border-foreground shadow-[4px_4px_0px_hsl(var(--shadow-color))] bg-background overflow-hidden font-mono text-xs leading-none tracking-tight select-none p-1', props.class)"
    :style="props.multicolor ? undefined : { color: props.color || 'currentColor' }"
  ><template v-if="props.multicolor"><template v-for="(line, i) in lines" :key="i"><span :style="{ color: MULTICOLOR_PALETTE[i % MULTICOLOR_PALETTE.length] }">{{ line }}</span><template v-if="i < lines.length - 1">&#10;</template></template></template><template v-else>{{ lines.join('\n') }}</template></pre>
</template>
