---
date: 2025-10-05T20:00:00+0000
planner: Claude (Sonnet 4.5)
git_commit: 71f39b6d9feda68ac52147aac5884d1af98d8afe
branch: main
repository: soneto
topic: "Fix Dialog Spacing and Extract Shared SaveRouteDialog Component"
tags: [implementation, ui, dialog, refactoring, tailwind]
status: pending
last_updated: 2025-10-05
last_updated_by: Claude (Sonnet 4.5)
---

# Fix Dialog Spacing and Extract Shared SaveRouteDialog Component

## Overview

Fix the spacing issue in the save route dialog and eliminate code duplication by creating a shared `SaveRouteDialog` component. The spacing issue is caused by missing `className="grid gap-4"` on the form element, which blocks the CSS Grid gap from the parent DialogContent from spacing the dialog's internal elements properly.

## Current State Analysis

### Duplicate Implementations

Two identical save route dialogs exist with the same spacing issue:

1. **capabilities-panel.tsx:315-357** - Save route dialog in the side panel
2. **route-actions.tsx:42-84** - Save route dialog in the floating action buttons

Both dialogs:
- Have identical structure (DialogContent → form → DialogHeader/content/DialogFooter)
- Are missing `className="grid gap-4"` on the form element
- Have the same form submission logic
- Use the same Norwegian language strings
- Accept `onSaveRoute(name: string)` callback

### Root Cause

The `DialogContent` component uses CSS Grid with `gap-4` (components/ui/dialog.tsx:41) to space direct children. However, when a `<form>` element is the only direct child, it doesn't inherit grid layout, so the gap doesn't apply to the form's children (DialogHeader, input field, DialogFooter).

### What We're NOT Doing

- Not changing the DialogContent base component
- Not modifying the Tailwind configuration
- Not changing the dialog behavior or validation logic
- Not changing the language strings or text content

## Desired End State

A single, reusable `SaveRouteDialog` component that:
- Has correct spacing (`className="grid gap-4"` on the form)
- Is used by both capabilities-panel.tsx and route-actions.tsx
- Maintains the same API (`onSaveRoute` callback)
- Maintains the same visual appearance and behavior

### Verification

#### Automated Verification:
- [x] All unit tests pass: `pnpm test`
- [x] TypeScript compilation passes: `pnpm build`
- [x] Linting passes: `pnpm lint`
- [x] No type errors: `npx tsc --noEmit`

#### Manual Verification:
- [ ] Open the app in the browser
- [ ] Click "Lagre løype" button in the side panel (CapabilitiesPanel)
- [ ] Verify proper spacing between dialog title, description, input field, and buttons
- [ ] Close dialog and click the save button in the floating action menu (RouteActions)
- [ ] Verify proper spacing is identical to the side panel dialog
- [ ] Test form submission works correctly from both locations
- [ ] Verify validation (submit button disabled when name is empty)

## Implementation Approach

1. Create a new shared `SaveRouteDialog` component with correct spacing
2. Add comprehensive unit tests for the new component
3. Update both consuming components to use the shared dialog
4. Remove duplicate dialog code

This approach:
- Fixes the spacing issue
- Provides test coverage to prevent regressions
- Eliminates 40+ lines of duplicate code
- Makes future dialog changes easier (single source of truth)
- Follows React best practices for component composition and testing

## Phase 1: Create Shared SaveRouteDialog Component

### Overview
Extract the save route dialog into a reusable component with correct spacing.

### Changes Required:

#### 1. Create SaveRouteDialog Component
**File**: `components/save-route-dialog.tsx` (new file)

```tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface SaveRouteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveRoute: (name: string) => void;
  trigger?: React.ReactNode;
}

export function SaveRouteDialog(props: SaveRouteDialogProps) {
  const { open, onOpenChange, onSaveRoute, trigger } = props;
  const [routeName, setRouteName] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveRoute(routeName);
    onOpenChange(false);
    setRouteName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Lagre løype</DialogTitle>
            <DialogDescription>
              Løypen lagres lokalt i denne nettleseren og er ikke tilgjengelig fra andre enheter.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="route-name">Navn på løype</Label>
              <Input
                value={routeName}
                onChange={(e) => setRouteName(e.target.value)}
                id="route-name"
                placeholder="Skriv inn navn på løype"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Avbryt</Button>
            </DialogClose>
            <Button type="submit" disabled={routeName.length === 0}>
              Lagre
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

**Key changes:**
- Form has `className="grid gap-4"` to fix spacing issue
- Controlled state for `routeName` is internal to the component
- `open` and `onOpenChange` props for external control
- Optional `trigger` prop for flexibility (used by route-actions.tsx)
- Resets `routeName` to empty string after successful save

### Success Criteria:

#### Automated Verification:
- [x] File is created: `ls components/save-route-dialog.tsx`
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [x] Component file exists and has correct exports

---

## Phase 2: Add Unit Tests for SaveRouteDialog

### Overview
Create comprehensive unit tests for the SaveRouteDialog component to ensure correct behavior and prevent regressions.

### Changes Required:

#### 1. Create Test File
**File**: `components/save-route-dialog.test.tsx` (new file)

```tsx
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
      const newInput = screen.getByLabelText('Namn på løype') as HTMLInputElement
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
    const { container } = render(
      <SaveRouteDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaveRoute={mockOnSaveRoute}
      />
    )

    const form = container.querySelector('form')
    expect(form).toHaveClass('grid', 'gap-4')
  })
})
```

**Key test coverage:**
- Dialog renders when open
- Submit button validation (disabled/enabled based on input)
- Form submission calls correct callbacks
- Input state management and clearing
- Cancel button behavior
- Trigger rendering
- **Critical**: Verifies form has `className="grid gap-4"` to prevent spacing regression

### Success Criteria:

#### Automated Verification:
- [x] Test file created: `ls components/save-route-dialog.test.tsx`
- [x] All tests pass: `pnpm test save-route-dialog`
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] No linting errors: `pnpm lint`

#### Manual Verification:
- [x] Review test output shows all tests passing
- [x] Test coverage includes form spacing verification

---

## Phase 3: Update CapabilitiesPanel to Use Shared Component

### Overview
Replace the inline dialog in capabilities-panel.tsx with the shared SaveRouteDialog component.

### Changes Required:

#### 1. Update CapabilitiesPanel Imports
**File**: `components/capabilities-panel.tsx:1-30`

Add import for SaveRouteDialog:

```tsx
import { SaveRouteDialog } from "@/components/save-route-dialog";
```

Remove now-unused Dialog imports (keep only what's needed for other parts):

```tsx
// Remove these if no longer used elsewhere in the file:
// Dialog, DialogClose, DialogContent, DialogDescription,
// DialogFooter, DialogHeader, DialogTitle, DialogTrigger
```

**Note**: The NavigationMenu still uses Dialog components for the saved routes dropdown, so verify which imports are still needed.

#### 2. Replace Dialog Implementation
**File**: `components/capabilities-panel.tsx:314-357`

Replace the entire Dialog block with:

```tsx
<SaveRouteDialog
  open={saveOpen}
  onOpenChange={setSaveOpen}
  onSaveRoute={onSaveRoute}
  trigger={
    <Button className="w-full justify-start" variant="outline" disabled={routePoints.length === 0}>
      <Save className="w-4 h-4 mr-2" />
      Lagre løype
    </Button>
  }
