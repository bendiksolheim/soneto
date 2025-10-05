import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'

// Add providers here if needed (e.g., ThemeProvider)
interface WrapperProps {
  children: ReactNode
}

function AllTheProviders({ children }: WrapperProps) {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
