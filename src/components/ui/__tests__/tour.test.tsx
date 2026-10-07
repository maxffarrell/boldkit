/**
 * Tour — modal dialog semantics.
 *
 * The tour covers the page with an opaque scrim but shipped as a bare <div>:
 * no role, no aria-modal, no accessible name, no initial focus, no focus trap,
 * no focus restore, and Escape did nothing. Keyboard users tabbed into the
 * obscured page behind the scrim (WCAG 2.1.2 / 4.1.2).
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { Tour } from '../tour'

const steps = [
  { target: '#one', title: 'First stop', description: 'Look here' },
  { target: '#two', title: 'Second stop', description: 'Then here' },
]

function renderTour(props: Partial<React.ComponentProps<typeof Tour>> = {}) {
  return render(
    <div>
      <button type="button" id="opener">
        Opener
      </button>
      <div id="one">one</div>
      <div id="two">two</div>
      <Tour steps={steps} open {...props} />
    </div>
  )
}

describe('Tour dialog semantics', () => {
  it('is a modal dialog with an accessible name and description', () => {
    renderTour()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('First stop')
    expect(dialog).toHaveAccessibleDescription('Look here')
  })

  it('moves focus into the dialog on open', () => {
    renderTour()
    const dialog = screen.getByRole('dialog')
    expect(dialog.contains(document.activeElement)).toBe(true)
  })

  it('closes on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    renderTour({ onOpenChange })
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('keeps Tab inside the dialog', async () => {
    const user = userEvent.setup()
    renderTour()
    const dialog = screen.getByRole('dialog')

    // Walk well past the number of controls in the popover; focus must never
    // land on the page behind the scrim.
    for (let i = 0; i < 12; i++) {
      await user.tab()
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('wraps backwards with Shift+Tab too', async () => {
    const user = userEvent.setup()
    renderTour()
    const dialog = screen.getByRole('dialog')
    for (let i = 0; i < 6; i++) {
      await user.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }
  })

  it('restores focus to the previously focused element on close', () => {
    const Harness = ({ open }: { open: boolean }) => (
      <div>
        <button type="button" id="opener">
          Opener
        </button>
        <div id="one">one</div>
        <div id="two">two</div>
        <Tour steps={steps} open={open} />
      </div>
    )
    const { rerender } = render(<Harness open={false} />)

    const opener = screen.getByRole('button', { name: 'Opener' })
    opener.focus()
    expect(document.activeElement).toBe(opener)

    rerender(<Harness open />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)

    rerender(<Harness open={false} />)
    expect(document.activeElement).toBe(opener)
  })
})
