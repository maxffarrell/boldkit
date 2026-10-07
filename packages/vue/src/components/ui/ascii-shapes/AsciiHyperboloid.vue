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

function drawHyperboloid(grid: string[][], cols: number, rows: number, t: number, chars: string[]) {
  const A = t * 0.0006, B = t * 0.0003
  const cosA = Math.cos(A), sinA = Math.sin(A)
  const cosB = Math.cos(B), sinB = Math.sin(B)
  const cx = cols / 2, cy = rows / 2
  const aspect = 0.5
  const H = 1.7
  const K2 = 6.0
  const maxExtent = Math.sqrt(1 + H * H) + 0.1
  const screenScale = Math.min(cols * aspect, rows) * 0.85
  const K1 = screenScale * K2 / (K2 + maxExtent)
  const zbuf: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-Infinity))
  const lx = 0.577, ly = 0.577, lz = -0.577
  const nRulings = 32, nPoints = 60

  function rotYX(px: number, py: number, pz: number): [number, number, number] {
    const rx1 = px * cosA + pz * sinA, ry1 = py, rz1 = -px * sinA + pz * cosA
    return [rx1, ry1 * cosB - rz1 * sinB, ry1 * sinB + rz1 * cosB]
  }
  function plotPt(px: number, py: number, pz: number) {
    const [rx, ry, rz] = rotYX(px, py, pz)
    const zDist = K2 - rz
    if (zDist <= 0) return
    const ooz = 1 / zDist
    const xp = Math.round(cx + K1 * rx * ooz)
    const yp = Math.round(cy - K1 * ry * ooz * aspect)
    if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) return
    const nm = Math.sqrt(px * px + py * py + pz * pz)
    const [rnx, rny, rnz] = rotYX(px / nm, -py / nm, pz / nm)
    const L = Math.max(0.12, rnx * lx + rny * ly + rnz * lz)
    if (ooz > zbuf[yp][xp]) {
      zbuf[yp][xp] = ooz
      grid[yp][xp] = chars[Math.min(Math.floor(L * (chars.length - 1)), chars.length - 1)]
    }
  }

  for (let k = 0; k < nRulings; k++) {
    const s = (k / nRulings) * 2 * Math.PI
    const cosS = Math.cos(s), sinS = Math.sin(s)
    for (let family = 0; family < 2; family++) {
      const dir = family === 0 ? 1 : -1
      for (let j = 0; j <= nPoints; j++) {
        const v = -H + (2 * H * j) / nPoints
        plotPt(cosS + v * dir * sinS, v, sinS - v * dir * cosS)
      }
    }
  }
  for (let j = 0; j <= 80; j++) {
    const theta = (j / 80) * 2 * Math.PI
    for (const vy of [-H, -H * 0.75, -H * 0.5, -H * 0.25, 0, H * 0.25, H * 0.5, H * 0.75, H]) {
      const r = Math.sqrt(1 + vy * vy)
      plotPt(r * Math.cos(theta), vy, r * Math.sin(theta))
    }
  }
}

function buildFrame(t: number): string[] {
  const { cols, rows } = SIZE_MAP[props.size]
  const chars = CHARSETS[props.charset]
  const g = makeGrid(cols, rows)
  drawHyperboloid(g, cols, rows, t, chars)
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
