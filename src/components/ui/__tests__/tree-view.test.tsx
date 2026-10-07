/**
 * TreeView — the ARIA tree pattern.
 *
 * The component previously made every node tabbable (a 200-node tree cost 200
 * Tab presses), had no ArrowUp/ArrowDown, wrapped each treeitem in a
 * CollapsibleTrigger so its nearest role-bearing ancestor was neither `tree`
 * nor `group`, nested a button and a checkbox inside the treeitem, and
 * advertised `aria-selected` even with selectionMode="none".
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { TreeView } from '../tree-view'

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

describe('TreeView roving tabindex', () => {
  it('exposes exactly one tab stop', () => {
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    const items = screen.getAllByRole('treeitem')
    expect(items.length).toBeGreaterThan(1)
    expect(items.filter((el) => el.getAttribute('tabindex') === '0')).toHaveLength(1)
  })

  it('moves focus with ArrowDown/ArrowUp', async () => {
    const user = userEvent.setup()
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    await user.tab()

    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('treeitem', { name: 'index.ts' })).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(screen.getByRole('treeitem', { name: 'app.tsx' })).toHaveFocus()
    await user.keyboard('{ArrowUp}')
    expect(screen.getByRole('treeitem', { name: 'index.ts' })).toHaveFocus()
  })

  it('jumps to first/last with Home/End', async () => {
    const user = userEvent.setup()
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    await user.tab()
    await user.keyboard('{End}')
    expect(screen.getByRole('treeitem', { name: 'README.md' })).toHaveFocus()
    await user.keyboard('{Home}')
    expect(screen.getByRole('treeitem', { name: 'src' })).toHaveFocus()
  })

  it('collapses and expands with ArrowLeft/ArrowRight', async () => {
    const user = userEvent.setup()
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    await user.tab()
    const parent = screen.getByRole('treeitem', { name: 'src' })
    expect(parent).toHaveAttribute('aria-expanded', 'true')

    await user.keyboard('{ArrowLeft}')
    expect(parent).toHaveAttribute('aria-expanded', 'false')
    await user.keyboard('{ArrowRight}')
    expect(parent).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('TreeView structure', () => {
  it('owns every treeitem from a tree or group', () => {
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    for (const item of screen.getAllByRole('treeitem')) {
      const owner = item.parentElement?.closest('[role="tree"],[role="group"]')
      expect(owner).not.toBeNull()
    }
  })

  it('nests no interactive control inside a treeitem', () => {
    render(<TreeView data={data} defaultExpandedIds={['src']} showCheckboxes selectionMode="multiple" />)
    for (const item of screen.getAllByRole('treeitem')) {
      const nested = item.querySelectorAll('button, input, a[href], [tabindex="0"]')
      expect([...nested]).toHaveLength(0)
    }
  })

  it('omits aria-selected when selection is off', () => {
    render(<TreeView data={data} defaultExpandedIds={['src']} />)
    for (const item of screen.getAllByRole('treeitem')) {
      expect(item).not.toHaveAttribute('aria-selected')
    }
  })

  it('reports aria-selected when selection is on', async () => {
    const user = userEvent.setup()
    render(<TreeView data={data} selectionMode="single" />)
    const item = screen.getByRole('treeitem', { name: 'README.md' })
    expect(item).toHaveAttribute('aria-selected', 'false')
    await user.click(item)
    expect(item).toHaveAttribute('aria-selected', 'true')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <TreeView data={data} defaultExpandedIds={['src']} showCheckboxes selectionMode="multiple" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
