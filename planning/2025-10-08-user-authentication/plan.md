# User Authentication with Supabase Implementation Plan

## Overview

This plan implements user authentication and cloud-based route storage using Supabase, enabling cross-device synchronization while maintaining backward compatibility with localStorage for anonymous users. The implementation includes local Supabase development environment setup using Docker.

## Current State Analysis

### Existing Route Storage
- **Service**: `lib/services/route-storage.ts:12-167` - Static class managing localStorage
- **Hook**: `hooks/use-routes.ts:27-154` - React state management with no user awareness
- **Storage Key**: `"route-runner-routes"` defined in `lib/types/route.ts:53`
- **Data Model**: Routes with `{id, name, points, createdAt}` stored in browser localStorage

### Current Limitations
1. No user association - routes aren't tied to user identity
2. Browser-only storage - no cross-device/cross-browser sync
3. No backup - data loss if localStorage is cleared
4. No sharing capabilities beyond URL encoding

### Key Discoveries
- Application uses Next.js 15 with App Router architecture (`app/layout.tsx`)
- UI components use Radix UI with custom styling
- Environment variables stored in `.env.local` (currently has Mapbox and PostHog keys)
- Capabilities panel (`components/capabilities-panel.tsx`) is the primary UI component - ideal for auth UI integration
- Uses `pnpm` as package manager

## Desired End State

Users can:
1. Sign in with GitHub OAuth
2. Have their routes automatically synced to the cloud when authenticated
3. Access their routes from any device/browser when logged in
4. Continue using the app anonymously with localStorage (backward compatible)

### Verification Criteria
- Anonymous users can create and save routes to localStorage
- Authenticated users have routes synced to Supabase database
- Routes are isolated per user (Row Level Security enforced)
- Local Supabase instance runs on Mac for development
- Production uses Supabase cloud with same schema

## What We're NOT Doing

- Route sharing/collaboration features (future enhancement)
- Social features (comments, likes, public route discovery)
- Route collections/folders
- Offline-first sync with service workers (keeping it simple for now)
- Multi-tenancy or organization support
- Route templates or community routes

## Implementation Approach

**Strategy**: Phased implementation with local-first development
1. Set up local Supabase using Docker for development
2. Implement authentication UI and flows
3. Create dual-storage layer (localStorage OR Supabase based on auth state)
4. Deploy to production with Supabase cloud

**Key Decisions**:
- Use Supabase CLI for local development (consistent with cloud)
- Database migrations as SQL files in `supabase/migrations/`
- Environment-specific configuration via `.env.local` and Vercel env vars
- Keep localStorage as fallback for anonymous users (no breaking changes)

---

## Phase 0: Local Supabase Setup

### Overview
Set up Supabase local development environment using Docker and Supabase CLI. This provides a local PostgreSQL database and Auth service that mirrors production.

### Prerequisites
```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Verify Docker is running (Docker Desktop)
docker --version
```

### Changes Required

#### 1. Initialize Supabase Project
**Terminal Commands**:
```bash
# Initialize Supabase in the project
supabase init

# Start local Supabase (this downloads Docker images on first run)
supabase start
```

This creates:
- `supabase/config.toml` - Supabase configuration
- `supabase/seed.sql` - Initial data (optional)
- Local services on:
  - API URL: `http://localhost:54321`
  - DB URL: `postgresql://postgres:postgres@localhost:54322/postgres`
  - Studio URL: `http://localhost:54323` (local dashboard)

#### 2. Environment Variables
**File**: `.env.local`
**Add**:
```bash
# Supabase Local Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<generated-by-supabase-start>

# Database URL (for migrations)
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

**Note**: Run `supabase start` to get the `NEXT_PUBLIC_SUPABASE_ANON_KEY` value from the output.

#### 3. Production Environment Setup (Supabase Cloud)

**Steps**:
1. Create Supabase project at https://supabase.com
2. Get project API credentials from Settings > API
3. Link local project to cloud:
```bash
supabase link --project-ref <your-project-ref>
```

**Production Environment Variables** (for Vercel):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

#### 4. Add to `.gitignore`
**File**: `.gitignore`
**Add**:
```
# Supabase
.branches
.temp
supabase/.temp
```

### Success Criteria

#### Automated Verification:
- [ ] Supabase CLI installed: `supabase --version`
- [ ] Local Supabase running: `supabase status` shows all services healthy
- [ ] Can access Studio UI: Open `http://localhost:54323` in browser
- [ ] Environment variables set: `echo $NEXT_PUBLIC_SUPABASE_URL` returns value

