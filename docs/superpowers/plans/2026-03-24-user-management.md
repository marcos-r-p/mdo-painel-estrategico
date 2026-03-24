# User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add user management (CRUD, custom roles with per-page permissions, access logs) to the MdO Painel Estratégico.

**Architecture:** New DB tables (`roles`, `role_permissions`, `access_logs`) + migration of `user_profiles.role` → `role_id` FK. A single Edge Function (`user-management`) handles admin operations using `service_role` key. Frontend adds 3 admin pages under `/app/admin/*`, a `usePermissions()` hook with React Query cache, and a `usePageTracking()` hook for access logging.

**Tech Stack:** React 19, TypeScript, Supabase (PostgreSQL + Auth + Edge Functions), React Query v5, React Router v7, TailwindCSS v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-03-24-user-management-design.md`

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| `supabase/migrations/20260324_user_management.sql` | DB migration: tables, seed, RLS, `is_admin()` function |
| `supabase/functions/user-management/index.ts` | Edge Function: invite, update, deactivate, reactivate, delete, list |
| `src/types/userManagement.ts` | TypeScript types for roles, permissions, access logs |
| `src/services/api/userManagement.ts` | API calls to Edge Function |
| `src/services/api/roles.ts` | Supabase queries for roles + role_permissions |
| `src/services/api/accessLogs.ts` | Supabase queries for access_logs |
| `src/services/queries/useUserManagementQueries.ts` | React Query hooks + mutations for users |
| `src/services/queries/useRolesQueries.ts` | React Query hooks + mutations for roles |
| `src/services/queries/useAccessLogsQueries.ts` | React Query hooks for logs + stats |
| `src/hooks/usePermissions.ts` | Permission check hook with React Query cache |
| `src/hooks/usePageTracking.ts` | Fire-and-forget page_view logging hook |
| `src/pages/admin/UsuariosPage.tsx` | User management page |
| `src/pages/admin/RolesPage.tsx` | Roles & permissions page |
| `src/pages/admin/LogsAcessoPage.tsx` | Access logs page |
| `src/components/admin/UserModal.tsx` | Create/edit user modal |
| `src/components/admin/RoleModal.tsx` | Create/edit role modal |
| `src/components/admin/DeleteConfirmModal.tsx` | Confirm hard-delete modal (type email) |

### Modified Files

| File | Change |
|------|--------|
| `src/types/database.ts:164-172` | Update `UserProfile` interface: replace `role` with `role_id` + `role_nome`, add `deleted_at`, remove `avatar_url` |
| `src/contexts/AuthContext.tsx:134` | Change `isAdmin` derivation from `role === 'admin'` to `role_nome === 'admin'` |
| `src/services/api/auth.ts:47-75` | Update `fetchUserProfile` to join `roles` table |
| `src/app/routes.tsx` | Add admin routes, add `PageGuard` component for permission checks |
| `src/components/layout/Sidebar.tsx:86-144` | Filter nav items by permissions, add admin section |
| `src/lib/constants.ts` | Add `ADMIN_NAVIGATION` constant and `PAGE_KEYS` map |

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260324_user_management.sql`

- [ ] **Step 1: Write the migration SQL file**

```sql
-- ============================================================
-- User Management Migration
-- ============================================================

-- 1. Helper function: is_admin
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_profiles up
    JOIN public.roles r ON r.id = up.role_id
    WHERE up.id = check_user_id
      AND r.nome = 'admin'
  );
$$;

-- 2. Create roles table
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text UNIQUE NOT NULL,
  descricao text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read ON public.roles
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_write ON public.roles
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 3. Seed system roles
INSERT INTO public.roles (nome, descricao, is_system) VALUES
  ('admin', 'Acesso total ao sistema', true),
  ('leitor', 'Acesso somente leitura', true);

-- 4. Create role_permissions table
CREATE TABLE public.role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (role_id, page_key)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read ON public.role_permissions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY admin_write ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()));

-- 5. Seed leitor permissions (all 14 pages)
INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, p.key
FROM public.roles r,
     unnest(ARRAY[
       'dashboard','fluxo-caixa','clientes','analise-b2c','matriz-rfm',
       'canais-b2b','produtos','analise-temporal','shopify','crm',
       'funil','analise-ia','metas','alertas'
     ]) AS p(key)
WHERE r.nome = 'leitor';

-- 6. Create access_logs table
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  page_key text,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_access_logs_user_created ON public.access_logs (user_id, created_at);
CREATE INDEX idx_access_logs_event_created ON public.access_logs (event_type, created_at);
CREATE INDEX idx_access_logs_page_created ON public.access_logs (page_key, created_at);

ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_insert ON public.access_logs
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY admin_read ON public.access_logs
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- 7. Migrate user_profiles: add role_id
ALTER TABLE public.user_profiles ADD COLUMN role_id uuid REFERENCES public.roles(id);

UPDATE public.user_profiles up
SET role_id = r.id
FROM public.roles r
WHERE r.nome = up.role;

ALTER TABLE public.user_profiles ALTER COLUMN role_id SET NOT NULL;

-- 8. Add deleted_at for soft delete
ALTER TABLE public.user_profiles ADD COLUMN deleted_at timestamptz;

-- 9. Drop old role column
ALTER TABLE public.user_profiles DROP COLUMN role;

-- 10. Update is_admin function (now that role column is gone, confirm it works)
-- Already defined above with role_id join — no change needed.
```

- [ ] **Step 2: Apply migration to Supabase**

Run: `npx supabase db push` or apply via Supabase Dashboard SQL Editor.

Expected: All tables created, seed data inserted, existing users migrated.

- [ ] **Step 3: Verify migration**

