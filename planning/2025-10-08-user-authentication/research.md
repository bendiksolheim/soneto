---
date: 2025-10-08T19:34:41+0000
researcher: Claude (Sonnet 4.5)
git_commit: 8432e0e86c553fedfc67bf4d57740257f0b7b47b
branch: main
repository: soneto
topic: "User Authentication and Cloud Route Storage Implementation"
tags: [research, authentication, route-storage, user-management, cloud-sync]
status: complete
last_updated: 2025-10-08
last_updated_by: Claude (Sonnet 4.5)
---

# Research: User Authentication and Cloud Route Storage Implementation

**Date**: 2025-10-08T19:34:41+0000
**Researcher**: Claude (Sonnet 4.5)
**Git Commit**: 8432e0e86c553fedfc67bf4d57740257f0b7b47b
**Branch**: main
**Repository**: soneto

## Research Question

How should Soneto implement user authentication and cloud-based route storage to enable:
1. Cross-device and cross-browser route synchronization for logged-in users
2. Backward compatibility with localStorage for non-authenticated users
3. Minimal maintenance overhead using managed services
4. Avoiding self-managed password storage
5. Generous free tier for early-stage growth

## Summary

Based on analysis of the current codebase and evaluation of authentication services, **Supabase** emerges as the optimal solution for Soneto's requirements. It provides both authentication (solving user management) and database storage (solving route persistence) in a single integrated service, with a generous free tier of 10,000 monthly active users and straightforward Next.js integration.

The current architecture stores all routes in localStorage (`lib/services/route-storage.ts`), which is browser-specific. The migration path involves:
1. Adding Supabase Auth for user management
2. Creating a PostgreSQL table for cloud route storage
3. Implementing dual storage (localStorage + cloud) for seamless migration
4. Maintaining backward compatibility for anonymous users

## Current Architecture Analysis

### Route Storage Implementation

**Primary Storage Service**: `lib/services/route-storage.ts:12-167`

The application uses a static class-based service with these key methods:
- `getRoutes()` - Retrieves all routes from localStorage
- `saveRoute(routeData)` - Creates new route with UUID (line 60-76)
- `updateRoute(id, updates)` - Updates existing route (line 79-99)
- `deleteRoute(id)` - Removes route (line 102-110)
- `clearAllRoutes()` - Removes all routes (line 113-115)

**Storage Key**: `"route-runner-routes"` (defined in `lib/types/route.ts:53`)

**Data Model**: `lib/types/route.ts:3-13`
```typescript
interface StoredRoute {
  id: string;           // UUID
  name: string;         // User-provided name
  points: Point[];      // Array of {latitude, longitude}
  createdAt: string;    // ISO timestamp
}

interface RouteStorage {
  routes: StoredRoute[];
  lastModified: string;
}
```

### React Integration

**Custom Hook**: `hooks/use-routes.ts:27-154`

Provides React state management over the storage service:
- Loads routes on mount
- Exposes CRUD operations as async functions
- Maintains loading/error states
- Currently has **no awareness of user identity**

### Current Limitations

1. **No user association** - Routes aren't tied to any user ID
2. **Browser-only storage** - No cross-device synchronization
3. **No backup** - Data loss if localStorage is cleared
4. **No sharing** - Can't share routes with other users (only via URL encoding)
5. **No collaboration** - Single-user only

## Authentication Service Comparison

### Option 1: Supabase ⭐ **RECOMMENDED**

**What it solves**: Both authentication AND database storage in one service

**Free Tier** (2025):
- 10,000 Monthly Active Users (MAUs)
- Unlimited API requests
- 500 MB database storage
- 1 GB file storage
- 2 GB bandwidth
- 2 active projects
- PostgreSQL database included
- Real-time subscriptions included

**Pricing Beyond Free**:
- Pro: $25/month (100,000 MAUs, 8 GB database)
- Team: $599/month (SSO, enhanced features)

**Pros for Soneto**:
✅ **Unified solution** - Auth + Database + Storage in one service
✅ **PostgreSQL database** - Perfect for storing routes with user relationships
✅ **Row Level Security (RLS)** - Built-in authorization (users can only access their routes)
✅ **Real-time subscriptions** - Future feature: collaborative route editing
✅ **Next.js integration** - Official `@supabase/ssr` package for App Router
✅ **Social logins** - Google, GitHub, etc. without additional setup
✅ **No password storage** - Supabase handles all credential management
✅ **Generous free tier** - 10k MAUs is plenty for growth phase
✅ **Type generation** - Auto-generate TypeScript types from database schema

