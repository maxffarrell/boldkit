/**
 * ChartContainer.vue — CSS-variable resolution and the a11y contract.
 *
 * ECharts renders to a canvas, which has no CSS cascade: assigning
 * `hsl(var(--primary))` to `ctx.fillStyle` is silently ignored and the previous
 * colour stays. Before this was fixed, every Vue chart colour and the whole
 * `neubrutalismTheme` were inert. These tests pin the resolution pass and the
 * accessible-name contract that mirrors the React container.
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ChartContainer from '@/components/ui/ChartContainer.vue'
import { resolveCssVars } from '@/components/ui/chart-utils'

describe('resolveCssVars', () => {
  function elementWith(tokens: Record<string, string>) {
    const el = document.createElement('div')
    for (const [k, v] of Object.entries(tokens)) el.style.setProperty(k, v)
    document.body.appendChild(el)
    return el
  }

  it('substitutes a token into an hsl() wrapper', () => {
    const el = elementWith({ '--primary': '47 100% 50%' })
    expect(resolveCssVars('hsl(var(--primary))', el)).toBe('hsl(47 100% 50%)')
  })

  it('walks nested objects and arrays', () => {
    const el = elementWith({ '--foreground': '0 0% 4%', '--primary': '47 100% 50%' })
    const resolved = resolveCssVars(
      {
        color: ['hsl(var(--primary))', '#fixed'],
        axisLine: { lineStyle: { color: 'hsl(var(--foreground))' } },
      },
      el
    )
    expect(resolved).toEqual({
      color: ['hsl(47 100% 50%)', '#fixed'],
      axisLine: { lineStyle: { color: 'hsl(0 0% 4%)' } },
    })
  })

  it('leaves no var() behind', () => {
    const el = elementWith({ '--primary': '47 100% 50%' })
    const out = JSON.stringify(resolveCssVars({ a: 'hsl(var(--primary))' }, el))
    expect(out).not.toContain('var(')
  })

  it('honours the inline fallback for an undefined token', () => {
    const el = elementWith({})
    expect(resolveCssVars('hsl(var(--nope, 0 0% 50%))', el)).toBe('hsl(0 0% 50%)')
  })

  it('passes functions through untouched', () => {
    const el = elementWith({ '--primary': '47 100% 50%' })
    const formatter = (v: number) => `${v}%`
    expect(resolveCssVars({ formatter }, el).formatter).toBe(formatter)
  })

  it('falls back to :root when no element is given', () => {
    // This is what makes the very first render correct, before the container
    // template ref is attached — otherwise charts flash unresolved colours.
    document.documentElement.style.setProperty('--primary', '47 100% 50%')
    expect(resolveCssVars('hsl(var(--primary))', null)).toBe('hsl(47 100% 50%)')
  })
})

describe('ChartContainer.vue', () => {
  const config = { a: { label: 'A', color: '#000' } }
  // The stub serializes whatever VChart is handed into the DOM, so the test
  // asserts on the real rendered output rather than on test-utils internals.
  const stubs = {
    // vue-echarts registers itself as `Echarts`, not `VChart`.
    Echarts: {
      props: ['option', 'theme'],
      template:
        '<div data-testid="vchart" :data-option="JSON.stringify(option)" :data-theme-json="JSON.stringify(theme)" />',
    },
  }
  const renderedOption = (w: ReturnType<typeof mount>) =>
    JSON.parse(w.get('[data-testid="vchart"]').attributes('data-option') as string)
  const renderedThemeJson = (w: ReturnType<typeof mount>) =>
    w.get('[data-testid="vchart"]').attributes('data-theme-json') as string

  it('resolves css vars in the option before handing it to the renderer', () => {
    // Set on :root — happy-dom doesn't inherit custom properties into
    // getComputedStyle for descendants, so resolution goes via the :root path.
    document.documentElement.style.setProperty('--primary', '47 100% 50%')
    const w = mount(ChartContainer, {
      props: {
        config,
        option: { color: ['hsl(var(--primary))'] },
        ariaLabel: 'Revenue',
      },
      global: { stubs },
    })
    expect(renderedOption(w)).toEqual({ color: ['hsl(47 100% 50%)'] })
  })

  it('resolves css vars in the theme too', () => {
    document.documentElement.style.setProperty('--foreground', '0 0% 4%')
    const w = mount(ChartContainer, {
      props: { config, option: {}, ariaLabel: 'Revenue' },
      global: { stubs },
    })
    expect(renderedThemeJson(w)).not.toContain('var(')
    expect(renderedThemeJson(w)).toContain('hsl(0 0% 4%)')
  })

  it('exposes an accessible name via role=img', () => {
    const w = mount(ChartContainer, {
      props: { config, option: {}, ariaLabel: 'Revenue' },
      global: { stubs },
    })
    expect(w.attributes('role')).toBe('img')
    expect(w.attributes('aria-label')).toBe('Revenue')
  })

  it('drops role=img while loading so the status region is announced', () => {
    const w = mount(ChartContainer, {
      props: { config, option: {}, ariaLabel: 'Revenue', loading: true },
      global: { stubs },
    })
    expect(w.attributes('aria-busy')).toBe('true')
    expect(w.attributes('role')).toBeUndefined()
    expect(w.attributes('aria-label')).toBeUndefined()
  })
})
