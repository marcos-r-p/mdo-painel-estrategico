-- =============================================================================
-- Migration: 20260324_user_management.sql
-- Description: User management — roles, permissions, access logs, profile migration
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create roles table (before is_admin so the function body resolves cleanly)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roles (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text        UNIQUE NOT NULL,
  descricao   text,
  is_system   boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- RLS on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read ON public.roles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_write ON public.roles
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 2. Helper function: is_admin
--    SECURITY DEFINER so it runs as owner and can bypass RLS on user_profiles.
--    STABLE because it does not modify data and returns the same value for the
--    same input within a single statement.
-- -----------------------------------------------------------------------------
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

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;

-- -----------------------------------------------------------------------------
-- 3. Seed system roles
-- -----------------------------------------------------------------------------
INSERT INTO public.roles (nome, descricao, is_system)
VALUES
  ('admin',  'Administrador do sistema com acesso total', true),
  ('leitor', 'Usuário com acesso de leitura às páginas permitidas', true)
ON CONFLICT (nome) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Create role_permissions table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id  uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  page_key text NOT NULL,
  UNIQUE (role_id, page_key)
);

-- RLS on role_permissions
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_read ON public.role_permissions
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY admin_write ON public.role_permissions
  FOR ALL
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 5. Seed leitor permissions (all 14 page keys)
-- -----------------------------------------------------------------------------
INSERT INTO public.role_permissions (role_id, page_key)
SELECT r.id, page_key
FROM public.roles r
CROSS JOIN (
  VALUES
    ('dashboard'),
    ('fluxo-caixa'),
    ('clientes'),
    ('analise-b2c'),
    ('matriz-rfm'),
    ('canais-b2b'),
    ('produtos'),
    ('analise-temporal'),
    ('shopify'),
    ('crm'),
    ('funil'),
    ('analise-ia'),
    ('metas'),
    ('alertas')
) AS pages(page_key)
WHERE r.nome = 'leitor'
ON CONFLICT (role_id, page_key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Create access_logs table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.access_logs (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type  text        NOT NULL,
  page_key    text,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS access_logs_user_id_created_at_idx
  ON public.access_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS access_logs_event_type_created_at_idx
  ON public.access_logs (event_type, created_at);

CREATE INDEX IF NOT EXISTS access_logs_page_key_created_at_idx
  ON public.access_logs (page_key, created_at);

-- RLS on access_logs
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY authenticated_insert ON public.access_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY admin_read ON public.access_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- -----------------------------------------------------------------------------
-- 7. Migrate user_profiles: add role_id FK column
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS role_id uuid REFERENCES public.roles(id);

-- Populate role_id from the existing text role column
UPDATE public.user_profiles up
SET role_id = r.id
FROM public.roles r
WHERE r.nome = up.role;

-- -----------------------------------------------------------------------------
-- 8. Add deleted_at column (soft-delete support)
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- -----------------------------------------------------------------------------
-- 9. Enforce NOT NULL on role_id now that data is migrated, then drop old column
-- -----------------------------------------------------------------------------
-- Set a safe default for any rows that might still be NULL
--   (should not happen after the UPDATE above, but defensive)
UPDATE public.user_profiles
SET role_id = (SELECT id FROM public.roles WHERE nome = 'leitor' LIMIT 1)
WHERE role_id IS NULL;

ALTER TABLE public.user_profiles
  ALTER COLUMN role_id SET NOT NULL;

ALTER TABLE public.user_profiles
  DROP COLUMN IF EXISTS role;