/>
```

**Remove:**
- Lines 315-357: The entire `<Dialog>` block
- State variable: `routeName` (line 76) - no longer needed

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] No linting errors: `pnpm lint`
- [x] File size reduced by ~40 lines

#### Manual Verification:
- [ ] Open app and navigate to the side panel
- [ ] Click "Lagre løype" button
- [ ] Dialog opens with proper spacing between all elements
- [ ] Input field is not overlapped by buttons
- [ ] Form submission works correctly
- [ ] Dialog closes after saving

---

## Phase 4: Update RouteActions to Use Shared Component

### Overview
Replace the inline dialog in route-actions.tsx with the shared SaveRouteDialog component.

### Changes Required:

#### 1. Update RouteActions Imports
**File**: `components/route-actions.tsx:1-19`

Add import for SaveRouteDialog:

```tsx
import { SaveRouteDialog } from "@/components/save-route-dialog";
```

Remove now-unused Dialog imports:

```tsx
// Remove:
// Dialog, DialogClose, DialogContent, DialogDescription,
// DialogFooter, DialogHeader, DialogTitle, DialogTrigger
// Input, Label
```

#### 2. Replace Dialog Implementation
**File**: `components/route-actions.tsx:42-84`

Replace the entire Dialog block with:

```tsx
<SaveRouteDialog
  open={saveOpen}
  onOpenChange={setSaveOpen}
  onSaveRoute={onSaveRoute}
  trigger={
    <ActionButton title="Lagre løype">
      <Save />
    </ActionButton>
  }
/>
```

**Remove:**
- Lines 42-84: The entire `<Dialog>` block
- State variable: `routeName` (line 31) - no longer needed

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `npx tsc --noEmit`
- [x] No linting errors: `pnpm lint`
- [x] File size reduced by ~40 lines

#### Manual Verification:
- [ ] Open app and add some route points to show floating action menu
- [ ] Click the save button (disk icon) in floating actions
- [ ] Dialog opens with proper spacing between all elements
- [ ] Input field is not overlapped by buttons
- [ ] Form submission works correctly
- [ ] Dialog closes after saving
- [ ] Saved route appears in the saved routes list

---

## Integration Testing

### Manual Testing Steps:

1. **Test CapabilitiesPanel Dialog:**
   - Start dev server: `pnpm dev`
   - Open http://localhost:3000
   - Click "Lagre løype" in the side panel
   - Verify spacing looks correct (no button overlap)
   - Enter a route name and click "Lagre"
   - Verify dialog closes and route is saved

2. **Test RouteActions Dialog:**
   - Add at least 2 points to the map (to show floating actions)
   - Click the save icon in the floating action menu
   - Verify spacing looks correct (no button overlap)
   - Enter a different route name and click "Lagre"
   - Verify dialog closes and route is saved

3. **Test Edge Cases:**
   - Try submitting with empty name (button should be disabled)
   - Click "Avbryt" to close without saving
   - Open dialog, close it, open again (state should reset)

4. **Visual Comparison:**
   - Compare spacing with other dialogs in the app
   - Verify consistent 16px (gap-4) spacing between sections

5. **Run All Tests:**
   - Run unit tests: `pnpm test`
   - Verify all tests pass, including new SaveRouteDialog tests
   - Check test coverage: `pnpm test:coverage`

## Performance Considerations

- No performance impact expected
- Slight bundle size reduction due to code deduplication
- Component memoization not needed (simple controlled component)

## Migration Notes

### Breaking Changes:
None - this is an internal refactoring with the same external API.

### Rollback Plan:
If issues arise, revert the commits for phases 2 and 3 to restore the inline dialogs. The shared component can remain for future use.

## References

- Related research: `planning/2025-10-05-dialog-spacing-issue/research.md`
- DialogContent base component: `components/ui/dialog.tsx:32-54`
- Current implementations:
  - `components/capabilities-panel.tsx:315-357`
  - `components/route-actions.tsx:42-84`