**Cons**:
❌ Vendor lock-in (PostgreSQL specific)
❌ Projects pause after 1 week inactivity on free tier
❌ Limited to 2 active projects on free tier

**Implementation Effort**: Medium (requires database schema design)

**Code References**:
- Integration point: `app/layout.tsx` (add SupabaseProvider)
- Migration: `lib/services/route-storage.ts` (dual localStorage + Supabase)
- New hook: Create `hooks/use-supabase-routes.ts`

---

### Option 2: Clerk

**What it solves**: Authentication only (still need separate database)

**Free Tier** (2025):
- 10,000 Monthly Active Users
- 100 Monthly Active Organizations
- Pre-built UI components
- Custom domain support
- Social logins included

**Pricing Beyond Free**:
- Pro: $25/month + $0.02 per MAU above 10k
- Add-ons: Enhanced Auth ($100/mo), SAML ($50/connection)

**Pros for Soneto**:
✅ **Pre-built UI** - Beautiful sign-in/sign-up components out of the box
✅ **Next.js optimized** - Excellent App Router support
✅ **User management UI** - Admin dashboard for user management
✅ **Organizations support** - Could enable teams/clubs sharing routes
✅ **Easy middleware** - Simple route protection

**Cons**:
❌ **Auth only** - Still need separate database (Vercel Postgres, Neon, etc.)
❌ **Higher cost** - $0.02 per MAU can add up faster than Supabase
❌ **Two services** - Need to manage auth + database separately
❌ **Overage enforcement** - 1-month grace period, then required upgrade

**Implementation Effort**: Medium (need to set up separate database)

---

### Option 3: NextAuth.js / Auth.js

**What it solves**: Authentication only (self-hosted, open-source)

**Free Tier**:
- Completely free (open-source)
- Unlimited users
- Self-hosted (you control everything)

**Pricing**:
- $0 (but you pay for database hosting)

**Pros for Soneto**:
✅ **Free forever** - No per-user costs
✅ **No vendor lock-in** - Open source, you own the code
✅ **Database flexibility** - Use any database (Postgres, MongoDB, etc.)
✅ **Provider variety** - Supports 50+ OAuth providers
✅ **Next.js native** - Built specifically for Next.js

**Cons**:
❌ **DIY UI** - Need to build your own sign-in components
❌ **Complex setup** - Requires understanding of OAuth flows
❌ **More maintenance** - You're responsible for updates and security
❌ **Documentation issues** - Some developers report poor docs in v5
❌ **Still need database** - Separate service for route storage

**Implementation Effort**: High (most configuration required)

---

### Option 4: Firebase Authentication

**What it solves**: Authentication + Firestore Database

**Free Tier** (2025):
- 50,000 Monthly Active Users (most generous!)
- Email/password and social logins included
- 1 GB Firestore storage
- 10 GB bandwidth/month

**Pricing Beyond Free**:
- Phone Auth: Requires Blaze plan (pay-as-you-go for SMS)
- SAML/OIDC: $0.015 per MAU
- Google Cloud Identity Platform for >50k MAU

**Pros for Soneto**:
✅ **Highest MAU free tier** - 50k vs 10k for competitors
✅ **Auth + Database** - Firestore included
✅ **Google ecosystem** - Reliable infrastructure
✅ **Real-time sync** - Firestore has built-in real-time updates

**Cons**:
❌ **NoSQL only** - Firestore is document-based (less ideal for relational route data)
❌ **Google Cloud complexity** - Billing can be confusing
❌ **Vendor lock-in** - Heavy Firebase/Google dependency
❌ **Phone auth not free** - SMS costs extra on Blaze plan
❌ **Less Next.js focused** - Not as optimized for Next.js as alternatives

**Implementation Effort**: Medium-High (NoSQL data modeling required)

---

## Recommended Solution: Supabase

### Why Supabase is the Best Fit

1. **Single Service** - Solves both authentication AND route storage needs
2. **PostgreSQL** - Ideal for relational data (users ↔ routes)
3. **Row Level Security** - Automatic authorization without manual checks
4. **Next.js Integration** - Official support for App Router with `@supabase/ssr`
5. **Cost-Effective** - 10k MAU free tier + database + storage in one price
6. **Developer Experience** - Excellent TypeScript support, auto-generated types

### Database Schema Design

