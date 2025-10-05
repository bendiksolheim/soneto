import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '../test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { SaveRouteDialog } from './save-route-dialog'

describe('SaveRouteDialog', () => {
  const mockOnSaveRoute = vi.fn()
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockOnSaveRoute.mockClear()
    mockOnOpenChange.mockClear()
  })

  it('renders dialog when open is true', () => {
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Lagre løype')).toBeInTheDocument()
    expect(screen.getByLabelText('Navn på løype')).toBeInTheDocument()
  })

  it('does not render dialog when open is false', () => {
    render(
      <SaveRouteDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('disables submit button when route name is empty', () => {
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const submitButton = screen.getByRole('button', { name: 'Lagre' })
    expect(submitButton).toBeDisabled()
  })

  it('enables submit button when route name is entered', async () => {
    const user = userEvent.setup()
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const input = screen.getByLabelText('Navn på løype')
    await user.type(input, 'My Route')

    const submitButton = screen.getByRole('button', { name: 'Lagre' })
    expect(submitButton).toBeEnabled()
  })

  it('calls onSaveRoute with route name when form is submitted', async () => {
    const user = userEvent.setup()
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const input = screen.getByLabelText('Navn på løype')
    await user.type(input, 'My Test Route')

    const submitButton = screen.getByRole('button', { name: 'Lagre' })
    await user.click(submitButton)

    expect(mockOnSaveRoute).toHaveBeenCalledWith('My Test Route')
    expect(mockOnSaveRoute).toHaveBeenCalledTimes(1)
  })

  it('calls onOpenChange(false) after successful submission', async () => {
    const user = userEvent.setup()
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const input = screen.getByLabelText('Navn på løype')
    await user.type(input, 'My Route')

    const submitButton = screen.getByRole('button', { name: 'Lagre' })
    await user.click(submitButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('clears input after successful submission', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const input = screen.getByLabelText('Navn på løype') as HTMLInputElement
    await user.type(input, 'My Route')
    expect(input.value).toBe('My Route')

    const submitButton = screen.getByRole('button', { name: 'Lagre' })
    await user.click(submitButton)

    // Reopen dialog to verify state was cleared
    rerender(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    await waitFor(() => {
      const newInput = screen.getByLabelText('Navn på løype') as HTMLInputElement
      expect(newInput.value).toBe('')
    })
  })

  it('calls onOpenChange(false) when cancel button is clicked', async () => {
    const user = userEvent.setup()
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const cancelButton = screen.getByRole('button', { name: 'Avbryt' })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    expect(mockOnSaveRoute).not.toHaveBeenCalled()
  })

  it('renders trigger when provided', () => {
    render(
      <SaveRouteDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
        trigger={<button>Open Dialog</button>}
      />
    )

    expect(screen.getByText('Open Dialog')).toBeInTheDocument()
  })

  it('has correct form spacing class', () => {
    render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    // Find form by looking for the dialog and then the form inside it
    const form = document.querySelector('[role="dialog"] form')
    expect(form).not.toBeNull()
    expect(form?.className).toContain('grid')
    expect(form?.className).toContain('gap-4')
  })
})