#### Manual Verification:
- [ ] Studio UI loads and shows empty database
- [ ] Docker Desktop shows Supabase containers running (9+ containers)
- [ ] Can connect to local database via Studio

---

## Phase 1: Database Schema & Migrations

### Overview
Create the PostgreSQL schema for user routes with Row Level Security policies. Use Supabase migration system for version control.

### Changes Required

#### 1. Create Initial Migration
**Terminal Command**:
```bash
supabase migration new create_routes_table
```

This creates: `supabase/migrations/<timestamp>_create_routes_table.sql`

#### 2. Migration File Content
**File**: `supabase/migrations/<timestamp>_create_routes_table.sql`
**Content**:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points JSONB NOT NULL,
  distance NUMERIC(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT routes_name_not_empty CHECK (char_length(name) > 0),
  CONSTRAINT routes_points_is_array CHECK (jsonb_typeof(points) = 'array')
);

-- Create indexes for performance
CREATE INDEX idx_routes_user_id ON routes(user_id);
CREATE INDEX idx_routes_created_at ON routes(created_at DESC);

-- Enable Row Level Security
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own routes
CREATE POLICY "Users can view own routes"
  ON routes
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own routes
CREATE POLICY "Users can create routes"
  ON routes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own routes
CREATE POLICY "Users can update own routes"
  ON routes
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own routes
CREATE POLICY "Users can delete own routes"
  ON routes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_routes_updated_at
  BEFORE UPDATE ON routes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE routes IS 'User-created running routes with elevation data';
COMMENT ON COLUMN routes.points IS 'Array of {latitude, longitude} coordinate objects';
COMMENT ON COLUMN routes.distance IS 'Total route distance in kilometers';
```

#### 3. Apply Migration
**Terminal Commands**:
```bash
# Apply to local database
supabase db reset

# Verify migration applied
supabase migration list
```

#### 4. Generate TypeScript Types
**Terminal Command**:
```bash
# Generate types from database schema
supabase gen types typescript --local > lib/types/supabase.ts
```

This creates: `lib/types/supabase.ts` with auto-generated TypeScript types for database schema.

#### 5. Production Migration
**Terminal Commands** (after testing locally):
```bash
# Push migrations to production
supabase db push
```

### Success Criteria

#### Automated Verification:
- [ ] Migration file created: `ls supabase/migrations/` shows SQL file
- [ ] Migration applies cleanly: `supabase db reset` succeeds without errors
- [ ] Types generated: `cat lib/types/supabase.ts` shows Route type
- [ ] No SQL errors: `supabase db lint` passes

#### Manual Verification:
- [ ] Open Studio UI, see `routes` table under "Table Editor"
- [ ] Verify columns: id, user_id, name, points, distance, created_at, updated_at
- [ ] Check RLS policies: Table shows 4 policies enabled
- [ ] Indexes visible in Database > Indexes section

---

## Phase 2: Supabase Client Setup

### Overview
Install Supabase JavaScript libraries and create client utilities for both client and server components.

### Changes Required

#### 1. Install Dependencies
**Terminal Command**:
```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

#### 2. Create Browser Client
**File**: `lib/supabase/client.ts`
**Content**:
```typescript
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/lib/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### 3. Create Server Client
**File**: `lib/supabase/server.ts`
**Content**:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/lib/types/supabase'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle error (e.g., during server-side rendering)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle error
          }
        },
      },
    }
  )
}
```

#### 4. Create Middleware for Auth Refresh
**File**: `middleware.ts` (root level)
**Content**:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getSession()

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

