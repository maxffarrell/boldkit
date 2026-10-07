/**
 * DatePicker / TimePicker — controlled/uncontrolled behaviour and a11y.
 *
 * Both detected "controlled" with `value !== undefined`, which is a *legal
 * controlled value* for an optional date. The ordinary
 * `const [d, setD] = useState<Date>()` + `value={d}` pattern therefore started
 * uncontrolled, silently flipped to controlled on the first pick, and flipped
 * back on clear — redisplaying a stale internal date. TimePicker also styled
 * out-of-range options as disabled without disabling them.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { DatePicker } from '../date-picker'
import { TimePicker } from '../time-picker'

describe('DatePicker control mode', () => {
  it('stays controlled when the controlled value is undefined', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    // The canonical usage: useState<Date>() starts undefined.
    render(<DatePicker value={undefined} onChange={onChange} data-testid="trigger" />)

    const trigger = screen.getByTestId('trigger')
    await user.click(trigger)
    const day = screen
      .getAllByRole('gridcell')
      .find((c) => !c.hasAttribute('disabled') && c.textContent?.trim())
    await user.click(day!.querySelector('button') ?? day!)

    expect(onChange).toHaveBeenCalled()
    // Controlled: the parent owns the value, so the trigger must NOT have
    // adopted an internal one.
    expect(trigger).toHaveTextContent('Pick a date')
  })

  it('supports uncontrolled use via defaultValue', () => {
    render(<DatePicker defaultValue={new Date(2026, 0, 15)} />)
    expect(screen.getByRole('button')).toHaveTextContent('Jan 15, 2026')
  })

  it('forwards rest props and a ref to the trigger', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<DatePicker ref={ref} id="dob" data-testid="dp" />)
    expect(ref.current).not.toBeNull()
    expect(screen.getByTestId('dp')).toHaveAttribute('id', 'dob')
  })

  it('warns when switching control modes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { rerender } = render(<DatePicker />)
    rerender(<DatePicker value={new Date(2026, 0, 1)} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[DatePicker]'))
    warn.mockRestore()
  })
})

describe('TimePicker options', () => {
  const at = (h: number, m: number, s = 0) => new Date(2026, 0, 1, h, m, s)

  it('labels each column as a listbox', async () => {
    const user = userEvent.setup()
    render(<TimePicker defaultValue={at(9, 30)} showSeconds />)
    await user.click(screen.getByRole('button'))

    // Columns had visual headers that were not programmatically associated —
    // a screen reader heard an unlabelled list of numbers.
    expect(screen.getByRole('listbox', { name: 'Hour' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Minute' })).toBeInTheDocument()
    expect(screen.getByRole('listbox', { name: 'Second' })).toBeInTheDocument()
  })

  it('really disables out-of-range hours instead of only fading them', async () => {
    const user = userEvent.setup()
    render(<TimePicker defaultValue={at(12, 0)} format="24h" minTime={at(10, 0)} />)
    await user.click(screen.getByRole('button'))

    const hours = screen.getByRole('listbox', { name: 'Hour' })
    const nine = [...hours.querySelectorAll('button')].find((b) => b.textContent === '09')
    expect(nine).toBeDisabled()
  })

  it('applies the range to the minute column too', async () => {
    const user = userEvent.setup()
    render(<TimePicker defaultValue={at(10, 30)} format="24h" minTime={at(10, 15)} />)
    await user.click(screen.getByRole('button'))

    const minutes = screen.getByRole('listbox', { name: 'Minute' })
    const buttons = [...minutes.querySelectorAll('button')]
    // The minute column never consulted isTimeDisabled at all.
    expect(buttons.some((b) => b.hasAttribute('disabled'))).toBe(true)
  })

  it('marks the selected option', async () => {
    const user = userEvent.setup()
    render(<TimePicker defaultValue={at(9, 30)} format="24h" />)
    await user.click(screen.getByRole('button'))

    const hours = screen.getByRole('listbox', { name: 'Hour' })
    const nine = [...hours.querySelectorAll('button')].find((b) => b.textContent === '09')
    expect(nine).toHaveAttribute('aria-selected', 'true')
  })
})
