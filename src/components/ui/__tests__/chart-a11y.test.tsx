/**
 * Chart accessibility.
 *
 * Charts shipped with three systemic problems: `role="img"` wrappers made their
 * own labelled/interactive content presentational, a hover-only tooltip put
 * hundreds of nameless cells in the tab order, and the gauge and sparkline had
 * no accessible name at all.
 */
import { describe, it, expect } from 'vitest'
import { render, screen } from '@/test/test-utils'
import { axe } from 'vitest-axe'
import { GaugeChart } from '../chart/gauge-chart'
import { Sparkline } from '../chart/sparkline'
import { HeatmapChart } from '../chart/heatmap-chart'
import { SankeyChart } from '../chart/sankey-chart'

describe('GaugeChart', () => {
  it('exposes its value as a meter', () => {
    render(<GaugeChart value={42} min={0} max={200} label="CPU" />)
    const meter = screen.getByRole('meter')
    expect(meter).toHaveAccessibleName('CPU')
    expect(meter).toHaveAttribute('aria-valuenow', '42')
    expect(meter).toHaveAttribute('aria-valuemin', '0')
    expect(meter).toHaveAttribute('aria-valuemax', '200')
  })

  it('reports the formatted value as valuetext', () => {
    render(<GaugeChart value={42} valueFormatter={(v) => `${v} percent`} label="CPU" />)
    expect(screen.getByRole('meter')).toHaveAttribute('aria-valuetext', '42 percent')
  })
})

describe('Sparkline', () => {
  it('has a derived accessible name', () => {
    render(<Sparkline data={[1, 5, 3, 9]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Sparkline, 4 points, from 1 to 9'
    )
  })

  it('accepts an explicit label', () => {
    render(<Sparkline data={[1, 2]} ariaLabel="Weekly signups" />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Weekly signups')
  })

  it('names the empty state too', () => {
    render(<Sparkline data={[]} />)
    expect(screen.getByRole('img')).toHaveAccessibleName('Sparkline, no data')
  })
})

describe('HeatmapChart', () => {
  const data = [
    { row: 'Mon', col: 'AM', value: 3 },
    { row: 'Mon', col: 'PM', value: 7 },
  ]

  it('does not hide its own cells behind role=img', () => {
    render(<HeatmapChart data={data} rows={['Mon']} cols={['AM', 'PM']} ariaLabel="Visits" />)
    // role="img" on the wrapper made every labelled cell presentational.
    expect(screen.getByRole('group', { name: 'Visits' })).toBeInTheDocument()
    expect(screen.getByLabelText('Mon, AM: 3')).toBeInTheDocument()
  })

  it('keeps non-interactive cells out of the tab order', () => {
    const { container } = render(
      <HeatmapChart data={data} rows={['Mon']} cols={['AM', 'PM']} ariaLabel="Visits" />
    )
    // showTooltip defaults to true; that is a mouse affordance and must not
    // make every cell a tab stop.
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0)
  })

  it('makes cells tabbable only when they are interactive', () => {
    const { container } = render(
      <HeatmapChart
        data={data}
        rows={['Mon']}
        cols={['AM', 'PM']}
        ariaLabel="Visits"
        onCellClick={() => {}}
      />
    )
    expect(container.querySelectorAll('[tabindex="0"]').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button')[0]).toHaveAccessibleName('Mon, AM: 3')
  })

  it('has no axe violations', async () => {
    const { container } = render(
      <HeatmapChart data={data} rows={['Mon']} cols={['AM', 'PM']} ariaLabel="Visits" />
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})

describe('SankeyChart', () => {
  const nodes = [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }]
  const links = [{ source: 'a', target: 'b', value: 5 }]

  it('offers a text alternative to the diagram', () => {
    render(<SankeyChart nodes={nodes} links={links} ariaLabel="Flow" />)
    // The visual only exposes its data through a mouse-hover tooltip.
    const table = screen.getByRole('table', { name: 'Flow' })
    expect(table).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: '5' })).toBeInTheDocument()
  })
})