#### 5. Create Auth Context Hook
**File**: `hooks/use-auth.ts`
**Content**:
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Session } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  session: Session | null
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setIsLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

#### 6. Update Root Layout
**File**: `app/layout.tsx`
**Modify**:
```typescript
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sone To",
  description: "Planlegg løpeturer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <TooltipProvider>
            <Sonner />
            {children}
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

### Success Criteria

#### Automated Verification:
- [ ] Dependencies installed: `pnpm list @supabase/supabase-js @supabase/ssr` shows versions
- [ ] TypeScript compiles: `pnpm tsc --noEmit` succeeds
- [ ] No import errors: `pnpm build` succeeds

#### Manual Verification:
- [ ] Can import createClient in browser components
- [ ] Can import createServerSupabaseClient in server components
- [ ] Middleware doesn't cause errors when navigating
- [ ] AuthProvider renders without errors in browser console

---

## Phase 3: Authentication UI Components

### Overview
Create a simple sign-in dialog component with GitHub OAuth authentication only.

### Changes Required

#### 1. Create Auth Dialog Component
**File**: `components/auth/auth-dialog.tsx`
**Content**:
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface AuthDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AuthDialog({ open, onOpenChange }: AuthDialogProps) {
  const supabase = createClient()

  const handleGitHubLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to your account</DialogTitle>
          <DialogDescription>
            Sign in with GitHub to sync your routes across devices
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={handleGitHubLogin}
            type="button"
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            Sign in with GitHub
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
```

#### 2. Create User Menu Component
**File**: `components/auth/user-menu.tsx`
**Content**:
```typescript
'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { User, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function UserMenu() {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      toast.error('Failed to sign out')
    }
  }

  if (!user) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 rounded-full">
          <User className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-xs text-muted-foreground">Signed in as</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="w-4 h-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

#### 3. Create Dropdown Menu Component (if not exists)
**File**: `components/ui/dropdown-menu.tsx`
**Content**:
```typescript
"use client"

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
```

#### 4. Create OAuth Callback Route
**File**: `app/auth/callback/route.ts`
**Content**:
```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to home page after authentication
  return NextResponse.redirect(`${origin}/`)
}
```

#### 5. Update Capabilities Panel with Auth
**File**: `components/capabilities-panel.tsx`
**Add imports and modify the header section**:
```typescript
// Add imports at the top
import { useState } from 'react' // Add to existing React imports if not present
import { AuthDialog } from '@/components/auth/auth-dialog'
import { UserMenu } from '@/components/auth/user-menu'
import { useAuth } from '@/hooks/use-auth'
import { LogIn } from 'lucide-react' // Add to existing lucide-react imports

// Inside CapabilitiesPanel function, add:
const { user } = useAuth()
const [authDialogOpen, setAuthDialogOpen] = useState(false)

// In the JSX header section (around line 148-218), modify the header to add auth UI:
// Add after the Soneto logo/title and before the Saved Routes NavigationMenu:
<div className="flex items-center space-x-2">
  {!user && (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-sm"
      onClick={() => setAuthDialogOpen(true)}
    >
      <LogIn className="w-4 h-4 mr-2" />
      Sign In
    </Button>
  )}
  <UserMenu />
</div>

// Add at the end of the component, before the closing </div> (around line 350):
<AuthDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} />
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm tsc --noEmit` succeeds
- [ ] No linting errors: `pnpm lint` passes
- [ ] Build succeeds: `pnpm build` completes

#### Manual Verification:
- [ ] "Sign In" button appears in capabilities panel header when not authenticated
- [ ] Clicking "Sign In" opens authentication dialog
- [ ] GitHub OAuth button redirects to GitHub login
- [ ] After sign-in, user menu appears with GitHub username/email
- [ ] Can sign out from user menu
- [ ] Auth state persists after page refresh

---

## Phase 4: Supabase Route Storage Service

### Overview
Create a parallel storage service for Supabase that mirrors the localStorage service API, enabling easy switching between storage backends.

### Changes Required

#### 1. Create Supabase Route Storage Service
**File**: `lib/services/supabase-route-storage.ts`
**Content**:
```typescript
import { createClient } from '@/lib/supabase/client'
import { Database } from '@/lib/types/supabase'
import { Point } from '@/lib/map/point'
import { calculateRouteDistance } from '@/lib/types/route'

