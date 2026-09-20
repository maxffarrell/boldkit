/**
 * TreeView.vue — the ARIA tree pattern (parity with the React suite).
 *
 * Previously every node was tabbable, there was no ArrowUp/ArrowDown, each
 * treeitem was wrapped in a CollapsibleTrigger so its nearest role-bearing
 * ancestor was neither `tree` nor `group`, a button and a checkbox were nested
 * inside the treeitem, and `aria-selected` was emitted even with
 * selectionMode="none".
 */
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import TreeView from '@/components/ui/TreeView.vue'

const data = [
  {
    id: 'src',
    label: 'src',
    children: [
      { id: 'index', label: 'index.ts' },
      { id: 'app', label: 'app.tsx' },
    ],
  },
  { id: 'readme', label: 'README.md' },
]

const mountTree = (props: Record<string, unknown> = {}) =>
  mount(TreeView, {
    props: { data, defaultExpandedIds: ['src'], ...props },
    attachTo: document.body,
  })

const itemFor = (w: ReturnType<typeof mountTree>, label: string) =>
  w.findAll('[role="treeitem"]').find((el) => el.attributes('aria-label') === label)!

describe('TreeView.vue roving tabindex', () => {
  it('exposes exactly one tab stop', () => {
    const w = mountTree()
    const items = w.findAll('[role="treeitem"]')
    expect(items.length).toBeGreaterThan(1)
    expect(items.filter((el) => el.attributes('tabindex') === '0')).toHaveLength(1)
    w.unmount()
  })

  it('moves focus with ArrowDown/ArrowUp', async () => {
    const w = mountTree()
    await itemFor(w, 'src').trigger('keydown', { key: 'ArrowDown' })
    expect(itemFor(w, 'index.ts').attributes('tabindex')).toBe('0')

    await itemFor(w, 'index.ts').trigger('keydown', { key: 'ArrowDown' })
    expect(itemFor(w, 'app.tsx').attributes('tabindex')).toBe('0')

    await itemFor(w, 'app.tsx').trigger('keydown', { key: 'ArrowUp' })
    expect(itemFor(w, 'index.ts').attributes('tabindex')).toBe('0')
    w.unmount()
  })

  it('jumps to first/last with Home/End', async () => {
    const w = mountTree()
    await itemFor(w, 'src').trigger('keydown', { key: 'End' })
    expect(itemFor(w, 'README.md').attributes('tabindex')).toBe('0')

    await itemFor(w, 'README.md').trigger('keydown', { key: 'Home' })
    expect(itemFor(w, 'src').attributes('tabindex')).toBe('0')
    w.unmount()
  })

  it('collapses and expands with ArrowLeft/ArrowRight', async () => {
    const w = mountTree()
    expect(itemFor(w, 'src').attributes('aria-expanded')).toBe('true')

    await itemFor(w, 'src').trigger('keydown', { key: 'ArrowLeft' })
    expect(itemFor(w, 'src').attributes('aria-expanded')).toBe('false')

    await itemFor(w, 'src').trigger('keydown', { key: 'ArrowRight' })
    expect(itemFor(w, 'src').attributes('aria-expanded')).toBe('true')
    w.unmount()
  })
})

describe('TreeView.vue structure', () => {
  it('owns every treeitem from a tree or group', () => {
    const w = mountTree()
    for (const item of w.findAll('[role="treeitem"]')) {
      const owner = item.element.parentElement?.closest('[role="tree"],[role="group"]')
      expect(owner).not.toBeNull()
    }
    w.unmount()
  })

  it('nests no interactive control inside a treeitem', () => {
    const w = mountTree({ showCheckboxes: true, selectionMode: 'multiple' })
    for (const item of w.findAll('[role="treeitem"]')) {
      expect(item.element.querySelectorAll('button, input, a[href], [tabindex="0"]')).toHaveLength(0)
    }
    w.unmount()
  })

  it('omits aria-selected when selection is off', () => {
    const w = mountTree()
    for (const item of w.findAll('[role="treeitem"]')) {
      expect(item.attributes('aria-selected')).toBeUndefined()
    }
    w.unmount()
  })

  it('reports aria-selected when selection is on', async () => {
    const w = mountTree({ selectionMode: 'single' })
    const item = itemFor(w, 'README.md')
    expect(item.attributes('aria-selected')).toBe('false')
    await item.trigger('click')
    expect(itemFor(w, 'README.md').attributes('aria-selected')).toBe('true')
    w.unmount()
  })
})