Run these queries in Supabase SQL Editor:
```sql
-- Verify roles exist
SELECT * FROM roles;
-- Verify leitor has 14 permissions
SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id WHERE r.nome = 'leitor';
-- Verify user_profiles has role_id, no role column
SELECT id, email, role_id, deleted_at FROM user_profiles LIMIT 5;
-- Verify is_admin function works
SELECT is_admin(id) FROM user_profiles LIMIT 1;
```

Expected: 2 roles, 14 leitor permissions, role_id populated, is_admin returns boolean.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260324_user_management.sql
git commit -m "feat: add user management migration — roles, permissions, access_logs tables"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/types/userManagement.ts`
- Modify: `src/types/database.ts:164-172`

- [ ] **Step 1: Create userManagement.ts types**

```typescript
// src/types/userManagement.ts

export interface Role {
  id: string
  nome: string
  descricao: string | null
  is_system: boolean
  created_at: string
}

export interface RolePermission {
  id: string
  role_id: string
  page_key: string
  created_at: string
}

export interface RoleWithPermissions extends Role {
  permissions: string[] // page_keys
  user_count: number
}

export interface AccessLog {
  id: string
  user_id: string
  event_type: 'login' | 'logout' | 'page_view'
  page_key: string | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
  // joined
  user_email?: string
  user_nome?: string
}

export interface AccessLogStats {
  today_count: number
  active_users_7d: number
  top_page: string | null
}

export interface InviteUserPayload {
  email: string
  nome?: string
  role_id: string
  send_email: boolean
  password?: string
}

export interface UpdateUserPayload {
  user_id: string
  nome?: string
  role_id?: string
}

export interface AccessLogFilters {
  user_id?: string
  event_type?: string
  from_date?: string
  to_date?: string
  page: number
  per_page: number
}
```

- [ ] **Step 2: Update UserProfile in database.ts**

In `src/types/database.ts`, replace lines 164-172:

**Old:**
```typescript
export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  role: 'admin' | 'viewer' | 'editor';
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}
```

**New:**
```typescript
export interface UserProfile {
  id: string;
  email: string;
  nome: string | null;
  role_id: string;
  role_nome: string;
  ativo: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/types/userManagement.ts src/types/database.ts
git commit -m "feat: add user management types and update UserProfile interface"
```

---

## Task 3: Update Auth Layer (fetchUserProfile + AuthContext)

**Files:**
- Modify: `src/services/api/auth.ts:47-75`
- Modify: `src/contexts/AuthContext.tsx:134`

- [ ] **Step 1: Update fetchUserProfile to join roles**

In `src/services/api/auth.ts`, update the `fetchUserProfile` function. Change the select query to join `roles`:

```typescript
// Replace the existing select call with:
const { data, error } = await supabase
  .from('user_profiles')
  .select('*, roles!inner(nome)')
  .eq('id', userId)
  .is('deleted_at', null)
  .single()

if (data) {
  return {
    ...data,
    role_nome: data.roles.nome,
    roles: undefined, // clean up joined field
  } as UserProfile
}
```

Apply the same pattern to the email fallback query.

- [ ] **Step 2: Update isAdmin derivation in AuthContext**

In `src/contexts/AuthContext.tsx`, change line 134:

**Old:** `const isAdmin = userProfile?.role === 'admin'`
**New:** `const isAdmin = userProfile?.role_nome === 'admin'`

- [ ] **Step 3: Add deactivated user check after login**

In `src/contexts/AuthContext.tsx`, in the `login` function (around line 52-58), add a check after successful login:

```typescript
const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  // Check if user is deactivated
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('ativo, deleted_at')
    .eq('id', data.user.id)
    .single()

  if (profile && (!profile.ativo || profile.deleted_at)) {
    await supabase.auth.signOut()
    throw new Error('Conta desativada. Entre em contato com o administrador.')
  }

  return data
}
```

- [ ] **Step 4: Verify the app still loads and login works**

Run: `npm run dev`

Expected: App loads, login works, `isAdmin` still works correctly with the new `role_nome` field.

- [ ] **Step 5: Commit**

```bash
git add src/services/api/auth.ts src/contexts/AuthContext.tsx
git commit -m "feat: update auth layer to use role_id join and block deactivated users"
```

---

## Task 4: Constants and Page Keys

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add PAGE_KEYS map and ADMIN_NAVIGATION**

Append to `src/lib/constants.ts`:

```typescript
/** Map route path segment → page_key used in role_permissions */
export const PAGE_KEYS: Record<string, string> = {
  dashboard: 'dashboard',
  'fluxo-caixa': 'fluxo-caixa',
  clientes: 'clientes',
  'analise-b2c': 'analise-b2c',
  'matriz-rfm': 'matriz-rfm',
  'canais-b2b': 'canais-b2b',
  produtos: 'produtos',
  'analise-temporal': 'analise-temporal',
  shopify: 'shopify',
  crm: 'crm',
  funil: 'funil',
  'analise-ia': 'analise-ia',
  metas: 'metas',
  alertas: 'alertas',
}

