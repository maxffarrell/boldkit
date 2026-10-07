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
  size: 'md', charset: 'blocks', speed: 'normal', animated: true, multicolor: false,
})

const rootEl = ref<HTMLElement | null>(null)
const lines = shallowRef<string[]>(buildFrame(0))

function drawSaturn(grid: string[][], cols: number, rows: number, t: number, chars: string[]) {
  const A = t * 0.0007, B = t * 0.0004
  const cosA = Math.cos(A), sinA = Math.sin(A)
  const cosB = Math.cos(B), sinB = Math.sin(B)
  const cx = cols / 2, cy = rows / 2
  const aspect = 0.5
  const K2 = 5.0
  const screenScale = Math.min(cols * aspect, rows) * 0.85
  const K1 = screenScale * K2 / (K2 + 2.5)
  const zbuf: number[][] = Array.from({ length: rows }, () => Array(cols).fill(-Infinity))
  const lx = 0.577, ly = 0.577, lz = -0.577
  const TILT = 0.47
  const sinTilt = Math.sin(TILT), cosTilt = Math.cos(TILT)

  function rotYX(px: number, py: number, pz: number): [number, number, number] {
    const rx1 = px * cosA + pz * sinA, ry1 = py, rz1 = -px * sinA + pz * cosA
    return [rx1, ry1 * cosB - rz1 * sinB, ry1 * sinB + rz1 * cosB]
  }
  function plotPoint(px: number, py: number, pz: number, nx: number, ny: number, nz: number) {
    const [rx, ry, rz] = rotYX(px, py, pz)
    const zDist = K2 - rz
    if (zDist <= 0) return
    const ooz = 1 / zDist
    const xp = Math.round(cx + K1 * rx * ooz)
    const yp = Math.round(cy - K1 * ry * ooz * aspect)
    if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) return
    const [rnx, rny, rnz] = rotYX(nx, ny, nz)
    const L = Math.max(0, rnx * lx + rny * ly + rnz * lz)
    if (L > 0 && ooz > zbuf[yp][xp]) {
      zbuf[yp][xp] = ooz
      grid[yp][xp] = chars[Math.min(Math.floor(L * (chars.length - 1)), chars.length - 1)]
    }
  }

  // Planet sphere — tighter sampling for denser coverage
  for (let theta = 0; theta < 2 * Math.PI; theta += 0.04) {
    const cosT = Math.cos(theta), sinT = Math.sin(theta)
    for (let phi = 0; phi < 2 * Math.PI; phi += 0.02) {
      const cosP = Math.cos(phi), sinP = Math.sin(phi)
      const px = cosT * cosP, py = cosT * sinP, pz = sinT
      plotPoint(px, py, pz, px, py, pz)
    }
  }

  // Rings — solid swept disk sampled at many radii
  const R_inner = 1.35, R_outer = 2.45
  const ringSamples = 40
  for (let ri = 0; ri <= ringSamples; ri++) {
    const rFrac = ri / ringSamples
    if (rFrac > 0.42 && rFrac < 0.58) continue
    const r = R_inner + (R_outer - R_inner) * rFrac
    const ringBrightness = rFrac < 0.42
      ? 0.35 + rFrac * 1.1
      : 0.25 + (1 - rFrac) * 0.9
    for (let theta = 0; theta < 2 * Math.PI; theta += 0.01) {
      const cosT = Math.cos(theta), sinT = Math.sin(theta)
      const px = r * cosT
      const py = -r * sinT * sinTilt
      const pz =  r * sinT * cosTilt
      const [rx, ry, rz] = rotYX(px, py, pz)
      const zDist = K2 - rz
      if (zDist <= 0) continue
      const ooz = 1 / zDist
      const xp = Math.round(cx + K1 * rx * ooz)
      const yp = Math.round(cy - K1 * ry * ooz * aspect)
      if (xp < 0 || xp >= cols || yp < 0 || yp >= rows) continue
      if (ooz > zbuf[yp][xp]) {
        zbuf[yp][xp] = ooz
        grid[yp][xp] = chars[Math.min(Math.floor(ringBrightness * (chars.length - 1)), chars.length - 1)]
      }
    }
  }
}

function buildFrame(t: number): string[] {
  const { cols, rows } = SIZE_MAP[props.size]
  const chars = CHARSETS[props.charset]
  const g = makeGrid(cols, rows)
  drawSaturn(g, cols, rows, t, chars)
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
