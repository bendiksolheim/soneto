# Fix Login Button Flash and Optimize Client Components

## Overview

Fix the login button flash that occurs on page refresh by implementing server-side initial authentication checking and proper loading state handling. Additionally, convert unnecessary client components to server components to reduce bundle size and improve performance.

## Current State Analysis

**The Problem:**
When a user refreshes the page while logged in, the header briefly shows "Logg inn" before switching to "Hei, [name]!". This creates a jarring user experience.

**Root Cause:**
1. `AuthProvider` initializes with `user: null` on the client
2. The `User` component renders immediately, showing the login button
3. An async call to `supabase.auth.getSession()` resolves later
4. The UI re-renders once the session is retrieved
5. The `isLoading` flag exists but is **not used** in the User component

**Key Discoveries:**
- `hooks/use-auth.tsx:17-19` - Auth state initializes client-side with null user
- `components/header.tsx:42` - User component doesn't check `isLoading` flag
- `lib/supabase/server.ts` - Server-side Supabase client already exists and is ready to use
- `hooks/use-routes.ts:70-74` - Properly waits for auth loading (good pattern to follow)
- `app/not-found.tsx:8` - Uses `usePathname()` only for console.error logging, doesn't need to be a client component

## Desired End State

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`
- [x] Development server starts without errors: `pnpm dev`
- [ ] No hydration mismatch warnings in browser console

#### Manual Verification:
- [ ] No login button flash when refreshing the page while logged in
- [ ] Loading state appears briefly during auth initialization
- [ ] Auth state transitions smoothly from loading → logged in/out
- [ ] Login/logout functionality still works correctly
- [ ] Routes are loaded properly after auth state is determined
- [ ] 404 page still logs errors to console (server-side)

## What We're NOT Doing

- NOT moving AuthProvider lower in the component tree (high effort, low benefit for this app)
- NOT creating API routes for Mapbox calls (out of scope for this fix)
- NOT refactoring other components to server components (only not-found.tsx)
- NOT implementing server actions for route CRUD operations (works fine with Supabase client)

## Implementation Approach

We'll use a two-phase approach:
1. **Phase 1**: Implement server-side session checking to eliminate hydration mismatch and add loading state to User component
2. **Phase 2**: Convert `app/not-found.tsx` to a server component

This approach addresses the root cause (server-side auth check) while also implementing the immediate UX fix (loading state).

---

## Phase 1: Server-Side Auth Check and Loading State

### Overview
Modify the root layout to check the user's session on the server before hydration, then pass the initial session to the `AuthProvider`. Also add loading state handling to the User component to prevent any flash during the initial auth check.

### Changes Required:

#### 1. Update `app/layout.tsx` - Add Server-Side Session Check

**File**: `app/layout.tsx`
**Changes**: Make the layout async and fetch the initial session server-side

```typescript
import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Sone To",
  description: "Planlegg løpeturer",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return (
    <html lang="en" className="w-full h-full font-display" data-theme="silk">
      <body className={"w-full h-full"}>
        <AuthProvider initialSession={session}>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

#### 2. Update `hooks/use-auth.tsx` - Accept Initial Session

**File**: `hooks/use-auth.tsx`
**Changes**: Modify AuthProvider to accept and use an initial session prop

```typescript
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode;
  initialSession: Session | null;
}) {
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const [session, setSession] = useState<Session | null>(initialSession);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // If we don't have an initial session from the server, fetch it
    if (!initialSession) {
      setIsLoading(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      });
    }

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [initialSession]);

  const signOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

#### 3. Update `components/header.tsx` - Use Loading State

**File**: `components/header.tsx`
**Changes**: Add loading state check to User component

```typescript
function User(): React.ReactElement {
  const { user, isLoading, signOut } = useAuth();
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const name = user?.identities[0]?.identity_data?.full_name || "der";

  if (isLoading) {
    return (
      <div className="content-center justify-self-end">
        <div className="skeleton h-9 w-24"></div>
      </div>
    );
  }

  if (user) {
    return (
      <Dropdown
        title={`Hei, ${name}!`}
        classNames={{ dropdown: "justify-self-end content-center" }}
        placement="end"
      >
        <Menu
          items={[
            {
              label: "Logg ut",
              action: () => {
                signOut();
              },
            },
          ]}
        />
      </Dropdown>
    );
  } else {
    return (
      <div className="content-center justify-self-end">
        <Button onClick={() => setAuthDialogOpen(true)}>
          <UserCircleIcon size={16} />
          Logg inn
        </Button>
        <LoginDialog isOpen={authDialogOpen} setIsOpen={() => setAuthDialogOpen(false)} />
      </div>
    );
  }
}
```

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`
- [x] Development server starts: `pnpm dev`

#### Manual Verification:
- [ ] No login button flash when logged in user refreshes the page
- [ ] Skeleton loading state appears briefly during initial load
- [ ] User can still log in successfully
- [ ] User can still log out successfully
- [ ] Routes load correctly after auth state is determined
- [ ] No hydration mismatch warnings in browser console

---

## Phase 2: Convert not-found.tsx to Server Component

### Overview
Remove the unnecessary `"use client"` directive from `app/not-found.tsx`. The component only uses `usePathname()` for logging, which can be replaced with server-side route parameter logging or simply removed.

### Changes Required:

#### 1. Convert `app/not-found.tsx` to Server Component

**File**: `app/not-found.tsx`
**Changes**: Remove client directive and simplify to server component

```typescript
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-4">Oops! Page not found</p>
        <Link href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
```

**Rationale**: The pathname logging was only used for debugging. If logging is still desired, it can be handled server-side through Next.js middleware or server logs. For a 404 page, the UX is more important than logging which path was accessed.

### Success Criteria:

#### Automated Verification:
- [x] Type checking passes: `pnpm tsc --noEmit`
- [x] Linting passes: `pnpm lint`
- [x] Development server starts: `pnpm dev`
- [x] Build completes successfully: `pnpm build`

#### Manual Verification:
- [ ] 404 page displays correctly when accessing non-existent routes
- [ ] "Return to Home" link works correctly
- [ ] No JavaScript errors in console
- [ ] Page loads faster (server-rendered, no client bundle needed)

---

## Testing Strategy

### Unit Tests:
No new unit tests required - the changes preserve existing functionality.

### Integration Tests:
No new integration tests required - the auth flow remains the same.

### Manual Testing Steps:

1. **Test Initial Load (Not Logged In)**:
   - Clear cookies and local storage
   - Navigate to the app
   - Verify "Logg inn" button appears without flash
   - Verify no hydration warnings in console

2. **Test Login Flow**:
   - Click "Logg inn"
   - Complete OAuth login
   - Verify smooth transition to "Hei, [name]!"
   - Verify no flash or layout shift

3. **Test Page Refresh (Logged In)**:
   - While logged in, refresh the page (Cmd+R)
   - **Critical**: Verify no "Logg inn" button flash
   - Verify brief skeleton loading state (if any)
   - Verify smooth transition to "Hei, [name]!"

4. **Test Logout Flow**:
   - Click user dropdown
   - Click "Logg ut"
   - Verify smooth transition to "Logg inn" button

5. **Test Route Loading**:
   - Save a route while logged in
   - Refresh the page
   - Verify routes load correctly after auth state resolves
   - Verify "Mine løyper" dropdown shows saved routes

6. **Test 404 Page**:
   - Navigate to `/this-does-not-exist`
   - Verify 404 page displays correctly
   - Click "Return to Home"
   - Verify navigation works

## Performance Considerations

**Expected Improvements:**
- Eliminates hydration mismatch and extra client-side render cycle
- Reduces perceived loading time by server-rendering correct auth state
- Small bundle size reduction from converting not-found.tsx to server component
- Skeleton loading state is minimal and appears only briefly

**Potential Concerns:**
- Server-side session check adds minimal latency to initial page load (~50-100ms)
- This is acceptable trade-off for eliminating the flash and improving UX

## Migration Notes

**No Data Migration Required** - This is purely a rendering optimization.

**Deployment Considerations:**
- Changes are backwards compatible
- No environment variable changes needed
- Existing Supabase configuration works as-is

## References

- Related research: `planning/2025-11-23-client-server-components/research.md`
- Supabase SSR docs: https://supabase.com/docs/guides/auth/server-side
- Next.js async layouts: https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates
- DaisyUI skeleton component: https://daisyui.com/components/skeleton/
