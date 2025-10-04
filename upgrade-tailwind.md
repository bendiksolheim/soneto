# Tailwind CSS v3 to v4 Upgrade Plan

## Project Overview

This document contains a detailed step-by-step plan for upgrading Tailwind CSS from v3.4.18 to v4.1.14 in the Soneto project.

**Current Setup:**
- Tailwind CSS v3.4.18
- Next.js 15.5.4
- Node.js v21.2.0 (meets v20+ requirement ✓)
- pnpm 10.17.0
- PostCSS configuration with autoprefixer
- TypeScript config file (`tailwind.config.ts`)
- Custom theme with extensive color system using CSS variables
- Dark mode support via `class` strategy
- `tailwindcss-animate` plugin
- `@tailwindcss/typography` plugin in devDependencies

**Key Configuration Details:**
- Custom colors: border, input, ring, background, foreground, primary, secondary, destructive, muted, accent, popover, card, sidebar (8 variants), chart (5 variants)
- Custom border radius using CSS variables
- Custom animations: accordion-down, accordion-up
- Container configuration with center, padding, and responsive screens
- Global CSS using `@apply` directives in `app/globals.css`

## Breaking Changes Impact Assessment

### High Impact Changes
1. **CSS-first configuration** - Current `tailwind.config.ts` needs migration to CSS
2. **@tailwind directives removal** - `app/globals.css` uses `@tailwind base/components/utilities`
3. **PostCSS plugin separation** - May need `@tailwindcss/postcss` package
4. **Plugin compatibility** - `tailwindcss-animate` may need update/replacement

### Medium Impact Changes
1. **Border utility changes** - Now uses `currentColor` instead of gray-200 (minimal impact - using `border-input`)
2. **Ring utility changes** - Now defaults to 1px with `currentColor` (minimal impact - using `ring-ring`)
3. **Placeholder changes** - Uses current text color at 50% opacity (affected: `components/ui/input.tsx`)

### Low Impact Changes
1. **No preprocessor support** - Not using Sass/Less/Stylus ✓
2. **Browser requirements** - Modern CSS features (Safari 16.4+, Chrome 111+, Firefox 128+)

## Upgrade Steps

### Step 1: Pre-Migration Checklist

**Prerequisites:**
- [ ] Verify Node.js version is 20+ (current: v21.2.0 ✓)
- [ ] Verify pnpm is installed and working
- [ ] Ensure all current changes are committed
- [ ] Current branch is clean with no uncommitted changes

**Actions:**
```bash
# Verify prerequisites
node --version  # Should show v20+
pnpm --version  # Should show working pnpm installation

# Check git status
git status  # Should show clean working tree
```

### Step 2: Create Backup Branch

Create a backup branch before starting the migration:

```bash
# Create and switch to upgrade branch
git checkout -b upgrade-tailwind-v4

# Verify you're on the new branch
git branch  # Should show * upgrade-tailwind-v4
```

### Step 3: Document Current State

Take screenshots or notes of key UI elements for visual regression testing:
- [ ] Homepage with light mode
- [ ] Homepage with dark mode
- [ ] Map interface with markers
- [ ] Elevation profile chart
- [ ] All UI components (buttons, inputs, dialogs, tooltips)
- [ ] Navigation menu
- [ ] Responsive layouts (mobile, tablet, desktop)

### Step 4: Run Automated Upgrade Tool

**IMPORTANT:** Use `pnpm dlx` instead of `npx` for this project.

```bash
# Run the automated upgrade tool
pnpm dlx @tailwindcss/upgrade
```

**Expected Changes:**
- `package.json` - Tailwind CSS and related packages updated
- `app/globals.css` - `@tailwind` directives replaced with `@import "tailwindcss"`
- `tailwind.config.ts` - May be migrated to CSS-based config or removed
- `postcss.config.js` - May be updated or flagged for manual review

**Actions After Tool Runs:**
- [ ] Review all changes made by the tool
- [ ] Do NOT commit yet - review first
- [ ] Check for any error messages or warnings from the tool
- [ ] Verify the tool completed successfully

### Step 5: Install Updated Dependencies

After the automated tool runs, install the updated dependencies:

```bash
# Install updated packages
pnpm install

# Verify installation succeeded
pnpm list tailwindcss
```