```sql
-- Users table (managed by Supabase Auth)
-- auth.users (built-in, don't create manually)

-- Routes table
CREATE TABLE routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  points JSONB NOT NULL,  -- Array of {latitude, longitude}
  distance NUMERIC,        -- Calculated distance in km
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Indexes for performance
  INDEX idx_routes_user_id (user_id),
  INDEX idx_routes_created_at (created_at DESC)
);

-- Row Level Security (RLS) policies
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

-- Users can only read their own routes
CREATE POLICY "Users can view own routes"
  ON routes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own routes
CREATE POLICY "Users can create routes"
  ON routes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own routes
CREATE POLICY "Users can update own routes"
  ON routes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own routes
CREATE POLICY "Users can delete own routes"
  ON routes FOR DELETE
  USING (auth.uid() = user_id);
```

### Implementation Roadmap

#### Phase 1: Add Supabase (No Breaking Changes)
**Goal**: Auth works, but routes still use localStorage

**Tasks**:
1. Install dependencies: `pnpm add @supabase/supabase-js @supabase/ssr`
2. Create `/lib/supabase/client.ts` and `/lib/supabase/server.ts`
3. Add environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Wrap `app/layout.tsx` with Supabase provider
5. Create auth UI component (sign-in/sign-up) in `components/auth/`
6. Add sign-in button to `components/menu-bar.tsx`
7. Test authentication flow (no route migration yet)

**Files to Create**:
- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/middleware.ts`
- `components/auth/auth-dialog.tsx`
- `components/auth/user-menu.tsx`

**Files to Modify**:
- `app/layout.tsx` (add provider)
- `components/menu-bar.tsx` (add sign-in button)
- `.env.local` (add Supabase keys)
- `middleware.ts` (create for auth refresh)

#### Phase 2: Dual Storage (Backward Compatible)
**Goal**: Logged-in users sync to cloud, anonymous users still work

**Tasks**:
1. Run database migration in Supabase dashboard (SQL above)
2. Create `/lib/services/supabase-route-storage.ts`
3. Modify `hooks/use-routes.ts` to:
   - Check if user is authenticated
   - If authenticated: use Supabase storage
   - If not: use localStorage (existing behavior)
4. Add "Sync to Cloud" button for migrating local routes to user account
5. Test dual-mode operation

**New Type** (`lib/types/route.ts`):
```typescript
interface StoredRoute {
  id: string;
  user_id?: string;  // NEW: Optional for backward compatibility
  name: string;
  points: Point[];
  createdAt: string;
}
```

**Files to Create**:
- `lib/services/supabase-route-storage.ts`
- `components/sync-routes-dialog.tsx`

**Files to Modify**:
- `hooks/use-routes.ts` (add conditional storage logic)
- `lib/types/route.ts` (add `user_id?` field)
- `components/capabilities-panel.tsx` (add sync button)

#### Phase 3: Migration & Cleanup
**Goal**: Full cloud storage for authenticated users

**Tasks**:
1. Add automatic migration prompt when user signs in with local routes
2. Show storage location indicator in UI (cloud icon vs local icon)
3. Add "Export All Routes" backup feature
4. Implement offline mode with sync when online
5. Add route sharing with permissions (public/private)

**Advanced Features** (Future):
- Real-time collaboration (multiple users editing same route)
- Route templates/community routes
- Route collections/folders
- Activity tracking (when routes were last used)

### Code Integration Points

#### 1. Layout Wrapper (`app/layout.tsx`)

```typescript
import { createServerClient } from '@/lib/supabase/server'

