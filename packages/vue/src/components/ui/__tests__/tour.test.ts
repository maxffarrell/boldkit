/**
 * Tour.vue — modal dialog semantics (parity with the React suite).
 *
 * The tour covers the page with an opaque scrim but shipped as a bare <div>:
 * no role, no aria-modal, no accessible name, no initial focus, no focus trap,
 * no focus restore, and Escape did nothing (WCAG 2.1.2 / 4.1.2).
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, nextTick } from 'vue'
import Tour from '@/components/ui/Tour.vue'

const steps = [
  { target: '#one', title: 'First stop', description: 'Look here' },
  { target: '#two', title: 'Second stop', description: 'Then here' },
]

const Harness = defineComponent({
  components: { Tour },
  props: { open: { type: Boolean, default: false } },
  setup: () => ({ steps }),
  template: `
    <div>
      <button type="button" id="opener">Opener</button>
      <div id="one">one</div>
      <div id="two">two</div>
      <Tour :steps="steps" :open="open" />
    </div>
  `,
})

const dialog = () => document.querySelector('[role="dialog"]') as HTMLElement | null

describe('Tour.vue dialog semantics', () => {
  it('is a modal dialog with a name and description', async () => {
    const w = mount(Harness, { props: { open: true }, attachTo: document.body })
    await nextTick()

    const el = dialog()
    expect(el).not.toBeNull()
    expect(el!.getAttribute('aria-modal')).toBe('true')

    const titleId = el!.getAttribute('aria-labelledby')!
    const descId = el!.getAttribute('aria-describedby')!
    expect(document.getElementById(titleId)?.textContent?.trim()).toBe('First stop')
    expect(document.getElementById(descId)?.textContent?.trim()).toBe('Look here')
    w.unmount()
  })

  it('moves focus into the dialog on open', async () => {
    const w = mount(Harness, { attachTo: document.body })
    await w.setProps({ open: true })
    await nextTick()
    await nextTick()

    expect(dialog()!.contains(document.activeElement)).toBe(true)
    w.unmount()
  })

  it('closes on Escape', async () => {
    const w = mount(Harness, { props: { open: true }, attachTo: document.body })
    await nextTick()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await nextTick()

    expect(w.findComponent(Tour).emitted('update:open')?.at(-1)).toEqual([false])
    w.unmount()
  })

  it('restores focus to the previously focused element on close', async () => {
    const w = mount(Harness, { attachTo: document.body })
    const opener = document.getElementById('opener') as HTMLElement
    opener.focus()
    expect(document.activeElement).toBe(opener)

    await w.setProps({ open: true })
    await nextTick()
    await nextTick()
    expect(dialog()!.contains(document.activeElement)).toBe(true)

    await w.setProps({ open: false })
    await nextTick()
    expect(document.activeElement).toBe(opener)
    w.unmount()
  })
})