export const ADMIN_NAVIGATION: NavigationSection[] = [
  { id: 'admin-usuarios', label: 'Usuários', icon: '👤', path: '/app/admin/usuarios' },
  { id: 'admin-roles', label: 'Roles e Permissões', icon: '🔑', path: '/app/admin/roles' },
  { id: 'admin-logs', label: 'Logs de Acesso', icon: '📋', path: '/app/admin/logs' },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/constants.ts
git commit -m "feat: add PAGE_KEYS map and ADMIN_NAVIGATION constants"
```

---

## Task 5: Permissions Hook

**Files:**
- Create: `src/hooks/usePermissions.ts`

- [ ] **Step 1: Create usePermissions hook**

```typescript
// src/hooks/usePermissions.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'

export function usePermissions() {
  const { userProfile, isAdmin } = useAuth()

  const { data: allowedPages = new Set<string>(), isLoading } = useQuery({
    queryKey: ['permissions', userProfile?.role_id],
    queryFn: async () => {
      if (!userProfile?.role_id) return new Set<string>()

      const { data, error } = await supabase
        .from('role_permissions')
        .select('page_key')
        .eq('role_id', userProfile.role_id)

      if (error) throw error
      return new Set(data.map((r) => r.page_key))
    },
    enabled: !!userProfile?.role_id && !isAdmin,
    staleTime: 5 * 60 * 1000,
  })

  return {
    allowedPages: isAdmin ? null : allowedPages, // null = all access
    isAdmin,
    isLoading,
    hasAccess: (pageKey: string) => {
      if (isAdmin) return true
      if (pageKey === 'dashboard') return true // always accessible
      return allowedPages.has(pageKey)
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePermissions.ts
git commit -m "feat: add usePermissions hook with React Query cache"
```

---

## Task 6: Page Tracking Hook

**Files:**
- Create: `src/hooks/usePageTracking.ts`
- Modify: `src/components/layout/AppLayout.tsx`

- [ ] **Step 1: Create usePageTracking hook**

```typescript
// src/hooks/usePageTracking.ts
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '../services/supabase'
import { useAuth } from './useAuth'
import { PAGE_KEYS } from '../lib/constants'

export function usePageTracking() {
  const location = useLocation()
  const { user } = useAuth()
  const lastPath = useRef<string>('')

  useEffect(() => {
    if (!user) return

    // Extract page segment from /app/{page} or /app/admin/{page}
    const segments = location.pathname.replace('/app/', '').split('/')
    const pageKey = segments.length > 1 && segments[0] === 'admin'
      ? `admin/${segments[1]}`
      : PAGE_KEYS[segments[0]] ?? null

    if (!pageKey || pageKey === lastPath.current) return
    lastPath.current = pageKey

    // Fire and forget — don't await, don't block navigation
    supabase
      .from('access_logs')
      .insert({
        user_id: user.id,
        event_type: 'page_view',
        page_key: pageKey,
        user_agent: navigator.userAgent,
      })
      .then(() => {}) // silence unhandled promise
  }, [location.pathname, user])
}
```

- [ ] **Step 2: Add usePageTracking to AppLayout**

In `src/components/layout/AppLayout.tsx`, add inside the component before the return:

```typescript
import { usePageTracking } from '../../hooks/usePageTracking'

// Inside AppLayout component, before return:
usePageTracking()
```

- [ ] **Step 3: Add login/logout logging to AuthContext**

In `src/contexts/AuthContext.tsx`, after successful login (after the deactivation check), add:

```typescript
// Fire and forget
supabase.from('access_logs').insert({
  user_id: data.user.id,
  event_type: 'login',
  user_agent: navigator.userAgent,
})
```

In the `logout` function, before `signOut`:

```typescript
if (user) {
  supabase.from('access_logs').insert({
    user_id: user.id,
    event_type: 'logout',
    user_agent: navigator.userAgent,
  })
}
```

- [ ] **Step 4: Verify page tracking works**

Run: `npm run dev`, navigate between pages, then check in Supabase:
```sql
SELECT * FROM access_logs ORDER BY created_at DESC LIMIT 10;
```

Expected: `page_view` entries for each navigation, `login` entry on login.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/usePageTracking.ts src/components/layout/AppLayout.tsx src/contexts/AuthContext.tsx
git commit -m "feat: add page tracking and login/logout logging"
```

---

## Task 7: Route Protection with Permissions

**Files:**
- Modify: `src/app/routes.tsx`

- [ ] **Step 1: Add PageGuard component and admin routes**

In `src/app/routes.tsx`:

1. Add lazy imports for admin pages:
```typescript
const UsuariosPage = lazy(() => import('../pages/admin/UsuariosPage'))
const RolesPage = lazy(() => import('../pages/admin/RolesPage'))
const LogsAcessoPage = lazy(() => import('../pages/admin/LogsAcessoPage'))
```

2. Add `PageGuard` component after `ProtectedRoute`:
```typescript
function PageGuard({ pageKey, children }: { pageKey: string; children: ReactNode }) {
  const { hasAccess, isLoading } = usePermissions()

  if (isLoading) return <Spinner />
  if (!hasAccess(pageKey)) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}

function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth()
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />
  return <>{children}</>
}
```

3. Wrap existing routes with `PageGuard` and add admin routes:
```typescript
{ path: 'dashboard', element: <DashboardPage /> }, // always accessible
{ path: 'fluxo-caixa', element: <PageGuard pageKey="fluxo-caixa"><FluxoCaixaPage /></PageGuard> },
{ path: 'clientes', element: <PageGuard pageKey="clientes"><ClientesPage /></PageGuard> },
// ... same for all other pages
{
  path: 'admin',
  element: <AdminGuard><Outlet /></AdminGuard>,
  children: [
    { path: 'usuarios', element: <UsuariosPage /> },
    { path: 'roles', element: <RolesPage /> },
    { path: 'logs', element: <LogsAcessoPage /> },
  ],
},
```

Add imports: `usePermissions` from hooks, `Outlet` from react-router-dom.

- [ ] **Step 2: Create placeholder admin pages**

Create minimal placeholder files so routes don't break:

`src/pages/admin/UsuariosPage.tsx`:
```typescript
export default function UsuariosPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Usuários</h1></div>
}
```

`src/pages/admin/RolesPage.tsx`:
```typescript
export default function RolesPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Roles e Permissões</h1></div>
}
```

`src/pages/admin/LogsAcessoPage.tsx`:
```typescript
export default function LogsAcessoPage() {
  return <div className="p-6"><h1 className="text-2xl font-bold">Logs de Acesso</h1></div>
}
```

- [ ] **Step 3: Verify routing works**

Run: `npm run dev`
- Navigate to `/app/admin/usuarios` as admin → should show placeholder
- Non-admin user → should redirect to dashboard

- [ ] **Step 4: Commit**

```bash
git add src/app/routes.tsx src/pages/admin/
git commit -m "feat: add admin routes with permission guards"
```

---

## Task 8: Sidebar with Permissions and Admin Section

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add permission filtering and admin section**

In `src/components/layout/Sidebar.tsx`:

1. Add imports:
```typescript
import { usePermissions } from '../../hooks/usePermissions'
import { useAuth } from '../../hooks/useAuth'
import { ADMIN_NAVIGATION } from '../../lib/constants'
```

2. Inside the component, add:
```typescript
const { hasAccess } = usePermissions()
const { isAdmin } = useAuth()
```

3. In the `<nav>` section, filter navigation items (replace lines 87-144):
```typescript
{NAVIGATION_SECTIONS.filter((section) => {
  // Extract page key from path: /app/{key}
  const pageKey = section.path.replace('/app/', '')
  return hasAccess(pageKey)
}).map((section) => (
  // ... existing NavLink JSX unchanged
))}

{/* Admin section divider and links */}
{isAdmin && (
  <>
    <div className={`mx-1 my-2 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`} />
    <div className={`px-3 py-1 ${expanded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-200`}>
      <span className={`text-[10px] uppercase tracking-wider font-semibold ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
        Administração
      </span>
    </div>
    {ADMIN_NAVIGATION.map((section) => (
      <NavLink
        key={section.id}
        to={section.path}
        onClick={() => setIsOpen(false)}
        title={section.label}
        className={({ isActive }) => `
          w-full flex items-center rounded-lg px-3 py-2.5
          transition-colors duration-150 group relative
          ${isActive
            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 font-medium'
            : darkMode
              ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
          }
        `}
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-purple-500" />
            )}
            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {section.icon}
            </span>
            <span className={`ml-3 text-sm whitespace-nowrap overflow-hidden transition-all duration-200 ${expanded ? 'opacity-100 w-auto' : 'opacity-0 w-0 lg:opacity-0 lg:w-0'}`}>
              {section.label}
            </span>
            {!expanded && (
              <span className={`absolute left-full ml-3 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150 hidden lg:block ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-white'} shadow-lg z-50`}>
                {section.label}
              </span>
            )}
          </>
        )}
      </NavLink>
    ))}
  </>
)}
```

- [ ] **Step 2: Verify sidebar filtering**

Run: `npm run dev`
- Admin user: should see all 14 pages + Administração section (purple active state)
- Switch to leitor in DB → should see pages based on role_permissions

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/Sidebar.tsx
git commit -m "feat: filter sidebar by permissions and add admin section"
```