export default async function RootLayout({ children }) {
  // Check auth status on server
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  return (
    <html>
      <body>
        <SupabaseProvider session={session}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
```

#### 2. Modified Storage Hook (`hooks/use-routes.ts`)

```typescript
export function useRoutes() {
  const { user } = useAuth() // Supabase auth context

  const saveRoute = async (routeData) => {
    if (user) {
      // Save to Supabase
      return await SupabaseRouteStorage.saveRoute(routeData, user.id)
    } else {
      // Save to localStorage (existing logic)
      return await RouteStorageService.saveRoute(routeData)
    }
  }

  // Similar pattern for update, delete, etc.
}
```

#### 3. Supabase Storage Service (`lib/services/supabase-route-storage.ts`)

```typescript
import { createClient } from '@/lib/supabase/client'

export class SupabaseRouteStorage {
  static async saveRoute(routeData: { name: string; points: Point[] }, userId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routes')
      .insert({
        user_id: userId,
        name: routeData.name,
        points: routeData.points,
        distance: calculateRouteDistance(routeData.points),
      })
      .select()
      .single()

    if (error) throw error
    return data
  }

  static async getRoutes(userId: string) {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('routes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  }

  // Additional methods: updateRoute, deleteRoute, etc.
}
```

## Alternative Approach: Clerk + Neon

If pre-built UI components are highly valued, consider:

**Combination**: Clerk (auth) + Neon (Postgres database)

**Free Tier**:
- Clerk: 10k MAU free
- Neon: 0.5 GB storage, 3 GB bandwidth/month

**Pros**:
- Beautiful auth UI out of the box
- Separate concerns (auth vs data)
- Neon has excellent Next.js integration

**Cons**:
- More complex setup (two services)
- Higher cost at scale ($25 Clerk + Neon overages)
- Need to manually implement authorization logic

**When to choose this**: If UI/UX is critical and you want minimal auth UI development.

## Risk Assessment

### Supabase Risks

1. **Project pausing** (free tier): Projects pause after 1 week of inactivity
   - **Mitigation**: Keep project active with health check, or upgrade to Pro ($25/mo)

2. **Vendor lock-in**: PostgreSQL schema specific to Supabase
   - **Mitigation**: Database can be exported/migrated to any Postgres host

3. **Free tier limits**: 2 active projects max
   - **Mitigation**: Use one project for prod, one for staging, local dev uses local Supabase

### Migration Risks

1. **Data loss during migration**: Users lose routes if migration fails
   - **Mitigation**: Dual storage during Phase 2, never delete localStorage until confirmed cloud save

2. **Breaking changes for existing users**: Current users have routes in localStorage
   - **Mitigation**: Automatic migration prompt, "Sync to Cloud" feature, localStorage as fallback

3. **Offline functionality**: Routes not accessible without internet
   - **Mitigation**: Keep localStorage as cache, sync when online (hybrid approach)

## Open Questions

1. **Should anonymous users be able to export routes to authenticated accounts?**
   - Proposed: Yes, via one-time migration on first sign-in

2. **Do we want route sharing/collaboration features?**
   - Supabase RLS can enable this with additional policies
   - Could add `shared_routes` junction table

3. **Should draft routes sync to cloud?**
   - Current: Draft is auto-saved to localStorage (`app/page.tsx:68-79`)
   - Proposal: Keep draft local-only for performance, only save named routes to cloud

4. **What about offline mode?**
   - Supabase supports offline-first with local cache
   - Need to implement service worker for full PWA experience

5. **Route ownership transfer?**
   - If user creates route anonymously, then signs in, who owns it?
   - Proposal: Attach to user account on first sign-in with confirmation

## Next Steps

1. **Decision**: Confirm Supabase as the chosen solution
2. **Setup**: Create Supabase project, get API keys
3. **Schema**: Run database migration (SQL above)
4. **Phase 1 Implementation**: Add authentication without touching route storage
5. **Testing**: Verify auth flow works with existing localStorage routes
6. **Phase 2 Implementation**: Add cloud sync for authenticated users
7. **Migration**: Build automatic migration flow for existing users
8. **Documentation**: Update README with auth setup instructions

## Related Research

- Route sharing via URL: `lib/route-url.ts:15-57` (current implementation)
- GPX export: `utils/gpx.ts:3-12` (could be enhanced with cloud storage)
- Distance calculation: `lib/types/route.ts:16-45` (should be stored in DB)

---

## Appendix: Service Comparison Table

| Feature | Supabase | Clerk | NextAuth | Firebase |
|---------|----------|-------|----------|----------|
| **Free MAU** | 10,000 | 10,000 | Unlimited | 50,000 |
| **Database Included** | ✅ Postgres | ❌ | ❌ | ✅ Firestore |
| **Pre-built UI** | Basic | ✅ Beautiful | ❌ DIY | Basic |
| **Social Logins** | ✅ | ✅ | ✅ | ✅ |
| **Next.js Integration** | ✅ Excellent | ✅ Excellent | ✅ Native | ⚠️ Good |
| **TypeScript Support** | ✅ Auto-generated | ✅ | ✅ | ⚠️ |
| **Row Level Security** | ✅ Built-in | ❌ | ❌ | ✅ Rules |
| **Real-time Sync** | ✅ | ❌ | ❌ | ✅ |
| **Cost Beyond Free** | $25 (100k MAU) | $25 + $0.02/MAU | $0 | Pay-as-you-go |
| **Vendor Lock-in** | Medium | High | Low | High |
| **Self-hosted Option** | ✅ | ❌ | ✅ | ❌ |

**Best for Soneto**: Supabase (unified auth + database + generous free tier + excellent DX)
