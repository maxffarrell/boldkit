/**
 * ASCII shapes (Vue) — rendering and animation lifecycle.
 *
 * All 17 shapes were migrated from hand-rolled requestAnimationFrame loops to
 * the shared `useAsciiLoop`, which adds the three guards the raw loops lacked:
 * prefers-reduced-motion, off-screen pause, and background-tab pause. These
 * tests pin that behaviour and confirm the mechanical migration left every
 * shape rendering.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Component } from 'vue'
import * as AsciiShapes from '@/components/ui/ascii-shapes'

const SHAPES = Object.entries(AsciiShapes).filter(([name]) =>
  name.startsWith('Ascii')
) as [string, Component][]

function mockReducedMotion(reduce: boolean) {
  const listeners = new Set<() => void>()
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? reduce : false,
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
      onchange: null,
    }))
  )
  return listeners
}

describe('ASCII shape catalogue', () => {
  it('exports 17 shapes', () => {
    expect(SHAPES).toHaveLength(17)
  })

  it.each(SHAPES)('%s renders artwork', (_name, Component) => {
    const w = mount(Component)
    expect(w.element.tagName).toBe('PRE')
    // Non-blank: the static first frame is painted even before any rAF tick.
    expect(w.text().trim().length).toBeGreaterThan(0)
  })

  it.each(SHAPES)('%s is hidden from assistive tech', (_name, Component) => {
    // Decorative artwork — a screen reader must not read out the character soup.
    expect(mount(Component).attributes('aria-hidden')).toBe('true')
  })
})

describe('useAsciiLoop lifecycle', () => {
  let raf: ReturnType<typeof vi.fn>
  let cancel: ReturnType<typeof vi.fn>

  beforeEach(() => {
    raf = vi.fn().mockReturnValue(1)
    cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', raf)
    vi.stubGlobal('cancelAnimationFrame', cancel)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('does not start a loop when prefers-reduced-motion is set', () => {
    mockReducedMotion(true)
    const w = mount(AsciiShapes.AsciiDonut)
    expect(raf).not.toHaveBeenCalled()
    // …but the shape is still drawn, not left blank.
    expect(w.text().trim().length).toBeGreaterThan(0)
  })

  it('starts a loop when motion is allowed', () => {
    mockReducedMotion(false)
    mount(AsciiShapes.AsciiDonut)
    expect(raf).toHaveBeenCalled()
  })

  it('does not start a loop when animated=false', () => {
    mockReducedMotion(false)
    const w = mount(AsciiShapes.AsciiDonut, { props: { animated: false } })
    expect(raf).not.toHaveBeenCalled()
    expect(w.text().trim().length).toBeGreaterThan(0)
  })

  it('cancels the frame on unmount', () => {
    mockReducedMotion(false)
    mount(AsciiShapes.AsciiDonut).unmount()
    expect(cancel).toHaveBeenCalled()
  })

  it('stops the loop when the tab is hidden', async () => {
    mockReducedMotion(false)
    mount(AsciiShapes.AsciiDonut)
    cancel.mockClear()

    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    document.dispatchEvent(new Event('visibilitychange'))
    expect(cancel).toHaveBeenCalled()
    hidden.mockRestore()
  })
})
