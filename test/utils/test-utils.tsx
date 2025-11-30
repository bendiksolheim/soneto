import React, { ReactElement, ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/hooks/use-auth'
import { User } from '@supabase/supabase-js'

// Add providers here if needed (e.g., ThemeProvider)
interface WrapperProps {
  children: ReactNode
  user?: User | null
}

function AllTheProviders({ children, user = null }: WrapperProps) {
  return (
    <AuthProvider user={user}>
      {children}
    </AuthProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  user?: User | null
}

const customRender = (
  ui: ReactElement,
  options?: CustomRenderOptions
) => {
  const { user, ...renderOptions } = options || {}
  return render(ui, {
    wrapper: ({ children }) => <AllTheProviders user={user}>{children}</AllTheProviders>,
    ...renderOptions
  })
}

export * from '@testing-library/react'
export { customRender as render }