### Step 6: Manual Configuration Migration

The automated tool should handle most configuration, but verify these items:

#### 6.1: Check `app/globals.css`

**Before (v3):**
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**After (v4):**
```css
@import "tailwindcss";
```

**CSS Variables:**
- [ ] Verify all CSS custom properties (--background, --foreground, etc.) are preserved
- [ ] Verify `:root` and `.dark` selectors are intact
- [ ] Verify `@layer base` with `@apply` directives still work (if not, convert to standard CSS)

#### 6.2: Check Configuration Migration

**Option A - CSS-based config (v4 approach):**
If the tool migrated to CSS, the configuration should be in `app/globals.css` using `@theme` or similar directives.

**Option B - JavaScript config (backward compatibility):**
If a `tailwind.config.ts` still exists, verify it uses the new v4 format.

**Required Configuration Elements:**
- [ ] Dark mode: `class` strategy
- [ ] Content paths: `./pages/**/*.{ts,tsx}`, `./components/**/*.{ts,tsx}`, `./app/**/*.{ts,tsx}`
- [ ] All custom colors (30+ color definitions)
- [ ] Border radius variables (lg, md, sm)
- [ ] Container configuration (center, padding, screens)
- [ ] Custom animations (accordion-down, accordion-up)

#### 6.3: Check PostCSS Configuration

Verify `postcss.config.js`:

**If using Next.js built-in PostCSS:**
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

**If need separate plugin:**
```javascript
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
    autoprefixer: {},
  },
}
```

If `@tailwindcss/postcss` is required:
```bash
pnpm add -D @tailwindcss/postcss
```

#### 6.4: Check Plugin Compatibility

**Current plugins:**
- `tailwindcss-animate` - Check if compatible with v4 or needs update
- `@tailwindcss/typography` - May need update to v4 compatible version

**Actions:**
```bash
# Check for plugin updates
pnpm update tailwindcss-animate @tailwindcss/typography

# Or install v4 compatible versions if they exist
pnpm add -D tailwindcss-animate@latest @tailwindcss/typography@latest
```

**If plugins are incompatible:**
- For `tailwindcss-animate`: May need to migrate animations to native CSS `@keyframes` in `globals.css`
- For `@tailwindcss/typography`: Check if there's a v4 version or alternative

### Step 7: Code Review and Manual Fixes

#### 7.1: Review `@apply` Directive Usage

File: `app/globals.css` (lines 61-68)

```css
@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Action:** Test if `@apply` still works in v4. If not, convert to standard CSS:

```css
@layer base {
  * {
    border-color: hsl(var(--border));
  }
  body {
    background-color: hsl(var(--background));
    color: hsl(var(--foreground));
  }
}
```

#### 7.2: Review Placeholder Styling

File: `components/ui/input.tsx` (line 11)

Contains `placeholder:text-muted-foreground`. In v4, placeholders use current text color at 50% opacity by default.

**Action:** Test if the placeholder styling looks correct. If not, may need to adjust opacity or use explicit color.

#### 7.3: Review Border Usage

The project uses `border border-input` pattern extensively. In v4, `border` alone uses `currentColor`.

**Action:** Since we use `border-input`, this should not be affected. Verify visually.

#### 7.4: Review Ring Usage

The project uses `ring-ring` pattern. In v4, bare `ring-3` uses `currentColor` with 1px width.

**Action:** Since we use `ring-ring`, this should not be affected. Verify visually.

### Step 8: Build and Test

#### 8.1: Development Build

```bash
# Start development server
pnpm dev

# Open browser to http://localhost:3000
# Check console for any Tailwind-related errors
```

**Check for:**
- [ ] No build errors
- [ ] No console warnings about Tailwind
- [ ] CSS is loading correctly
- [ ] No missing styles

#### 8.2: Production Build

```bash
# Build for production
pnpm build

