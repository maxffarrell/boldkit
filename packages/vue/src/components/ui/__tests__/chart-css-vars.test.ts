/**
 * Every Vue chart must resolve CSS variables before handing options to ECharts.
 *
 * ECharts renders to a canvas, which has no CSS cascade: assigning
 * `hsl(var(--primary))` to `ctx.fillStyle` is silently ignored and the previous
 * colour stays. The whole palette and the `neubrutalismTheme` were therefore
 * inert. `ChartContainer` was only half the fix — most chart components render
 * `<VChart>` directly and never go through it.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'

import DonutChart from '@/components/ui/DonutChart.vue'
import RadarChart from '@/components/ui/RadarChart.vue'
import RadialBarChart from '@/components/ui/RadialBarChart.vue'
import FunnelChart from '@/components/ui/FunnelChart.vue'
import TreemapChart from '@/components/ui/TreemapChart.vue'
import HeatmapChart from '@/components/ui/HeatmapChart.vue'
import SankeyChart from '@/components/ui/SankeyChart.vue'

// The stub records exactly what VChart is handed.
const stubs = {
  Echarts: {
    props: ['option', 'theme'],
    template:
      '<div data-testid="vchart" :data-option="JSON.stringify(option)" :data-theme-json="JSON.stringify(theme)" />',
  },
}

const CHARTS: [string, Component, Record<string, unknown>][] = [
  ['DonutChart', DonutChart, { data: [{ name: 'A', value: 1 }, { name: 'B', value: 2 }] }],
  ['RadarChart', RadarChart, { data: [{ subject: 'A', x: 1 }], dataKeys: ['x'], config: { x: { label: 'X' } } }],
  ['RadialBarChart', RadialBarChart, { data: [{ name: 'A', value: 1 }], config: { A: { label: 'A' } } }],
  ['FunnelChart', FunnelChart, { data: [{ name: 'A', value: 2 }, { name: 'B', value: 1 }] }],
  ['TreemapChart', TreemapChart, { data: [{ name: 'A', value: 1 }] }],
  [
    'HeatmapChart',
    HeatmapChart,
    { data: [{ row: 'r', col: 'c', value: 1 }], rows: ['r'], cols: ['c'] },
  ],
  [
    'SankeyChart',
    SankeyChart,
    { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], links: [{ source: 'a', target: 'b', value: 1 }] },
  ],
]

beforeAll(() => {
  // happy-dom doesn't inherit custom properties into getComputedStyle for
  // descendants, so resolution goes via the :root fallback path.
  const root = document.documentElement.style
  for (const [token, value] of [
    ['--primary', '47 100% 50%'],
    ['--secondary', '174 62% 56%'],
    ['--accent', '49 100% 71%'],
    ['--success', '152 69% 69%'],
    ['--warning', '49 100% 60%'],
    ['--info', '212 100% 73%'],
    ['--foreground', '240 10% 10%'],
    ['--background', '60 9% 98%'],
    ['--muted-foreground', '240 4% 46%'],
    ['--shadow-color', '240 10% 10%'],
    ['--destructive', '0 84% 60%'],
  ]) {
    root.setProperty(token, value)
  }
})

describe.each(CHARTS)('%s', (_name, Component, props) => {
  const render = () => mount(Component, { props, global: { stubs }, attachTo: document.body })

  it('leaves no unresolved var() in the option', () => {
    const w = render()
    const option = w.get('[data-testid="vchart"]').attributes('data-option')
    expect(option).toBeDefined()
    expect(option).not.toContain('var(')
    w.unmount()
  })

  it('leaves no unresolved var() in the theme', () => {
    const w = render()
    const theme = w.get('[data-testid="vchart"]').attributes('data-theme-json')
    expect(theme).toBeDefined()
    expect(theme).not.toContain('var(')
    // And it is actually resolved, not just stripped.
    expect(theme).toContain('hsl(')
    w.unmount()
  })

  it('has an accessible name', () => {
    const w = render()
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBeTruthy()
    w.unmount()
  })
})

describe('empty-state prop parity', () => {
  // React charts call this prop `emptyState`; Vue called it `emptyMessage`, so
  // the "unified BoldKit chart API" did not actually transfer between frameworks.
  const EMPTY: [string, Component, Record<string, unknown>][] = [
    ['DonutChart', DonutChart, { data: [], config: {} }],
    ['RadarChart', RadarChart, { data: [], dataKeys: [], config: {} }],
    ['RadialBarChart', RadialBarChart, { data: [], config: {} }],
    ['FunnelChart', FunnelChart, { data: [] }],
    ['TreemapChart', TreemapChart, { data: [] }],
    ['HeatmapChart', HeatmapChart, { data: [], rows: [], cols: [] }],
    ['SankeyChart', SankeyChart, { nodes: [], links: [] }],
  ]

  it.each(EMPTY)('%s accepts the React prop name', (_n, Component, props) => {
    const w = mount(Component, {
      props: { ...props, emptyState: 'Nothing here' },
      global: { stubs },
    })
    expect(w.text()).toContain('Nothing here')
    w.unmount()
  })

  it.each(EMPTY)('%s still accepts the original Vue name', (_n, Component, props) => {
    const w = mount(Component, {
      props: { ...props, emptyMessage: 'Still works' },
      global: { stubs },
    })
    expect(w.text()).toContain('Still works')
    w.unmount()
  })
})