type Route = Database['public']['Tables']['routes']['Row']
type RouteInsert = Database['public']['Tables']['routes']['Insert']
type RouteUpdate = Database['public']['Tables']['routes']['Update']

export interface SupabaseRoute {
  id: string
  user_id: string
  name: string
  points: Point[]
  distance: number
  created_at: string
  updated_at: string
}

export class SupabaseRouteStorage {
  /**
   * Get all routes for the authenticated user
   */
  static async getRoutes(userId: string): Promise<SupabaseRoute[]> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error loading routes:', error)
      throw new Error('Failed to load routes from cloud storage')
    }

    // Parse points from JSONB to Point[]
    return (data || []).map((route) => ({
      ...route,
      points: route.points as unknown as Point[],
      distance: Number(route.distance),
    }))
  }

  /**
   * Get a single route by ID
   */
  static async getRoute(id: string, userId: string): Promise<SupabaseRoute | null> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error loading route:', error)
      throw new Error('Failed to load route from cloud storage')
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    }
  }

  /**
   * Save a new route
   */
  static async saveRoute(
    routeData: { name: string; points: Point[] },
    userId: string
  ): Promise<SupabaseRoute> {
    const supabase = createClient()
    const distance = calculateRouteDistance(routeData.points)

    const insertData: RouteInsert = {
      user_id: userId,
      name: routeData.name,
      points: routeData.points as any, // JSONB type
      distance,
    }

    const { data, error } = await supabase
      .from('routes')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Error saving route:', error)
      throw new Error('Failed to save route to cloud storage')
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    }
  }

  /**
   * Update an existing route
   */
  static async updateRoute(
    id: string,
    updates: { name?: string; points?: Point[] },
    userId: string
  ): Promise<SupabaseRoute | null> {
    const supabase = createClient()

    const updateData: RouteUpdate = {
      ...(updates.name && { name: updates.name }),
      ...(updates.points && {
        points: updates.points as any,
        distance: calculateRouteDistance(updates.points),
      }),
    }

    const { data, error } = await supabase
      .from('routes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      console.error('Error updating route:', error)
      throw new Error('Failed to update route in cloud storage')
    }

    return {
      ...data,
      points: data.points as unknown as Point[],
      distance: Number(data.distance),
    }
  }

  /**
   * Delete a route
   */
  static async deleteRoute(id: string, userId: string): Promise<boolean> {
    const supabase = createClient()

    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting route:', error)
      throw new Error('Failed to delete route from cloud storage')
    }

    return true
  }

  /**
   * Clear all routes for a user
   */
  static async clearAllRoutes(userId: string): Promise<void> {
    const supabase = createClient()

    const { error } = await supabase
      .from('routes')
      .delete()
      .eq('user_id', userId)

    if (error) {
      console.error('Error clearing routes:', error)
      throw new Error('Failed to clear routes from cloud storage')
    }
  }
}
```

#### 2. Update Route Type with Optional user_id
**File**: `lib/types/route.ts`
**Modify StoredRoute interface**:
```typescript
export interface StoredRoute {
  id: string; // Unique identifier (UUID)
  user_id?: string; // NEW: Optional for backward compatibility
  name: string; // User-friendly route name
  points: Array<Point>; // [longitude, latitude] coordinates
  createdAt: string; // ISO string timestamp
}
```

#### 3. Update useRoutes Hook for Dual Storage
**File**: `hooks/use-routes.ts`
**Replace entire content**:
```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { StoredRoute, RouteWithCalculatedData, calculateRouteDistance } from "@/lib/types/route";
import { RouteStorageService } from "@/lib/services/route-storage";
import { SupabaseRouteStorage } from "@/lib/services/supabase-route-storage";
import { Point } from "@/lib/map/point";
import { useAuth } from "@/hooks/use-auth";