# Check for build errors or warnings
```

**Expected output:**
- [ ] Build completes successfully
- [ ] No Tailwind CSS errors
- [ ] CSS bundle size is reasonable (may differ from v3)

#### 8.3: Lint Check

```bash
# Run linter
pnpm lint
```

### Step 9: Visual Regression Testing

Compare the application to the screenshots/notes from Step 3:

**Light Mode:**
- [ ] Homepage layout and styling
- [ ] Map interface
- [ ] Markers and route visualization
- [ ] Elevation profile chart
- [ ] Button styles (primary, secondary, destructive)
- [ ] Input fields and placeholders
- [ ] Dialogs and modals
- [ ] Tooltips
- [ ] Navigation menu

**Dark Mode:**
- [ ] All above elements in dark mode
- [ ] Color transitions between modes
- [ ] Proper contrast and readability

**Responsive Design:**
- [ ] Mobile layout (< 640px)
- [ ] Tablet layout (640px - 1024px)
- [ ] Desktop layout (> 1024px)
- [ ] Container max-width (2xl: 1400px)

**Interactive Elements:**
- [ ] Hover states
- [ ] Focus states (rings)
- [ ] Active states
- [ ] Disabled states
- [ ] Animations (accordion-down, accordion-up if used)

### Step 10: Fix Visual Regressions

If any visual regressions are found:

#### 10.1: Document Issues

Create a list of all visual differences:
- Component/page affected
- Expected appearance
- Actual appearance
- Screenshot comparison

#### 10.2: Fix Issues

Common fixes needed:

**Border colors off:**
```css
/* If borders look wrong, check if border-input is still working */
/* May need to adjust CSS variable or utility class */
```

**Placeholder colors wrong:**
```css
/* In input.tsx, may need to adjust placeholder: utility */
placeholder:text-muted-foreground
/* or */
placeholder:opacity-50
```

**Animations broken:**
```css
/* If tailwindcss-animate doesn't work, migrate to native CSS */
@keyframes accordion-down {
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
}
```

**Dark mode issues:**
```css
/* Verify .dark class is still working */
/* Check if darkMode: ["class"] is properly configured */
```

### Step 11: Performance Check

Compare bundle sizes and performance:

```bash
# Check production bundle size
pnpm build

# Look for .next/static/css files and compare sizes
ls -lh .next/static/css/
```

**Actions:**
- [ ] CSS bundle size is reasonable (v4 may be smaller or larger)
- [ ] No duplicate CSS
- [ ] Development server start time is acceptable
- [ ] Hot reload works correctly

### Step 12: Browser Compatibility Testing

Test in required browsers:
- [ ] Chrome 111+ (latest version recommended)
- [ ] Safari 16.4+ (latest version recommended)
- [ ] Firefox 128+ (latest version recommended)

**Check for:**
- Modern CSS features working (`@property`, `color-mix()`)
- No layout issues
- No missing styles

### Step 13: Commit Changes

Once all tests pass:

```bash
# Stage all changes
git add .

# Review changes one more time
git diff --staged

# Commit with descriptive message
git commit -m "Upgrade Tailwind CSS from v3 to v4

- Ran automated upgrade tool (pnpm dlx @tailwindcss/upgrade)
- Migrated configuration from JavaScript to CSS-based
- Updated @tailwind directives to @import
- Verified all custom colors and theme configuration
- Tested dark mode functionality
- Confirmed visual parity with v3
- All builds and tests passing"

# Push to remote
git push origin upgrade-tailwind-v4
```

### Step 14: Create Pull Request (Optional)

If working in a team environment:

```bash
# Create PR using GitHub CLI
gh pr create --title "Upgrade Tailwind CSS to v4.1.14" --body "
## Summary
Upgrades Tailwind CSS from v3.4.18 to v4.1.14

## Changes
- Migrated from JavaScript config to CSS-based configuration
- Updated @tailwind directives to @import syntax
- Updated/verified plugin compatibility
- All visual regression tests passing

## Testing
- [x] Development build working
- [x] Production build successful
- [x] Light mode visual parity
- [x] Dark mode visual parity
- [x] Responsive layouts working
- [x] All interactive elements functional
- [x] Browser compatibility verified

## Breaking Changes
None for end users - all visual styling maintained

## Screenshots
[Add before/after screenshots if needed]
"
```

### Step 15: Merge and Deploy

After PR approval:

```bash
# Switch to main branch
git checkout main

# Merge the upgrade branch
git merge upgrade/tailwind-v4

# Push to main
git push origin main

# Delete the upgrade branch
git branch -d upgrade/tailwind-v4
git push origin --delete upgrade/tailwind-v4
```

## Rollback Plan

If critical issues are found after upgrade:

```bash
# Revert the commit
git revert HEAD