---

## Task 9: Edge Function — user-management

**Files:**
- Create: `supabase/functions/user-management/index.ts`

- [ ] **Step 1: Write the Edge Function**

```typescript
// supabase/functions/user-management/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return json({ error: message }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    // Auth: get caller's JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Missing authorization", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client with caller's JWT (for RLS)
    const supabaseUser = createClient(supabaseUrl, serviceRoleKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify caller is admin
    const { data: { user: caller } } = await supabaseUser.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (!caller) return errorResponse("Invalid token", 401);

    const { data: callerProfile } = await supabaseUser
      .from("user_profiles")
      .select("role_id, roles!inner(nome)")
      .eq("id", caller.id)
      .single();

    if (!callerProfile || (callerProfile as any).roles.nome !== "admin") {
      return errorResponse("Admin access required", 403);
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Route by URL path
    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    switch (action) {
      case "invite": {
        if (req.method !== "POST") return errorResponse("Method not allowed", 405);
        const { email, nome, role_id, send_email, password } = await req.json();

        if (!email || !role_id) {
          return errorResponse("email and role_id are required");
        }

        // Check email not already in use
        const { data: existing } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existing) return errorResponse("Email already registered");

        // Create user via Admin API
        const createPayload: any = {
          email,
          email_confirm: !send_email, // If not sending email, auto-confirm
        };

        if (send_email) {
          // Supabase sends invite email
          const { data: inviteData, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email);
          if (inviteError) return errorResponse(inviteError.message);

          // Create profile
          await supabaseAdmin.from("user_profiles").insert({
            id: inviteData.user.id,
            email,
            nome: nome || null,
            role_id,
            ativo: true,
          });

          return json({ user_id: inviteData.user.id, method: "invite_email" });
        } else {
          // Manual password
          if (!password || password.length < 6) {
            return errorResponse("Password must be at least 6 characters");
          }

          const { data: createData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true, // Skip email verification
            });
          if (createError) return errorResponse(createError.message);

          await supabaseAdmin.from("user_profiles").insert({
            id: createData.user.id,
            email,
            nome: nome || null,
            role_id,
            ativo: true,
          });

          return json({ user_id: createData.user.id, method: "manual_password" });
        }
      }

      case "update": {
        if (req.method !== "PATCH") return errorResponse("Method not allowed", 405);
        const { user_id, nome, role_id } = await req.json();

        if (!user_id) return errorResponse("user_id is required");

        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (nome !== undefined) updates.nome = nome;
        if (role_id !== undefined) updates.role_id = role_id;

        const { error } = await supabaseAdmin
          .from("user_profiles")
          .update(updates)
          .eq("id", user_id);

        if (error) return errorResponse(error.message);
        return json({ success: true });
      }

      case "deactivate": {
        if (req.method !== "POST") return errorResponse("Method not allowed", 405);
        const { user_id } = await req.json();
        if (!user_id) return errorResponse("user_id is required");

        // Prevent self-deactivation
        if (user_id === caller.id) {
          return errorResponse("Cannot deactivate your own account");
        }

        await supabaseAdmin
          .from("user_profiles")
          .update({ ativo: false, deleted_at: new Date().toISOString() })
          .eq("id", user_id);

        // Revoke sessions
        await supabaseAdmin.auth.admin.signOut(user_id);

        return json({ success: true });
      }

      case "reactivate": {
        if (req.method !== "POST") return errorResponse("Method not allowed", 405);
        const { user_id } = await req.json();
        if (!user_id) return errorResponse("user_id is required");

        await supabaseAdmin
          .from("user_profiles")
          .update({ ativo: true, deleted_at: null })
          .eq("id", user_id);

        return json({ success: true });
      }

      case "delete": {
        if (req.method !== "DELETE") return errorResponse("Method not allowed", 405);
        const { user_id } = await req.json();
        if (!user_id) return errorResponse("user_id is required");

        if (user_id === caller.id) {
          return errorResponse("Cannot delete your own account");
        }

        // Hard delete from auth.users (cascades to user_profiles)
        const { error } = await supabaseAdmin.auth.admin.deleteUser(user_id);
        if (error) return errorResponse(error.message);

        return json({ success: true });
      }

      case "list": {
        if (req.method !== "GET") return errorResponse("Method not allowed", 405);
        const includeDeleted = url.searchParams.get("include_deleted") === "true";

        let query = supabaseAdmin
          .from("user_profiles")
          .select("*, roles!inner(nome, id)")
          .order("created_at", { ascending: false });

        if (!includeDeleted) {
          query = query.is("deleted_at", null);
        }

        const { data, error } = await query;
        if (error) return errorResponse(error.message);

        return json(data);
      }

      default:
        return errorResponse(`Unknown action: ${action}`, 404);
    }
  } catch (err) {
    console.error("user-management error:", err);
    return errorResponse("Internal server error", 500);
  }
});
```

