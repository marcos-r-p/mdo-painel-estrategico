# Gerenciamento de Usuários — Design Spec

## Resumo

Sistema de gerenciamento de usuários para o MdO Painel Estratégico, permitindo que admins criem/convidem usuários, gerenciem roles customizados com permissões granulares por página, e acompanhem logs de acesso com mini-dashboard analítico.

## Escopo

- CRUD de usuários (criar, editar, desativar, reativar, deletar)
- Convite por email ou com senha manual
- Roles customizados com permissões por página
- Log de acesso (login/logout + navegação por página)
- Mini-dashboard de páginas mais acessadas com filtro por usuário
- Seção "Administração" no sidebar (apenas admin)

## Modelo de Dados

### Nova tabela: `roles`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador |
| `nome` | text (unique, not null) | Nome do role |
| `descricao` | text | Descrição livre |
| `is_system` | boolean (default false) | Role do sistema (não deletável) |
| `created_at` | timestamptz | Data de criação |

**Seed:** `admin` (is_system: true) e `leitor` (is_system: true).

### Nova tabela: `role_permissions`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador |
| `role_id` | UUID (FK → roles.id, ON DELETE CASCADE) | Role associado |
| `page_key` | text (not null) | Identificador da página |
| `created_at` | timestamptz | Data de criação |

**Constraint:** UNIQUE(role_id, page_key).

**page_keys válidos:** `dashboard`, `fluxo-caixa`, `clientes`, `analise-b2c`, `matriz-rfm`, `canais-b2b`, `produtos`, `analise-temporal`, `shopify`, `crm`, `funil`, `analise-ia`, `metas`, `alertas`.

O role `admin` sempre tem acesso a todas as páginas + seção Administração por hardcode — não precisa de registros em `role_permissions`.

### Nova tabela: `access_logs`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | UUID (PK) | Identificador |
| `user_id` | UUID (FK → auth.users) | Usuário |
| `event_type` | text (not null) | `login`, `logout`, `page_view` |
| `page_key` | text | Página acessada (null para login/logout) |
| `ip_address` | text | IP do cliente |
| `user_agent` | text | User agent do navegador |
| `created_at` | timestamptz (default now()) | Timestamp do evento |

**Índices:** `(user_id, created_at)`, `(event_type, created_at)`, `(page_key, created_at)`.

**Retenção:** sem política de expiração por enquanto (volume baixo).

### Alterações em `user_profiles`

| Mudança | Detalhe |
|---------|---------|
| Adicionar `role_id` | UUID, FK → roles.id, not null |
| Adicionar `deleted_at` | timestamptz, nullable (soft delete) |
| Remover `role` | Coluna text atual — substituída por `role_id` |

**Migração:** criar roles seed, mapear `role = 'admin'` → role_id do admin, `role = 'leitor'` → role_id do leitor, depois dropar coluna `role`.

### RLS Policies

| Tabela | Policy | Regra |
|--------|--------|-------|
| `roles` | `authenticated_read` | SELECT para qualquer autenticado |
| `roles` | `admin_write` | INSERT/UPDATE/DELETE apenas se user é admin |
| `role_permissions` | `authenticated_read` | SELECT para qualquer autenticado |
| `role_permissions` | `admin_write` | INSERT/UPDATE/DELETE apenas se user é admin |
| `access_logs` | `authenticated_insert` | INSERT para qualquer autenticado |
| `access_logs` | `admin_read` | SELECT apenas se user é admin |
| `user_profiles` | (manter existentes) | Ajustar para considerar `deleted_at` |

**Helper function para RLS:** `is_admin(user_id)` — verifica se o `role_id` do usuário aponta para o role com `nome = 'admin'`.

## Edge Function: `user-management`

Uma Edge Function com roteamento por path param.

### Endpoints

| Rota | Método | Body | Ação |
|------|--------|------|------|
| `/invite` | POST | `{ email, nome?, role_id, send_email: bool, password? }` | Cria usuário via `auth.admin.createUser()`. Se `send_email: true`, envia convite. Se `false`, usa `password` fornecida. Cria `user_profiles` com `role_id`. |
| `/update` | PATCH | `{ user_id, nome?, role_id?, ativo? }` | Atualiza `user_profiles`. Se `ativo: false`, seta `deleted_at = now()`. |
| `/deactivate` | POST | `{ user_id }` | Soft delete: `deleted_at = now()`, `ativo = false`. Revoga sessões via `auth.admin.signOut(user_id)`. |
| `/delete` | DELETE | `{ user_id }` | Hard delete: remove de `auth.users` (cascade para `user_profiles`). |
| `/list` | GET | query: `?include_deleted=bool` | Lista `user_profiles` com join em `roles`. Por padrão exclui deletados. |

### Autenticação

- Todas as rotas requerem header `Authorization: Bearer <jwt>`
- Edge Function valida que o JWT pertence a um admin antes de executar
- Usa `supabase.auth.admin.*` (service_role key) para operações

## Frontend

### Novas Rotas

```
/app/admin/usuarios     → UsuariosPage
/app/admin/roles        → RolesPage
/app/admin/logs         → LogsAcessoPage
```

Todas protegidas por `isAdmin` — redirect para `/app/dashboard` se não-admin.

### Sidebar

Nova seção "Administração" no final do sidebar, visível apenas para admin:
- Usuários (`/app/admin/usuarios`)
- Roles e Permissões (`/app/admin/roles`)
- Logs de Acesso (`/app/admin/logs`)

