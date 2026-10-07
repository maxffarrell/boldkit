<script setup lang="ts">
import { ref, shallowRef } from 'vue'
import { cn } from '@/lib/utils'
import { useAsciiLoop } from './useAsciiLoop'
import {
  SIZE_MAP, CHARSETS, SPEED_MAP, makeGrid, gridToLines,
  makeMatrixState, MULTICOLOR_PALETTE,
  type AsciiSize, type AsciiCharset, type AsciiSpeed, type ColState,
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
let matrixState: ColState[] = makeMatrixState(SIZE_MAP[props.size].cols)
const lines = shallowRef<string[]>(buildFrame(0))

function drawMatrix(grid: string[][], cols: number, rows: number, t: number, chars: string[], state: ColState[]) {
  for (let c = 0; c < cols; c++) {
    const colT = (t * 0.001 * state[c].speed + state[c].offset) % (rows * 1.8)
    for (let r = 0; r < rows; r++) {
      const distFromHead = colT - r
      if (distFromHead >= 0 && distFromHead < 1) {
        grid[r][c] = chars[chars.length - 1]
      } else if (distFromHead >= 1 && distFromHead < rows * 0.45) {
        const fade = 1 - distFromHead / (rows * 0.45)
        grid[r][c] = chars[Math.floor(fade * (chars.length - 1))]
      } else {
        grid[r][c] = ' '
      }
    }
  }
}

function buildFrame(t: number): string[] {
  const { cols, rows } = SIZE_MAP[props.size]
  const chars = CHARSETS[props.charset]
  const g = makeGrid(cols, rows)
  drawMatrix(g, cols, rows, t, chars, matrixState)
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