- [ ] **Step 2: Deploy Edge Function**

Run: `npx supabase functions deploy user-management`

Expected: Function deployed successfully.

- [ ] **Step 3: Test endpoints via curl**

```bash
# Get JWT token first (from browser DevTools or Supabase dashboard)
# Test list endpoint:
curl -H "Authorization: Bearer <jwt>" \
     -H "apikey: <anon-key>" \
     "https://<project>.supabase.co/functions/v1/user-management/list"
```

Expected: JSON array of users with joined role data.

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/user-management/
git commit -m "feat: add user-management Edge Function with all CRUD endpoints"
```

---

## Task 10: API Service Layer

**Files:**
- Create: `src/services/api/userManagement.ts`
- Create: `src/services/api/roles.ts`
- Create: `src/services/api/accessLogs.ts`

- [ ] **Step 1: Create userManagement.ts**

```typescript
// src/services/api/userManagement.ts
import { supabase, supabaseUrl } from '../supabase'
import type { InviteUserPayload, UpdateUserPayload } from '../../types/userManagement'

const FUNCTION_URL = `${supabaseUrl}/functions/v1/user-management`

async function callEdgeFunction(action: string, options: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')

  const res = await fetch(`${FUNCTION_URL}/${action}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      ...options.headers,
    },
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function listUsers(includeDeleted = false) {
  return callEdgeFunction(`list?include_deleted=${includeDeleted}`, { method: 'GET' })
}

export async function inviteUser(payload: InviteUserPayload) {
  return callEdgeFunction('invite', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateUser(payload: UpdateUserPayload) {
  return callEdgeFunction('update', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deactivateUser(userId: string) {
  return callEdgeFunction('deactivate', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

export async function reactivateUser(userId: string) {
  return callEdgeFunction('reactivate', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId }),
  })
}

export async function deleteUser(userId: string) {
  return callEdgeFunction('delete', {
    method: 'DELETE',
    body: JSON.stringify({ user_id: userId }),
  })
}
```

- [ ] **Step 2: Create roles.ts**

```typescript
// src/services/api/roles.ts
import { supabase } from '../supabase'
import type { Role, RoleWithPermissions } from '../../types/userManagement'

export async function listRoles(): Promise<RoleWithPermissions[]> {
  const { data: roles, error } = await supabase
    .from('roles')
    .select('*, role_permissions(page_key)')
    .order('is_system', { ascending: false })
    .order('nome')

  if (error) throw error

  // Get user counts per role
  const { data: counts, error: countError } = await supabase
    .from('user_profiles')
    .select('role_id')
    .is('deleted_at', null)

  if (countError) throw countError

  const countMap = counts.reduce<Record<string, number>>((acc, u) => {
    acc[u.role_id] = (acc[u.role_id] || 0) + 1
    return acc
  }, {})

  return roles.map((r) => ({
    ...r,
    permissions: r.role_permissions.map((p: { page_key: string }) => p.page_key),
    user_count: countMap[r.id] || 0,
    role_permissions: undefined,
  })) as RoleWithPermissions[]
}

export async function createRole(nome: string, descricao: string | null, pageKeys: string[]) {
  const { data: role, error } = await supabase
    .from('roles')
    .insert({ nome, descricao })
    .select()
    .single()

  if (error) throw error

  if (pageKeys.length > 0) {
    const { error: permError } = await supabase
      .from('role_permissions')
      .insert(pageKeys.map((pk) => ({ role_id: role.id, page_key: pk })))

    if (permError) throw permError
  }

  return role
}

export async function updateRole(roleId: string, nome: string, descricao: string | null, pageKeys: string[]) {
  const { error: updateError } = await supabase
    .from('roles')
    .update({ nome, descricao })
    .eq('id', roleId)

  if (updateError) throw updateError

  // Replace permissions: delete all, re-insert
  const { error: deleteError } = await supabase
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId)

  if (deleteError) throw deleteError

  if (pageKeys.length > 0) {
    const { error: insertError } = await supabase
      .from('role_permissions')
      .insert(pageKeys.map((pk) => ({ role_id: roleId, page_key: pk })))

    if (insertError) throw insertError
  }
}

export async function deleteRole(roleId: string) {
  // Check no users assigned
  const { count, error: countError } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role_id', roleId)
    .is('deleted_at', null)

  if (countError) throw countError
  if (count && count > 0) throw new Error('Não é possível deletar role com usuários atribuídos')

  const { error } = await supabase.from('roles').delete().eq('id', roleId)
  if (error) throw error
}
```

- [ ] **Step 3: Create accessLogs.ts**

```typescript
// src/services/api/accessLogs.ts
import { supabase } from '../supabase'
import type { AccessLog, AccessLogFilters, AccessLogStats } from '../../types/userManagement'

export async function logEvent(eventType: string, pageKey?: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('access_logs').insert({
    user_id: user.id,
    event_type: eventType,
    page_key: pageKey ?? null,
    user_agent: navigator.userAgent,
  })
}

export async function fetchLogs(filters: AccessLogFilters) {
  let query = supabase
    .from('access_logs')
    .select('*, user_profiles!inner(email, nome)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(
      (filters.page - 1) * filters.per_page,
      filters.page * filters.per_page - 1,
    )

  if (filters.user_id) query = query.eq('user_id', filters.user_id)
  if (filters.event_type) query = query.eq('event_type', filters.event_type)
  if (filters.from_date) query = query.gte('created_at', filters.from_date)
  if (filters.to_date) query = query.lte('created_at', filters.to_date)

  const { data, error, count } = await query
  if (error) throw error

  return {
    logs: (data ?? []).map((d) => ({
      ...d,
      user_email: (d as any).user_profiles?.email,
      user_nome: (d as any).user_profiles?.nome,
      user_profiles: undefined,
    })) as AccessLog[],
    total: count ?? 0,
  }
}

export async function fetchLogStats(): Promise<AccessLogStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  // Today count
  const { count: todayCount } = await supabase
    .from('access_logs')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', today.toISOString())

  // Active users 7d
  const { data: activeUsers } = await supabase
    .from('access_logs')
    .select('user_id')
    .gte('created_at', sevenDaysAgo.toISOString())
    .eq('event_type', 'login')

  const uniqueUsers = new Set(activeUsers?.map((u) => u.user_id) ?? [])

  // Top page
  const { data: topPages } = await supabase
    .from('access_logs')
    .select('page_key')
    .eq('event_type', 'page_view')
    .gte('created_at', sevenDaysAgo.toISOString())
    .not('page_key', 'is', null)

  const pageCounts: Record<string, number> = {}
  topPages?.forEach((p) => {
    if (p.page_key) pageCounts[p.page_key] = (pageCounts[p.page_key] || 0) + 1
  })
  const topPage = Object.entries(pageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  return {
    today_count: todayCount ?? 0,
    active_users_7d: uniqueUsers.size,
    top_page: topPage,
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/api/userManagement.ts src/services/api/roles.ts src/services/api/accessLogs.ts
git commit -m "feat: add API service layer for users, roles, and access logs"
```

---

## Task 11: React Query Hooks

**Files:**
- Create: `src/services/queries/useUserManagementQueries.ts`
- Create: `src/services/queries/useRolesQueries.ts`
- Create: `src/services/queries/useAccessLogsQueries.ts`

- [ ] **Step 1: Create useUserManagementQueries.ts**

```typescript
// src/services/queries/useUserManagementQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/userManagement'
import type { InviteUserPayload, UpdateUserPayload } from '../../types/userManagement'

export function useUsers(includeDeleted = false) {
  return useQuery({
    queryKey: ['users', { includeDeleted }],
    queryFn: () => api.listUsers(includeDeleted),
    staleTime: 60 * 1000,
  })
}

export function useInviteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteUserPayload) => api.inviteUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => api.updateUser(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.deactivateUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useReactivateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.reactivateUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => api.deleteUser(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
```

- [ ] **Step 2: Create useRolesQueries.ts**

```typescript
// src/services/queries/useRolesQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as api from '../api/roles'

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: api.listRoles,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ nome, descricao, pageKeys }: { nome: string; descricao: string | null; pageKeys: string[] }) =>
      api.createRole(nome, descricao, pageKeys),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, nome, descricao, pageKeys }: { roleId: string; nome: string; descricao: string | null; pageKeys: string[] }) =>
      api.updateRole(roleId, nome, descricao, pageKeys),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      qc.invalidateQueries({ queryKey: ['permissions'] })
    },
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (roleId: string) => api.deleteRole(roleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
    },
  })
}
```

- [ ] **Step 3: Create useAccessLogsQueries.ts**

```typescript
// src/services/queries/useAccessLogsQueries.ts
import { useQuery } from '@tanstack/react-query'
import { fetchLogs, fetchLogStats } from '../api/accessLogs'
import type { AccessLogFilters } from '../../types/userManagement'

export function useAccessLogs(filters: AccessLogFilters) {
  return useQuery({
    queryKey: ['access-logs', filters],
    queryFn: () => fetchLogs(filters),
    staleTime: 30 * 1000,
  })
}

export function useLogStats() {
  return useQuery({
    queryKey: ['access-logs', 'stats'],
    queryFn: fetchLogStats,
    staleTime: 60 * 1000,
  })
}
```

- [ ] **Step 4: Commit**

```bash
git add src/services/queries/useUserManagementQueries.ts src/services/queries/useRolesQueries.ts src/services/queries/useAccessLogsQueries.ts
git commit -m "feat: add React Query hooks for users, roles, and access logs"
```

---

## Task 12: Admin UI — Shared Modals

**Files:**
- Create: `src/components/admin/UserModal.tsx`
- Create: `src/components/admin/RoleModal.tsx`
- Create: `src/components/admin/DeleteConfirmModal.tsx`

- [ ] **Step 1: Create UserModal.tsx**

Create/edit user modal with fields: nome, email (create only), role_id (select), toggle send_email/manual password.

Key behaviors:
- In **create** mode: email editable, toggle for invite method, password field if manual
- In **edit** mode: email read-only, only nome and role_id editable
- Role select populated from `useRoles()` hook
- Validation: email required + format check, password min 6 chars if manual
- Submit calls `useInviteUser()` (create) or `useUpdateUser()` (edit)
- Uses existing dark mode patterns from codebase (Tailwind `dark:` classes)

```typescript
// src/components/admin/UserModal.tsx
import { useState, useEffect } from 'react'
import { useRoles } from '../../services/queries/useRolesQueries'
import { useInviteUser, useUpdateUser } from '../../services/queries/useUserManagementQueries'
import type { UserProfile } from '../../types/database'

interface UserModalProps {
  isOpen: boolean
  onClose: () => void
  user?: UserProfile | null // null = create mode
}

export default function UserModal({ isOpen, onClose, user }: UserModalProps) {
  const isEdit = !!user
  const { data: roles } = useRoles()
  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateUser()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [roleId, setRoleId] = useState('')
  const [sendEmail, setSendEmail] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setNome(user.nome ?? '')
      setEmail(user.email)
      setRoleId(user.role_id)
    } else {
      setNome('')
      setEmail('')
      setRoleId(roles?.[0]?.id ?? '')
      setSendEmail(true)
      setPassword('')
    }
    setError('')
  }, [user, isOpen, roles])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({
          user_id: user!.id,
          nome: nome || undefined,
          role_id: roleId || undefined,
        })
      } else {
        if (!email) { setError('Email é obrigatório'); return }
        if (!sendEmail && password.length < 6) {
          setError('Senha deve ter pelo menos 6 caracteres'); return
        }
        await inviteMutation.mutateAsync({
          email,
          nome: nome || undefined,
          role_id: roleId,
          send_email: sendEmail,
          password: sendEmail ? undefined : password,
        })
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const isPending = inviteMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">
          {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Nome do usuário"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isEdit}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Role</label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {roles?.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>

          {!isEdit && (
            <>
              <div className="flex items-center gap-3">
                <label className="text-sm dark:text-gray-300">Método:</label>
                <button
                  type="button"
                  onClick={() => setSendEmail(true)}
                  className={`px-3 py-1 text-sm rounded-lg ${sendEmail ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  Convite por email
                </button>
                <button
                  type="button"
                  onClick={() => setSendEmail(false)}
                  className={`px-3 py-1 text-sm rounded-lg ${!sendEmail ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 dark:text-gray-300'}`}
                >
                  Senha manual
                </button>
              </div>

              {!sendEmail && (
                <div>
                  <label className="block text-sm font-medium dark:text-gray-300 mb-1">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              )}
            </>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create RoleModal.tsx**

Modal with: name, description, checkboxes grid for 14 pages, page count preview.

```typescript
// src/components/admin/RoleModal.tsx
import { useState, useEffect } from 'react'
import { NAVIGATION_SECTIONS } from '../../lib/constants'
import { useCreateRole, useUpdateRole } from '../../services/queries/useRolesQueries'
import type { RoleWithPermissions } from '../../types/userManagement'

interface RoleModalProps {
  isOpen: boolean
  onClose: () => void
  role?: RoleWithPermissions | null
}

export default function RoleModal({ isOpen, onClose, role }: RoleModalProps) {
  const isEdit = !!role
  const createMutation = useCreateRole()
  const updateMutation = useUpdateRole()

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    if (role) {
      setNome(role.nome)
      setDescricao(role.descricao ?? '')
      setSelectedPages(new Set(role.permissions))
    } else {
      setNome('')
      setDescricao('')
      setSelectedPages(new Set())
    }
    setError('')
  }, [role, isOpen])

  if (!isOpen) return null

  const togglePage = (pageKey: string) => {
    const next = new Set(selectedPages)
    if (next.has(pageKey)) {
      if (pageKey === 'dashboard') return // always on
      next.delete(pageKey)
    } else {
      next.add(pageKey)
    }
    setSelectedPages(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!nome.trim()) { setError('Nome é obrigatório'); return }

    // Always include dashboard
    const pageKeys = [...new Set([...selectedPages, 'dashboard'])]

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ roleId: role!.id, nome, descricao: descricao || null, pageKeys })
      } else {
        await createMutation.mutateAsync({ nome, descricao: descricao || null, pageKeys })
      }
      onClose()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold dark:text-white mb-4">
          {isEdit ? 'Editar Role' : 'Novo Role'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Ex: vendas, marketing"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-1">Descrição</label>
            <input
              type="text"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="Descrição opcional"
            />
          </div>

          <div>
            <label className="block text-sm font-medium dark:text-gray-300 mb-2">
              Páginas permitidas ({selectedPages.size + (selectedPages.has('dashboard') ? 0 : 1)} de {NAVIGATION_SECTIONS.length})
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {NAVIGATION_SECTIONS.map((section) => {
                const pageKey = section.path.replace('/app/', '')
                const checked = pageKey === 'dashboard' || selectedPages.has(pageKey)
                return (
                  <label
                    key={section.id}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm
                      ${checked ? 'bg-purple-500/10 dark:bg-purple-500/20' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}
                      ${pageKey === 'dashboard' ? 'opacity-60 cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={pageKey === 'dashboard'}
                      onChange={() => togglePage(pageKey)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="dark:text-gray-300">{section.icon} {section.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="px-4 py-2 text-sm rounded-lg bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50">
              {isPending ? 'Salvando...' : isEdit ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create DeleteConfirmModal.tsx**

```typescript
// src/components/admin/DeleteConfirmModal.tsx
import { useState } from 'react'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
  userEmail: string
  isPending: boolean
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, userEmail, isPending }: DeleteConfirmModalProps) {
  const [typed, setTyped] = useState('')

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-2">Deletar permanentemente</h2>
        <p className="text-sm dark:text-gray-300 mb-4">
          Esta ação é irreversível. O usuário e todos os seus dados serão removidos. Digite o email para confirmar:
        </p>
        <p className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded mb-3 dark:text-gray-300">{userEmail}</p>
        <input
          type="text"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border dark:border-gray-600 dark:bg-gray-700 dark:text-white mb-4"
          placeholder="Digite o email para confirmar"
        />
        <div className="flex justify-end gap-3">
          <button onClick={() => { setTyped(''); onClose() }} className="px-4 py-2 text-sm rounded-lg dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button
            onClick={async () => { await onConfirm(); setTyped(''); onClose() }}
            disabled={typed !== userEmail || isPending}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isPending ? 'Deletando...' : 'Deletar'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/
git commit -m "feat: add admin modals — UserModal, RoleModal, DeleteConfirmModal"
```

---

## Task 13: UsuariosPage (Full Implementation)

**Files:**
- Modify: `src/pages/admin/UsuariosPage.tsx` (replace placeholder)

- [ ] **Step 1: Implement UsuariosPage**

Replace the placeholder with the full page:
- Table with avatar, name, email, role badge, status, last access, actions
- Filters: search, role, status
- Actions: edit (modal), deactivate/reactivate (inline confirm), delete (modal with email typing)
- Integrated with all React Query hooks

The page should use:
- `useUsers(includeDeleted)` for data
- `useRoles()` for role filter select
- `useDeactivateUser()`, `useReactivateUser()`, `useDeleteUser()` for actions
- `<UserModal>` for create/edit
- `<DeleteConfirmModal>` for hard delete
- Tailwind dark mode classes matching existing pages

Key layout: search + filters bar at top, table below, modals overlay.

- [ ] **Step 2: Verify page works end-to-end**

Run: `npm run dev`, navigate to `/app/admin/usuarios`
- Verify user list loads with role badges
- Test creating a new user (both invite and manual password)
- Test editing a user's name and role
- Test deactivating and reactivating a user
- Test hard delete with email confirmation

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/UsuariosPage.tsx
git commit -m "feat: implement UsuariosPage with full CRUD and filters"
```

---

## Task 14: RolesPage (Full Implementation)

**Files:**
- Modify: `src/pages/admin/RolesPage.tsx` (replace placeholder)

- [ ] **Step 1: Implement RolesPage**

Replace placeholder with full page:
- Grid of role cards (admin card highlighted, non-editable)
- Each card: name, user count, permission checkmarks list
- Actions: edit (modal with page checkboxes), delete (only if 0 users)
- "+ Novo Role" button → RoleModal

Use `useRoles()` for data, `<RoleModal>` for create/edit, `useDeleteRole()` for delete.

- [ ] **Step 2: Verify page works**

Run: `npm run dev`, navigate to `/app/admin/roles`
- Verify admin card shows "Acesso total" and is not editable
- Create a new custom role with selected pages
- Edit an existing role's permissions
- Try deleting a role with users → should show error
- Delete a role with 0 users → should succeed

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/RolesPage.tsx
git commit -m "feat: implement RolesPage with custom role management"
```

---

## Task 15: LogsAcessoPage (Full Implementation)

**Files:**
- Modify: `src/pages/admin/LogsAcessoPage.tsx` (replace placeholder)

- [ ] **Step 1: Implement LogsAcessoPage**

Replace placeholder with full page:
- Mini-dashboard (3 stat cards: today count, active users 7d, top page)
- Filters: user (select), event type (select), period (7d/30d/custom)
- Paginated table: date, user, event badge, page, IP
- Pagination controls (prev/next with page indicator)

Use `useLogStats()` for dashboard, `useAccessLogs(filters)` for table, `useUsers()` for user filter select.

- [ ] **Step 2: Verify page works**

Run: `npm run dev`, navigate to `/app/admin/logs`
- Verify stat cards show data
- Verify table loads with recent events
- Test filtering by user, event type, period
- Test pagination (if enough data)

- [ ] **Step 3: Commit**

```bash
git add src/pages/admin/LogsAcessoPage.tsx
git commit -m "feat: implement LogsAcessoPage with stats dashboard and filters"
```

---

## Task 16: Update Header Admin Link

**Files:**
- Modify: `src/components/layout/Header.tsx`

- [ ] **Step 1: Update admin link path**

In `src/components/layout/Header.tsx`, find the admin link (around line 339-356) that navigates to `/app/usuarios` and change it to `/app/admin/usuarios`:

**Old:** `navigate('/app/usuarios')`
**New:** `navigate('/app/admin/usuarios')`

- [ ] **Step 2: Commit**

```bash
git add src/components/layout/Header.tsx
git commit -m "fix: update admin link in Header to /app/admin/usuarios"
```

---

## Task 17: Final Integration Test

- [ ] **Step 1: Run full app and verify all flows**

Run: `npm run dev`

Verify as admin:
1. Sidebar shows all pages + Administração section
2. Navigate to Usuários → list loads
3. Create user via invite email → user appears in list
4. Create user with manual password → user appears
5. Edit user name and role → changes reflected
6. Deactivate user → status changes, user can't login
7. Reactivate user → status changes back
8. Delete user permanently → removed from list
9. Navigate to Roles → cards load
10. Create custom role with selected pages
11. Edit role permissions
12. Navigate to Logs → stats and table load
13. Filter logs by user and event type
14. Page tracking: navigate between pages, check new entries in logs

Verify as leitor:
15. Sidebar only shows permitted pages
16. Direct URL to non-permitted page → redirects to dashboard
17. Admin section not visible in sidebar
18. `/app/admin/*` → redirects to dashboard

- [ ] **Step 2: Run existing tests to verify no regressions**

Run: `npx vitest run`

Expected: All existing tests pass. Note: the `UserProfile` type change may break existing tests that mock `role` field — update those to use `role_id` and `role_nome`.

- [ ] **Step 3: Build check**

Run: `npm run build`

Expected: No TypeScript errors, clean build.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete user management system — CRUD, roles, permissions, access logs"
```