interface UseRoutesReturn {
  routes: RouteWithCalculatedData[];
  isLoading: boolean;
  error: string | null;
  saveRoute: (routeData: {
    name: string;
    points: Array<Point>;
  }) => Promise<StoredRoute>;
  updateRoute: (
    id: string,
    updates: { name?: string; points?: Array<Point> },
  ) => Promise<StoredRoute | null>;
  deleteRoute: (id: string) => Promise<boolean>;
  clearAllRoutes: () => Promise<void>;
  getRoute: (id: string) => RouteWithCalculatedData | null;
  refreshRoutes: () => void;
  isCloudStorage: boolean; // NEW: Indicates storage type
}

export function useRoutes(): UseRoutesReturn {
  const { user, isLoading: authLoading } = useAuth();
  const [routes, setRoutes] = useState<RouteWithCalculatedData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCloudStorage = !!user;

  // Load routes from appropriate storage
  const loadRoutes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (user) {
        // Load from Supabase
        const cloudRoutes = await SupabaseRouteStorage.getRoutes(user.id);
        const routesWithDistance = cloudRoutes.map((route) => ({
          id: route.id,
          name: route.name,
          points: route.points,
          createdAt: route.created_at,
          distance: route.distance,
        }));
        setRoutes(routesWithDistance);
      } else {
        // Load from localStorage
        const localRoutes = RouteStorageService.getRoutesWithDistance();
        setRoutes(localRoutes);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load routes";
      setError(errorMessage);
      console.error("Failed to load routes:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load routes when auth state changes
  useEffect(() => {
    if (!authLoading) {
      loadRoutes();
    }
  }, [authLoading, loadRoutes]);

  // Save a new route
  const saveRoute = useCallback(
    async (routeData: { name: string; points: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          // Save to Supabase
          const newRoute = await SupabaseRouteStorage.saveRoute(routeData, user.id);
          const routeWithDistance: RouteWithCalculatedData = {
            id: newRoute.id,
            name: newRoute.name,
            points: newRoute.points,
            createdAt: newRoute.created_at,
            distance: newRoute.distance,
          };
          setRoutes((prev) => [routeWithDistance, ...prev]);
          return {
            id: newRoute.id,
            name: newRoute.name,
            points: newRoute.points,
            createdAt: newRoute.created_at,
          };
        } else {
          // Save to localStorage
          const newRoute = RouteStorageService.saveRoute(routeData);
          const routeWithDistance: RouteWithCalculatedData = {
            ...newRoute,
            distance: calculateRouteDistance(newRoute.points),
          };
          setRoutes((prev) => [...prev, routeWithDistance]);
          return newRoute;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to save route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Update an existing route
  const updateRoute = useCallback(
    async (id: string, updates: { name?: string; points?: Array<Point> }) => {
      try {
        setError(null);

        if (user) {
          // Update in Supabase
          const updatedRoute = await SupabaseRouteStorage.updateRoute(id, updates, user.id);
          if (updatedRoute) {
            const routeWithDistance: RouteWithCalculatedData = {
              id: updatedRoute.id,
              name: updatedRoute.name,
              points: updatedRoute.points,
              createdAt: updatedRoute.created_at,
              distance: updatedRoute.distance,
            };
            setRoutes((prev) =>
              prev.map((route) => (route.id === id ? routeWithDistance : route)),
            );
            return {
              id: updatedRoute.id,
              name: updatedRoute.name,
              points: updatedRoute.points,
              createdAt: updatedRoute.created_at,
            };
          }
          return null;
        } else {
          // Update in localStorage
          const updatedRoute = RouteStorageService.updateRoute(id, updates);
          if (updatedRoute) {
            const routeWithDistance: RouteWithCalculatedData = {
              ...updatedRoute,
              distance: calculateRouteDistance(updatedRoute.points),
            };
            setRoutes((prev) =>
              prev.map((route) => (route.id === id ? routeWithDistance : route)),
            );
          }
          return updatedRoute;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Delete a route
  const deleteRoute = useCallback(
    async (id: string) => {
      try {
        setError(null);

        if (user) {
          // Delete from Supabase
          const success = await SupabaseRouteStorage.deleteRoute(id, user.id);
          if (success) {
            setRoutes((prev) => prev.filter((route) => route.id !== id));
          }
          return success;
        } else {
          // Delete from localStorage
          const success = RouteStorageService.deleteRoute(id);
          if (success) {
            setRoutes((prev) => prev.filter((route) => route.id !== id));
          }
          return success;
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete route";
        setError(errorMessage);
        throw new Error(errorMessage);
      }
    },
    [user],
  );

  // Clear all routes
  const clearAllRoutes = useCallback(async () => {
    try {
      setError(null);

      if (user) {
        // Clear from Supabase
        await SupabaseRouteStorage.clearAllRoutes(user.id);
      } else {
        // Clear from localStorage
        RouteStorageService.clearAllRoutes();
      }
      setRoutes([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear routes";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [user]);

  // Get a single route by ID
  const getRoute = useCallback(
    (id: string): RouteWithCalculatedData | null => {
      return routes.find((route) => route.id === id) || null;
    },
    [routes],
  );

  // Refresh routes from storage
  const refreshRoutes = useCallback(() => {
    loadRoutes();
  }, [loadRoutes]);

  return {
    routes,
    isLoading,
    error,
    saveRoute,
    updateRoute,
    deleteRoute,
    clearAllRoutes,
    getRoute,
    refreshRoutes,
    isCloudStorage,
  };
}
```

### Success Criteria

#### Automated Verification:
- [ ] TypeScript compiles: `pnpm tsc --noEmit` succeeds
- [ ] No linting errors: `pnpm lint` passes
- [ ] Build succeeds: `pnpm build` completes

#### Manual Verification:
- [ ] Anonymous users can create/edit/delete routes (stored in localStorage)
- [ ] After signing in, can create new routes that save to Supabase
- [ ] Routes created in Supabase appear in the routes list
- [ ] Can edit Supabase routes and changes persist
- [ ] Can delete Supabase routes
- [ ] After signing out, routes list shows localStorage routes again
- [ ] Verify in Supabase Studio that routes appear in database with correct user_id

---

## Phase 5: Enable GitHub OAuth in Supabase

### Overview
Configure GitHub OAuth provider in Supabase to enable social sign-in.

### Changes Required

#### 1. Configure GitHub OAuth
**Location**: Supabase Dashboard > Authentication > Providers

**Steps**:
1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Click "New OAuth App"
3. Fill in:
   - Application name: "Sone To"
   - Homepage URL: Your production URL
   - Authorization callback URL:
     - Local: `http://localhost:54321/auth/v1/callback`
     - Production: `https://<project-ref>.supabase.co/auth/v1/callback`
4. Copy Client ID and generate Client Secret
5. In Supabase Dashboard:
   - Enable "GitHub" provider
   - Paste Client ID and Secret
   - Save

### Success Criteria

#### Automated Verification:
- [ ] Supabase project configured: `supabase status` shows auth enabled

#### Manual Verification:
- [ ] Click "GitHub" button in auth dialog redirects to GitHub login
- [ ] After GitHub auth, user is signed in and routes sync
- [ ] User email/username appears in Supabase Dashboard > Authentication > Users
- [ ] User can sign out and sign in again successfully

---

## Phase 6: Environment Configuration for Vercel

### Overview
Configure environment variables in Vercel for production deployment.

### Changes Required

#### 1. Vercel Environment Variables
**Location**: Vercel Dashboard > Project > Settings > Environment Variables

**Add the following**:
```bash
# Supabase Production
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Existing variables (keep these)
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=<your-mapbox-token>
NEXT_PUBLIC_POSTHOG_KEY=<your-posthog-key>
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

**Scope**:
- Set for Production, Preview, and Development environments
- Production = main branch
- Preview = pull requests
- Development = local development (already in .env.local)

#### 2. Update `.env.example` (Documentation)
**File**: `.env.example` (create if doesn't exist)
**Content**:
```bash
# Mapbox
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_mapbox_token_here

# PostHog Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_key_here
NEXT_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321  # Use local for dev, cloud URL for prod
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

### Success Criteria

#### Automated Verification:
- [ ] Deployment succeeds: Vercel build completes without errors
- [ ] Environment variables set: Check Vercel dashboard shows all variables

#### Manual Verification:
- [ ] Production site loads without console errors
- [ ] Can sign in on production site
- [ ] Can create routes on production site
- [ ] Routes persist after page refresh on production
- [ ] Preview deployments work with Supabase

---

## Testing Strategy

### Unit Tests
**Location**: Create `lib/services/__tests__/supabase-route-storage.test.ts`

**Test Cases**:
- `saveRoute()` creates route with correct structure
- `getRoutes()` returns user's routes only (RLS enforcement)
- `updateRoute()` modifies only owned routes
- `deleteRoute()` removes only owned routes
- Error handling for network failures

### Integration Tests
**Location**: Create `tests/integration/auth-flow.test.ts`

**Test Cases**:
- Sign in with GitHub creates user in Supabase
- GitHub OAuth establishes session correctly
- Routes created after sign-in save to Supabase
- Sign out clears session but preserves routes
- Sign in on different device loads user's routes

### E2E Tests (Playwright)
**Location**: Create `tests/e2e/user-authentication.spec.ts`

**Test Cases**:
```typescript
test('anonymous user can create routes in localStorage', async ({ page }) => {
  // Test implementation
})

test('user can sign in with GitHub and access cloud routes', async ({ page }) => {
  // Test implementation
})

test('user can sign out and switch back to localStorage', async ({ page }) => {
  // Test implementation
})
```

### Manual Testing Checklist

#### Local Development:
1. Start Supabase: `supabase start`
2. Start Next.js: `pnpm dev`
3. Create route as anonymous user (localStorage)
4. Sign in with GitHub
5. Create new routes after sign-in (should save to cloud)
6. Check Supabase Studio for routes
7. Sign out and verify localStorage routes still accessible
8. Sign in again and verify cloud routes load

#### Production:
1. Deploy to Vercel
2. Test GitHub OAuth provider
3. Create routes on multiple devices
4. Verify cross-device sync
5. Test sign out and sign in flows

---

## Performance Considerations

### Database Optimization
- **Indexes**: Already created on `user_id` and `created_at` in migration
- **Query limits**: Add pagination if user has >100 routes (future enhancement)
- **Connection pooling**: Supabase handles this automatically

### Client-Side Performance
- **Optimistic updates**: Consider adding optimistic UI updates for better UX
- **Debouncing**: Add debounce to auto-save features (if implemented)
- **Lazy loading**: Load routes on demand vs all at once (future enhancement)

### Caching Strategy
- **React Query** (optional future enhancement): Add for better cache management
- **Service Worker**: Consider offline-first approach with sync (Phase 2 enhancement)

---

## Implementation Notes

### Breaking Changes
- None - fully backward compatible
- Anonymous users continue using localStorage exactly as before
- Authenticated users get new cloud sync feature
- Note: localStorage routes remain local and are not automatically migrated to cloud

### Database Migrations
- **Version control**: All migrations in `supabase/migrations/`
- **Rollback**: Can rollback using `supabase db reset`
- **Production**: Use `supabase db push` to apply to production
- **Local testing**: Always test migrations locally first with `supabase db reset`

---

## Local Development Workflow

### Daily Development
```bash
# Start Supabase (if not running)
supabase start

# Start Next.js dev server
pnpm dev

# In another terminal, watch for changes
pnpm test -- --watch

# Access Supabase Studio
open http://localhost:54323
```

### Creating New Migrations
```bash
# Create migration file
supabase migration new <migration_name>

# Edit the generated SQL file
# supabase/migrations/<timestamp>_<migration_name>.sql

# Apply migration locally
supabase db reset

# Generate updated TypeScript types
supabase gen types typescript --local > lib/types/supabase.ts
```

### Syncing with Production
```bash
# Pull production schema changes
supabase db pull

# Push local migrations to production
supabase db push
```

### Stopping Supabase
```bash
# Stop all Supabase services
supabase stop

# Stop and remove volumes (clean slate)
supabase stop --no-backup
```

---

## Troubleshooting

### Common Issues

**Issue**: Migration fails with "relation already exists"
- **Solution**: Run `supabase db reset` to clean slate and reapply

**Issue**: TypeScript types out of sync with database
- **Solution**: Run `supabase gen types typescript --local > lib/types/supabase.ts`

**Issue**: OAuth redirect not working locally
- **Solution**: Ensure OAuth provider has `http://localhost:54321/auth/v1/callback` in allowed redirects

**Issue**: Routes not loading after sign-in
- **Solution**: Check browser console for errors, verify RLS policies in Supabase Studio

**Issue**: Docker containers not starting
- **Solution**: Check Docker Desktop is running, try `supabase stop --no-backup && supabase start`

**Issue**: Production deployment can't connect to Supabase
- **Solution**: Verify Vercel environment variables are set correctly

---

## Security Considerations

### Row Level Security (RLS)
- **Enforced**: All route queries filtered by `auth.uid() = user_id`
- **Cannot be bypassed**: PostgreSQL enforces RLS at database level
- **Anonymous key safe**: `NEXT_PUBLIC_SUPABASE_ANON_KEY` is safe to expose (RLS protects data)

### Authentication
- **Password storage**: Never stored in application (Supabase handles)
- **Session management**: Secure HTTP-only cookies (handled by `@supabase/ssr`)
- **Token refresh**: Automatic via middleware

### Environment Variables
- **Public variables**: Only `NEXT_PUBLIC_*` exposed to browser (safe)
- **Private variables**: Service role key never used in client code
- **Production secrets**: Managed via Vercel environment variables (encrypted)

---

## Future Enhancements

### Phase 2 (Post-MVP):
- Route sharing via shareable links with permissions
- Route collections/folders
- Real-time collaboration (multiple users editing same route)
- Offline-first sync with service workers
- Route history/versioning
- Public route discovery (community routes)

### Performance Optimizations:
- React Query for better cache management
- Virtual scrolling for large route lists
- Incremental Static Regeneration (ISR) for public routes
- CDN caching for shared routes

---

## Documentation Updates

### README.md Updates Needed:
```markdown
## Development Setup

### Prerequisites
- Node.js 22+
- pnpm
- Docker Desktop
- Supabase CLI

### Getting Started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Install Supabase CLI:
   ```bash
   brew install supabase/tap/supabase
   ```

3. Start Supabase locally:
   ```bash
   supabase start
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Then fill in the Supabase keys from `supabase start` output.

5. Start development server:
   ```bash
   pnpm dev
   ```

6. Access Supabase Studio (optional):
   ```bash
   open http://localhost:54323
   ```

### Running Tests
- Unit tests: `pnpm test`
- E2E tests: `pnpm test:e2e`
- Coverage: `pnpm test:coverage`
```

---

## References

- Research document: `planning/2025-10-08-user-authentication/research.md`
- Supabase Next.js docs: https://supabase.com/docs/guides/auth/auth-helpers/nextjs
- Supabase CLI docs: https://supabase.com/docs/guides/cli
- Supabase local development: https://supabase.com/docs/guides/cli/local-development
- Row Level Security guide: https://supabase.com/docs/guides/auth/row-level-security

---

## Success Metrics

### Technical Metrics:
- [ ] All phases completed successfully
- [ ] Zero breaking changes for existing users
- [ ] RLS policies enforced (verified via tests)
- [ ] Local Supabase instance running smoothly
- [ ] Production deployment successful

### User Experience Metrics:
- [ ] Anonymous users can use app without sign-up
- [ ] Authenticated users routes sync across devices
- [ ] GitHub OAuth sign-in works correctly
- [ ] No data loss during any operation
- [ ] Switching between anonymous and authenticated modes works smoothly

### Performance Metrics:
- [ ] Route load time <500ms (local and cloud)
- [ ] Auth state detection <100ms
- [ ] Page load time <2 seconds (production)
