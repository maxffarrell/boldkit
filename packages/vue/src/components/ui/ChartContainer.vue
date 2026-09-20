<script lang="ts">
// Injection key + context type live in a plain <script> block — `<script setup>`
// cannot contain ES module `export`s (breaks the consumer's build).
import type { InjectionKey } from 'vue'

export interface ChartContext {
  config: import('vue').ComputedRef<import('./chart-utils').ChartConfig>
}

export const ChartContextKey: InjectionKey<ChartContext> = Symbol('ChartContext')
</script>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, shallowRef, useId } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import { chartContainerVariants } from './chart-variants'
import { neubrutalismTheme, resolveCssVars, type ChartConfig } from './chart-utils'
import ChartLoading from './ChartLoading.vue'

// Register ECharts components
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

type ChartVariants = VariantProps<typeof chartContainerVariants>

interface Props {
  class?: string
  variant?: ChartVariants['variant']
  config: ChartConfig
  option: Record<string, unknown>
  height?: string
  autoresize?: boolean
  /** Render a brutalist placeholder instead of the chart while data is pending. */
  loading?: boolean
  /** Announced while `loading` is true. */
  loadingLabel?: string
  /** Accessible name for the chart. Required for screen readers — a chart is
   *  an image as far as assistive tech is concerned. Mirrors the React API.
   *  Usable as `aria-label="…"` in templates; Vue camelizes it to this prop. */
  ariaLabel?: string
  /** Use instead of `ariaLabel` when the name is already rendered on screen. */
  ariaLabelledby?: string
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  height: '100%',
  autoresize: true,
  loading: false,
})

// Provide chart config to child components.
// config is exposed as a ComputedRef so injected consumers stay reactive to
// prop changes (a plain snapshot would freeze at first render).
provide(ChartContextKey, {
  config: computed(() => props.config),
})

const chartId = `chart-${useId().replace(/:/g, '')}`

// ECharts draws to a canvas, which has no CSS cascade — an `hsl(var(--primary))`
// string assigned to fillStyle is silently dropped. So both the theme and the
// incoming option are resolved against this container before they reach VChart.
// Doing it here fixes every chart type at once.
const rootEl = shallowRef<HTMLElement | null>(null)
// Bumped when the document theme changes, to re-read the tokens.
const themeVersion = ref(0)
let observer: MutationObserver | null = null

onMounted(() => {
  themeVersion.value++
  observer = new MutationObserver(() => {
    themeVersion.value++
  })
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class', 'style', 'data-theme'],
  })
})

onBeforeUnmount(() => {
  observer?.disconnect()
  observer = null
})

const resolvedTheme = computed(() => {
  void themeVersion.value
  return resolveCssVars(neubrutalismTheme, rootEl.value)
})

const mergedOption = computed(() => {
  void themeVersion.value
  return resolveCssVars({ ...props.option }, rootEl.value)
})
</script>

<template>
  <div
    ref="rootEl"
    data-slot="chart"
    :data-chart="chartId"
    :aria-busy="loading || undefined"
    :role="loading ? undefined : 'img'"
    :aria-label="loading ? undefined : props.ariaLabel"
    :aria-labelledby="loading ? undefined : props.ariaLabelledby"
    :class="cn(chartContainerVariants({ variant: props.variant }), props.class)"
  >
    <ChartLoading v-if="loading" :label="loadingLabel" />
    <VChart
      v-else
      :option="mergedOption"
      :theme="resolvedTheme"
      :autoresize="autoresize"
      :style="{ height, width: '100%' }"
    />
  </div>
</template>
