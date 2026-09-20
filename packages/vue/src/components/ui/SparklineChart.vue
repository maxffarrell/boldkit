<script setup lang="ts">
import { computed } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart } from 'echarts/charts'
import { GridComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { cn } from '@/lib/utils'
import { extent } from './chart-utils'

// Register ECharts components
use([CanvasRenderer, BarChart, LineChart, GridComponent])

interface SparklineProps {
  data: number[]
  type?: 'line' | 'area' | 'bar'
  color?: string
  height?: number
  width?: number | string
  showEndDot?: boolean
  strokeWidth?: number
  trend?: 'up' | 'down' | 'neutral'
  animated?: boolean
  /** Accessible name. A sparkline conveys a trend, which is invisible to AT
   *  without one; defaults to a summary of the series. */
  ariaLabel?: string
  class?: string
}

const props = withDefaults(defineProps<SparklineProps>(), {
  type: 'line',
  height: 32,
  width: '100%',
  showEndDot: false,
  strokeWidth: 2,
  animated: true,
})

const isEmpty = computed(() => !props.data || props.data.length === 0)

// `aria-label` on a plain <div> is ignored by most AT — it needs a role.
// Default the name to something useful rather than leaving the trend invisible.
const accessibleLabel = computed(() =>
  props.ariaLabel ??
  (isEmpty.value
    ? 'Sparkline, no data'
    : `Sparkline, ${props.data.length} points, from ${props.data[0]} to ${props.data[props.data.length - 1]}`)
)

const resolvedColor = computed(() => {
  if (props.color) return props.color
  if (props.trend === 'up') return 'hsl(var(--success))'
  if (props.trend === 'down') return 'hsl(var(--destructive))'
  return 'hsl(var(--primary))'
})

const strokeColor = 'hsl(var(--foreground))'

const option = computed(() => {
  const dataExtent = extent(props.data)
  const dataMin = props.data.length > 0 ? dataExtent.min : 0
  const dataMax = props.data.length > 0 ? dataExtent.max : 1
  const range = dataMax - dataMin
  // Use 10% of the range as padding; fall back to abs(value)*0.1 for flat data, or 1 for zero
  const axisPadding = range === 0 ? (Math.abs(dataMax) * 0.1 || 1) : range * 0.1

  const baseOption = {
    animation: props.animated,
    animationDuration: 300,
    grid: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    },
    xAxis: {
      type: 'category',
      show: false,
      data: props.data.map((_, i) => i),
    },
    yAxis: {
      type: 'value',
      show: false,
      min: dataMin - axisPadding,
      max: dataMax + axisPadding,
    },
  }

  if (props.type === 'bar') {
    return {
      ...baseOption,
      series: [{
        type: 'bar',
        data: props.data,
        itemStyle: {
          color: resolvedColor.value,
          borderColor: strokeColor,
          borderWidth: 1,
        },
      }],
    }
  }

  if (props.type === 'area') {
    return {
      ...baseOption,
      series: [{
        type: 'line',
        data: props.data,
        smooth: true,
        symbol: props.showEndDot ? 'circle' : 'none',
        symbolSize: (_: number, params: { dataIndex: number }) => params.dataIndex === props.data.length - 1 ? 8 : 0,
        lineStyle: {
          color: strokeColor,
          width: props.strokeWidth,
        },
        itemStyle: {
          color: resolvedColor.value,
          borderColor: strokeColor,
          borderWidth: 2,
        },
        areaStyle: {
          color: resolvedColor.value,
          opacity: 0.35,
        },
      }],
    }
  }

  // Default: line
  return {
    ...baseOption,
    series: [{
      type: 'line',
      data: props.data,
      smooth: true,
      symbol: props.showEndDot ? 'circle' : 'none',
      symbolSize: (_: number, params: { dataIndex: number }) => params.dataIndex === props.data.length - 1 ? 8 : 0,
      lineStyle: {
        color: strokeColor,
        width: props.strokeWidth,
      },
      itemStyle: {
        color: resolvedColor.value,
        borderColor: strokeColor,
        borderWidth: 2,
      },
    }],
  }
})
</script>

<template>
  <div
    role="img"
    :aria-label="accessibleLabel"
    :class="cn('inline-block', props.class)"
    :style="{ width: typeof width === 'number' ? `${width}px` : width, height: `${height}px` }"
  >
    <div v-if="isEmpty" class="h-full w-full border-b-2 border-dashed border-foreground/30" />
    <VChart v-else :option="option" :autoresize="true" style="width: 100%; height: 100%" />
  </div>
</template>