# Or reset to previous commit (if not pushed)
git reset --hard HEAD~1

# Or switch back to main
git checkout main

# Reinstall dependencies
pnpm install
```

## Troubleshooting

### Issue: Automated tool fails

**Solution:**
- Check Node.js version is 20+
- Ensure pnpm is up to date
- Try running with `--verbose` flag: `pnpm dlx @tailwindcss/upgrade --verbose`
- Check GitHub issues: https://github.com/tailwindlabs/tailwindcss/issues

### Issue: Build errors after upgrade

**Solution:**
- Clear Next.js cache: `rm -rf .next`
- Clear node_modules: `rm -rf node_modules && pnpm install`
- Check PostCSS config is correct
- Verify all plugins are compatible

### Issue: Styles not loading

**Solution:**
- Check `app/globals.css` has `@import "tailwindcss"`
- Verify `tailwind.config.ts` or CSS config is correct
- Check browser console for CSS errors
- Verify content paths include all component files

### Issue: Dark mode broken

**Solution:**
- Verify `darkMode: ["class"]` in config (or CSS equivalent)
- Check `.dark` class is being applied to `<html>` element
- Verify all `--` CSS variables are defined for `.dark`
- Check `next-themes` package is working correctly

### Issue: Custom colors not working

**Solution:**
- Verify all CSS variables are in `app/globals.css`
- Check `hsl(var(--color-name))` syntax is correct
- Ensure `@layer base` is properly defined
- Verify theme.extend.colors configuration (if using JS config)

### Issue: Animations broken

**Solution:**
- Check `tailwindcss-animate` compatibility
- May need to migrate to native CSS animations
- Verify keyframes are defined in CSS
- Check animation utilities are available

### Issue: TypeScript errors

**Solution:**
- Update type definitions: `pnpm add -D @types/node@latest`
- Check Tailwind CSS type imports
- Verify config file type annotations

## References

- **Tailwind CSS v4 Official Upgrade Guide:** https://tailwindcss.com/docs/upgrade-guide
- **Tailwind CSS v4 Blog Post:** https://tailwindcss.com/blog/tailwindcss-v4
- **GitHub Discussions:** https://github.com/tailwindlabs/tailwindcss/discussions
- **Next.js with Tailwind CSS:** https://nextjs.org/docs/app/building-your-application/styling/tailwind-css

## Estimated Time

- **Automated tool + installation:** 5-10 minutes
- **Manual configuration review:** 15-30 minutes
- **Visual regression testing:** 30-60 minutes
- **Fixing issues (if any):** 30-120 minutes
- **Total estimated time:** 1.5-3.5 hours

## Success Criteria

- [ ] All builds complete successfully
- [ ] No console errors or warnings
- [ ] Visual parity with v3 in light mode
- [ ] Visual parity with v3 in dark mode
- [ ] All interactive elements working
- [ ] Responsive layouts functioning
- [ ] Performance is acceptable
- [ ] Browser compatibility verified
- [ ] All tests passing (if applicable)

## Notes for AI Agent

**Context for Empty Context Window:**

This project is a Next.js-based web application for route planning with:
- Mapbox for map visualization
- Recharts for elevation graphs
- Custom UI components using Radix UI primitives
- Dark mode support via next-themes
- Extensive custom color system via CSS variables
- Animation support for accordion components

**Key Files:**
- `/app/globals.css` - Main CSS file with @tailwind directives and CSS variables
- `/tailwind.config.ts` - TypeScript configuration with extensive theme customization
- `/postcss.config.js` - PostCSS configuration
- `/components/ui/*` - UI components using Tailwind classes
- `/package.json` - Dependencies including tailwindcss@3.4.18

**Critical Requirements:**
- Maintain visual parity with current design
- Preserve dark mode functionality
- Keep all custom colors and theme configuration
- Ensure responsive design stays intact
- Use `pnpm dlx` instead of `npx`
- Test thoroughly before committing

**Migration Philosophy:**
- Let the automated tool do the heavy lifting
- Review all changes carefully
- Test visual appearance extensively
- Fix issues incrementally
- Document any deviations from plan
- Prioritize working functionality over perfect migration