### Página: Usuários (`/app/admin/usuarios`)

**Elementos:**
- Filtros: busca por nome/email, filtro por role, filtro por status (ativo/desativado/todos)
- Tabela: avatar (iniciais), nome, email, role (badge colorido), status, último acesso, ações
- Ações por usuário:
  - Editar (nome, role) — modal
  - Desativar / Reativar — confirmação inline
  - Deletar definitivamente — modal de confirmação com digitação do email
- Botão "+ Novo Usuário" → modal de criação

**Modal de criação/edição:**
- Campos: nome, email (só criação), role (select), toggle "Enviar convite por email" / "Definir senha manual"
- Se senha manual: campo de senha com requisitos mínimos
- Validação de email duplicado (chamada ao backend antes de submeter)

### Página: Roles e Permissões (`/app/admin/roles`)

**Elementos:**
- Grid de cards, um por role
- Card do `admin`: exibe "Acesso total — não editável", cor de destaque
- Cards de roles customizados: nome, contagem de usuários, lista de páginas com ✓/✗
- Ações: editar (abre modal com checkboxes das 14 páginas), deletar (só se 0 usuários atribuídos)
- Botão "+ Novo Role" → modal com nome, descrição e checkboxes de páginas

**Modal de edição de role:**
- Nome e descrição editáveis
- Grid de checkboxes com as 14 páginas agrupadas por seção (Análises, Integrações, etc.)
- Preview: quantas páginas selecionadas

### Página: Logs de Acesso (`/app/admin/logs`)

**Mini-dashboard (topo):**
- Card: Acessos hoje (count)
- Card: Usuários ativos últimos 7 dias (count distinct)
- Card: Página mais acessada (page_key com mais page_views)

**Filtros:**
- Usuário (select)
- Tipo de evento (login/logout/page_view/todos)
- Período (últimos 7d, 30d, custom range)

**Tabela:**
- Colunas: data/hora, usuário, evento (badge colorido), página, IP
- Paginação server-side (50 por página)
- Ordenação por data (mais recente primeiro)

### Controle de Acesso no Frontend

**Hook `usePermissions()`:**
- Faz fetch de `role_permissions` para o `role_id` do usuário logado
- Retorna `{ allowedPages: Set<string>, isLoading, isAdmin }`
- React Query com `staleTime: 5 * 60 * 1000` (5 min)
- Query key: `['permissions', userId]`
- Invalidação: quando admin altera `role_permissions`, invalidar `['permissions']` (todos)

**Componente `<ProtectedRoute pageKey="...">` (atualizado):**
- Verifica `usePermissions()` — se `pageKey` não está em `allowedPages` e não é admin, redireciona para `/app/dashboard` com toast "Acesso não permitido"

**Sidebar dinâmico:**
- Lê `allowedPages` do cache
- Renderiza apenas itens que o role permite
- Seção "Administração" renderiza apenas se `isAdmin`

**Hook `usePageTracking()`:**
- No `AppLayout`, escuta mudanças de rota via React Router
- A cada mudança, insere `page_view` em `access_logs` (fire-and-forget)
- Login/logout registrados no `AuthContext` (mesma tabela, event_type diferente)

### Services e Queries

**`src/services/api/userManagement.ts`:**
- `inviteUser(data)` — POST `/user-management/invite`
- `updateUser(data)` — PATCH `/user-management/update`
- `deactivateUser(userId)` — POST `/user-management/deactivate`
- `deleteUser(userId)` — DELETE `/user-management/delete`
- `listUsers(includeDeleted?)` — GET `/user-management/list`

**`src/services/api/roles.ts`:**
- `listRoles()` — SELECT de `roles`
- `createRole(data)` — INSERT em `roles` + `role_permissions`
- `updateRole(data)` — UPDATE `roles` + replace `role_permissions`
- `deleteRole(roleId)` — DELETE de `roles` (cascade deleta permissions)

**`src/services/api/accessLogs.ts`:**
- `logEvent(data)` — INSERT em `access_logs`
- `fetchLogs(filters)` — SELECT com filtros e paginação
- `fetchLogStats()` — Queries de agregação para o mini-dashboard

**React Query hooks em `src/services/queries/`:**
- `useUsers()`, `useRoles()`, `usePermissions()`, `useAccessLogs()`, `useLogStats()`
- Mutations com invalidação adequada de cache

## Migração

Ordem de execução:

1. Criar tabela `roles` com seed (admin, leitor)
2. Criar tabela `role_permissions` com seed (leitor com páginas padrão)
3. Criar tabela `access_logs`
4. Adicionar `role_id` em `user_profiles` (nullable inicialmente)
5. Migrar dados: mapear `role` text → `role_id`
6. Tornar `role_id` not null
7. Adicionar `deleted_at` em `user_profiles`
8. Dropar coluna `role` de `user_profiles`
9. Criar/atualizar RLS policies
10. Criar função `is_admin()`

## Decisões Explícitas

- Role `admin` tem acesso hardcoded a tudo — sem registros em `role_permissions`
- Seção "Administração" é exclusiva do admin — não configurável via `role_permissions`
- `page_key` usa o path da rota como identificador (ex: `dashboard`, `crm`)
- Soft delete usa `deleted_at` timestamp (não boolean) para saber quando foi desativado
- Logs de page_view são fire-and-forget — falha silenciosa não impacta navegação
- Hard delete remove de `auth.users` (Supabase cascade cuida do resto)
- Paginação de logs é server-side (volume pode crescer)
