import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from '../test/utils/test-utils'
import { ElevationProfile } from './elevation-profile'

describe('ElevationProfile', () => {
  const mockElevationData = [
    { distance: 0, elevation: 100, coordinate: [10.0, 60.0] as [number, number] },
    { distance: 0.5, elevation: 150, coordinate: [10.1, 60.1] as [number, number] },
    { distance: 1.0, elevation: 120, coordinate: [10.2, 60.2] as [number, number] },
  ]

  it('renders chart when visible', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={mockElevationData}
        totalDistance={1.0}
        isVisible={true}
        hoveredIndex={null}
        onHover={vi.fn()}
      />
    )

    // Check that ResponsiveContainer is rendered
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy()
  })

  it('does not render chart when not visible', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={mockElevationData}
        totalDistance={1.0}
        isVisible={false}
        hoveredIndex={null}
        onHover={vi.fn()}
      />
    )

    // Should render empty div
    expect(container.querySelector('.recharts-responsive-container')).toBeNull()
  })

  it('handles empty elevation data', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={[]}
        totalDistance={0}
        isVisible={true}
        hoveredIndex={null}
        onHover={vi.fn()}
      />
    )

    // Should not crash
    expect(container).toBeTruthy()
  })

  it('renders hover indicator when hoveredIndex is set', () => {
    const { container } = render(
      <ElevationProfile
        elevationData={mockElevationData}
        totalDistance={1.0}
        isVisible={true}
        hoveredIndex={0}
        onHover={vi.fn()}
      />
    )

    // Should show elevation value
    expect(container.textContent).toContain('100m')
  })
})
