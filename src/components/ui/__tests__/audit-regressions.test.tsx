/**
 * Regression tests for the bugs found in the 2026-09 React/Vue audit.
 *
 * Each block names the defect it pins so a future refactor that reintroduces
 * it fails here rather than in a consumer's app.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import {
  Stepper,
  StepperList,
  StepperItem,
  StepperTrigger,
  StepperSeparator,
  StepperContent,
  StepperActions,
} from '../stepper'
import { Carousel, CarouselContent, CarouselItem } from '../carousel'
import { GaugeChart } from '../chart/gauge-chart'
import { HeatmapChart } from '../chart/heatmap-chart'
import { SankeyChart } from '../chart/sankey-chart'
import { TagInput } from '../tag-input'
import { Rating } from '../rating'
import { Combobox, ComboboxMultiTrigger } from '../combobox'

describe('Stepper (totalSteps counted at any depth)', () => {
  // StepperItem is nested inside StepperList in every documented composition,
  // so counting only Stepper's DIRECT children produced totalSteps === 0 —
  // isLast became `activeStep === -1`, so a wizard could never be completed.
  function ThreeStep({ onComplete }: { onComplete?: () => void }) {
    return (
      <Stepper>
        <StepperList>
          <StepperItem index={0}>
            <StepperTrigger />
          </StepperItem>
          <StepperItem index={1}>
            <StepperTrigger />
          </StepperItem>
          <StepperItem index={2}>
            <StepperTrigger />
          </StepperItem>
        </StepperList>
        <StepperContent index={0}>Step one</StepperContent>
        <StepperContent index={1}>Step two</StepperContent>
        <StepperContent index={2}>Step three</StepperContent>
        <StepperActions onComplete={onComplete} />
      </Stepper>
    )
  }

  it('advances to the last step and offers Complete', async () => {
    const user = userEvent.setup()
    render(<ThreeStep />)
    expect(screen.getByText('Step one')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Step two')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Step three')).toBeInTheDocument()
    // On the final step the primary action becomes Complete, not Next.
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument()
  })

  it('fires onComplete instead of running past the end', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<ThreeStep onComplete={onComplete} />)

    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /next/i }))
    await user.click(screen.getByRole('button', { name: /complete/i }))

    expect(onComplete).toHaveBeenCalledTimes(1)
    // Still on the last step — it did not advance into a blank panel.
    expect(screen.getByText('Step three')).toBeInTheDocument()
  })

  it('accepts an explicit totalSteps override', () => {
    render(
      <Stepper totalSteps={1}>
        <StepperList>
          <StepperItem index={0}>
            <StepperTrigger />
          </StepperItem>
        </StepperList>
        <StepperContent index={0}>Only step</StepperContent>
        <StepperActions />
      </Stepper>
    )
    expect(screen.getByRole('button', { name: /complete/i })).toBeInTheDocument()
  })
})

describe('StepperSeparator outside a StepperItem', () => {
  // The documented usage snippet places the separator BETWEEN items inside
  // StepperList; useStepperItemContext() threw on the null context, so copying
  // the docs produced an immediate uncaught error.
  it('renders rather than throwing', () => {
    expect(() =>
      render(
        <Stepper>
          <StepperList>
            <StepperItem index={0}>
              <StepperTrigger />
            </StepperItem>
            <StepperSeparator data-testid="sep" />
            <StepperItem index={1}>
              <StepperTrigger />
            </StepperItem>
          </StepperList>
        </Stepper>
      )
    ).not.toThrow()
    expect(screen.getByTestId('sep')).toBeInTheDocument()
  })
})

describe('Carousel keyboard handling', () => {
  it('leaves Arrow keys to a form field inside a slide', async () => {
    const user = userEvent.setup()
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>
            <input aria-label="Name" defaultValue="abc" />
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    const input = screen.getByLabelText('Name') as HTMLInputElement
    await user.click(input)
    input.setSelectionRange(3, 3)
    await user.keyboard('{ArrowLeft}')
    // The carousel used to preventDefault in the CAPTURE phase, so the input
    // never saw the key and the caret could not move.
    expect(input.selectionStart).toBe(2)
  })

  it('names its region landmark', () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>slide</CarouselItem>
        </CarouselContent>
      </Carousel>
    )
    expect(screen.getByRole('region', { name: 'Carousel' })).toBeInTheDocument()
  })
})

describe('GaugeChart zones are data units, not dial percentages', () => {
  it('maps a zone through min/max before drawing it', () => {
    // With min=0 max=200, a zone of 0→100 covers the first HALF of the range.
    // It used to be fed to the 0–100 dial scale raw, painting the first half
    // of the *dial* and selecting the wrong current-zone colour.
    const { container } = render(
      <GaugeChart
        value={50}
        min={0}
        max={200}
        zones={[
          { from: 0, to: 100, color: '#aaaaaa' },
          { from: 100, to: 200, color: '#bbbbbb' },
        ]}
      />
    )
    const zonePaths = [...container.querySelectorAll('path[stroke="#aaaaaa"], path[stroke="#bbbbbb"]')]
    expect(zonePaths).toHaveLength(2)
    // Both arcs must describe real coordinates — a raw 0–200 input to a 0–100
    // scale would push the second arc past the end of the sweep.
    for (const p of zonePaths) {
      expect(p.getAttribute('d')).not.toMatch(/NaN|Infinity/)
    }
  })

  it('renders the default 0-100 zones unchanged', () => {
    const { container } = render(<GaugeChart value={50} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('charts tolerate undefined data', () => {
  // The memos that read `data` ran ABOVE the `if (!data …)` guard, so the
  // guard's !data branch was unreachable and a still-loading fetch threw.
  it('HeatmapChart renders the empty state instead of throwing', () => {
    expect(() =>
      render(
        <HeatmapChart
          data={undefined as never}
          rows={['a']}
          cols={['b']}
          emptyState="No data"
        />
      )
    ).not.toThrow()
    expect(screen.getByText('No data')).toBeInTheDocument()
  })

  it('SankeyChart renders the empty state instead of throwing', () => {
    expect(() =>
      render(
        <SankeyChart
          nodes={undefined as never}
          links={undefined as never}
          emptyState="No flow"
        />
      )
    ).not.toThrow()
    expect(screen.getByText('No flow')).toBeInTheDocument()
  })
})

describe('TagInput combobox semantics', () => {
  // Arrow-key highlighting and the validation errors were purely visual:
  // nothing announced that suggestions appeared, which one was active, or why
  // an entry was rejected (WCAG 4.1.2 / 3.3.1).
  const suggestions = ['alpha', 'alto', 'beta']

  it('reports collapsed state with no suggestions showing', () => {
    render(<TagInput suggestions={suggestions} />)
    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'false')
    expect(input).not.toHaveAttribute('aria-controls')
  })

  it('exposes the suggestion list as a listbox of options', async () => {
    const user = userEvent.setup()
    render(<TagInput suggestions={suggestions} />)
    await user.type(screen.getByRole('combobox'), 'al')

    const input = screen.getByRole('combobox')
    expect(input).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('listbox')).toHaveAttribute('id', input.getAttribute('aria-controls'))
    expect(screen.getAllByRole('option')).toHaveLength(2)
  })

  it('tracks the active option with aria-activedescendant', async () => {
    const user = userEvent.setup()
    render(<TagInput suggestions={suggestions} />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'al')
    expect(input).not.toHaveAttribute('aria-activedescendant')

    await user.keyboard('{ArrowDown}')
    const active = input.getAttribute('aria-activedescendant')
    expect(active).toBeTruthy()
    expect(document.getElementById(active!)).toHaveAttribute('aria-selected', 'true')
  })

  it('announces a rejected entry and links it to the input', async () => {
    const user = userEvent.setup()
    render(<TagInput defaultValue={['alpha']} />)
    const input = screen.getByRole('combobox')
    await user.type(input, 'alpha{Enter}')

    const alert = screen.getByRole('alert')
    expect(input).toHaveAttribute('aria-describedby', alert.getAttribute('id'))
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('keeps options out of the tab order', async () => {
    const user = userEvent.setup()
    render(<TagInput suggestions={suggestions} />)
    await user.type(screen.getByRole('combobox'), 'al')
    for (const option of screen.getAllByRole('option')) {
      expect(option.tagName).not.toBe('BUTTON')
      expect(option).not.toHaveAttribute('tabindex')
    }
  })
})

describe('Rating roving tabindex', () => {
  it('moves DOM focus with the value', async () => {
    const user = userEvent.setup()
    render(<Rating defaultValue={1} max={5} />)
    const stars = screen.getAllByRole('button')

    await user.tab()
    expect(stars[0]).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    // Focus must follow the roving tabindex, not stay behind on star 1.
    expect(stars[1]).toHaveFocus()
    expect(stars[1]).toHaveAttribute('tabindex', '0')
    expect(stars[0]).toHaveAttribute('tabindex', '-1')
  })

  it('exposes a read-only rating instead of removing it from the a11y tree', () => {
    render(<Rating value={3} readOnly />)
    const group = screen.getByRole('group')
    expect(group).toHaveAttribute('aria-readonly', 'true')
    // Disabling every star would hide the value from assistive tech entirely.
    for (const star of screen.getAllByRole('button')) {
      expect(star).not.toBeDisabled()
    }
  })

  it('forwards rest props and a ref to the group', () => {
    const ref = { current: null as HTMLDivElement | null }
    render(<Rating value={2} ref={ref} data-testid="rating" id="my-rating" />)
    expect(ref.current).not.toBeNull()
    expect(screen.getByTestId('rating')).toHaveAttribute('id', 'my-rating')
  })
})

describe('ComboboxMultiTrigger chip removal', () => {
  const values = [
    { value: 'a', label: 'Apple' },
    { value: 'b', label: 'Banana' },
  ]

  it('removes a chip from the keyboard', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn()
    render(
      <Combobox>
        <ComboboxMultiTrigger values={values} onRemove={onRemove} />
      </Combobox>
    )
    // Used to be a bare <svg onClick>: unfocusable, unnamed, mouse-only.
    const remove = screen.getByRole('button', { name: 'Remove Apple' })
    remove.focus()
    await user.keyboard('{Enter}')
    expect(onRemove).toHaveBeenCalledWith('a')
  })

  it('does not nest the remove buttons inside the combobox', () => {
    render(
      <Combobox>
        <ComboboxMultiTrigger values={values} onRemove={() => {}} />
      </Combobox>
    )
    const combobox = screen.getByRole('combobox')
    expect(combobox.querySelectorAll('button')).toHaveLength(0)
  })

  it('exposes aria-expanded on the combobox', () => {
    render(
      <Combobox>
        <ComboboxMultiTrigger values={values} onRemove={() => {}} />
      </Combobox>
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded')
  })
})

describe('Stepper step semantics', () => {
  // The tab roles were structurally invalid: StepperItem wraps each trigger,
  // so no `tab` was a direct child of the `tablist`; separators sat inside the
  // tablist; there was no aria-controls; and none of the arrow-key navigation
  // `role="tablist"` promises existed.
  const tree = (
    <Stepper>
      <StepperList>
        <StepperItem index={0}>
          <StepperTrigger />
        </StepperItem>
        <StepperItem index={1}>
          <StepperTrigger />
        </StepperItem>
      </StepperList>
      <StepperContent index={0}>One</StepperContent>
      <StepperContent index={1}>Two</StepperContent>
    </Stepper>
  )

  it('marks the active step with aria-current', () => {
    render(tree)
    const steps = screen.getAllByRole('button')
    expect(steps[0]).toHaveAttribute('aria-current', 'step')
    expect(steps[1]).not.toHaveAttribute('aria-current')
  })

  it('links each step to its panel', () => {
    render(tree)
    const step = screen.getAllByRole('button')[0]
    const panelId = step.getAttribute('aria-controls')!
    expect(document.getElementById(panelId)).toHaveTextContent('One')
  })

  it('claims no tab roles it does not implement', () => {
    const { container } = render(tree)
    expect(container.querySelector('[role="tablist"]')).toBeNull()
    expect(container.querySelector('[role="tab"]')).toBeNull()
    expect(container.querySelector('[role="tabpanel"]')).toBeNull()
  })
})
