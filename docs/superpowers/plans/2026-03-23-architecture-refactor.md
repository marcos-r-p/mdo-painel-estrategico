# Architecture Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the MDO Painel Estrategico from JavaScript to TypeScript with React Router, TanStack Query, proper error handling, and tests.

**Architecture:** 3-layer data fetching (services/api -> services/queries -> pages), React Router v7 nested layout, Context for auth/theme only, TanStack Query for all server state. Big Bang migration on a feature branch.

**Tech Stack:** TypeScript (strict), React 19, React Router v7, TanStack Query v5, Supabase JS v2, Recharts, Tailwind CSS v4, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-23-architecture-refactor-design.md`

---

### Task 1: Create Feature Branch and Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `vite.config.js` -> rename to `vite.config.ts`
- Modify: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `.env`
- Create: `.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create feature branch**

```bash
git checkout -b refactor/typescript-architecture
```

- [ ] **Step 2: Install TypeScript and type dependencies**

```bash
npm install -D typescript @types/node @types/papaparse
```

- [ ] **Step 3: Install TanStack Query**

```bash
npm install @tanstack/react-query
```

- [ ] **Step 4: Install Vitest and React Testing Library**

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 5: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 6: Create tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 7: Create src/vite-env.d.ts**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
```

- [ ] **Step 8: Create vitest.config.ts**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

- [ ] **Step 9: Create src/test/setup.ts**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 10: Create .env with current credentials**

Copy the `SUPABASE_URL` and `SUPABASE_KEY` values from `src/lib/supabase.js` into a new `.env` file:

```env
VITE_SUPABASE_URL=<copy from src/lib/supabase.js SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<copy from src/lib/supabase.js SUPABASE_KEY>
```

**Do NOT commit the .env file.** It contains secrets.

- [ ] **Step 11: Create .env.example**

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

- [ ] **Step 12: Update .gitignore to include .env**

Add to `.gitignore`:
```
.env
.env.local
```

- [ ] **Step 13: Rename vite.config.js -> vite.config.ts and update**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
```

- [ ] **Step 14: Update index.html entry point**

Change `src="/src/main.jsx"` to `src="/src/main.tsx"`.

- [ ] **Step 15: Add test script to package.json**

Add to scripts: `"test": "vitest"`, `"test:run": "vitest run"`

- [ ] **Step 16: Verify the dev server starts**

Run: `npm run dev`
Expected: Vite dev server starts (will show errors about missing .tsx files — that's expected at this stage)

- [ ] **Step 17: Commit**

```bash
git add -A && git commit -m "chore: setup TypeScript, TanStack Query, Vitest, env vars"
```

---

### Task 2: Create Type Definitions

**Files:**
- Create: `src/types/database.ts`
- Create: `src/types/api.ts`
- Create: `src/types/domain.ts`

- [ ] **Step 1: Create src/types/database.ts**

These types match the Supabase views and tables used by the current hooks:

```ts
// Matches vw_resumo_mensal (used by usePeriodoGlobal)
export interface ResumoMensal {
  mes: string
  receita_total: number
  custo_total: number
  total_pedidos: number
  total_clientes: number
  ticket_medio: number
  novos_clientes: number
  recorrentes: number
}

// Matches vw_clientes_mes (used by usePeriodoGlobal)
export interface ClienteMes {
  mes: string
  nome: string
  email: string
  total_gasto: number
  qtd_pedidos: number
  uf: string
}

// Matches vw_uf_mensal (used by usePeriodoGlobal)
export interface UFMensal {
  mes: string
  uf: string
  faturamento: number
  pedidos: number
}

// Matches shopify_pedidos table
export interface ShopifyPedido {
  id: number
  numero: string
  data_criacao: string
  valor_total: number
  status: string
  cliente_nome: string
  cliente_email: string
  itens_qtd: number
  desconto: number
  frete: number
  gateway: string
}

// Matches shopify_clientes table
export interface ShopifyCliente {
  id: number
  nome: string
  email: string
  total_pedidos: number
  total_gasto: number
  cidade: string
  uf: string
  criado_em: string
}

// Matches shopify_produtos table
export interface ShopifyProduto {
  id: number
  titulo: string
  sku: string
  preco: number
  estoque: number
  status: string
  categoria: string
  imagem_url: string
}

// Matches rdstation_deals table
export interface RDStationDeal {
  id: string
  nome: string
  valor: number
  etapa_id: string
  contato_nome: string
  criado_em: string
  atualizado_em: string
  status: string
}

// Matches rdstation_contacts table
export interface RDStationContact {
  id: string
  nome: string
  email: string
  telefone: string
  empresa: string
  cargo: string
}

// Matches rdstation_stages table
export interface RDStationStage {
  id: string
  nome: string
  stage_order: number
}

// Matches rdstation_tasks table
export interface RDStationTask {
  id: string
  titulo: string
  tipo: string
  data_limite: string
  concluida: boolean
  deal_id: string
}

// Matches user_profiles table
export interface UserProfile {
  id: string
  email: string
  nome: string
  role: 'admin' | 'user'
  created_at: string
}

// Generic Supabase tables used by useSupabaseData (legacy)
export interface ImportacaoRecord {
  id: number
  nome_arquivo: string
  tipo_detectado: string
  total_linhas: number
  total_colunas: number
  confianca: number
  dados_aplicados: boolean
  created_at: string
}
```

- [ ] **Step 2: Create src/types/api.ts**

```ts
// Response from Supabase Edge Functions (bling-sync, shopify-sync, rdstation-sync)
export interface SyncResponse {
  sucesso?: boolean
  sincronizados?: Record<string, number | string>
  mensagem?: string
  error?: string
  status?: string
}

// Sync step status for UI progress display
export interface SyncStepStatus {
  etapa?: string
  sincronizados?: Record<string, number | string>
  error?: string
  status?: string
}

// RD Station REST API response types (used by CRMPage fallback)
export interface RDStationAPIResponse {
  deals?: Array<{
    id: string
    name: string
    amount_montly: number
    stage: { id: string; name: string }
    contact: { name: string; email: string }
  }>
  deal_stages?: Array<{
    id: string
    name: string
    order: number
  }>
}

// Connection status for integrations
export interface ConnectionStatus {
  bling: boolean
  shopify: boolean
  rdstation: boolean
}

// Periodo data returned by usePeriodoQueries
export interface DadosMes {
  clientes: import('./database').ClienteMes[]
  estados: import('./database').UFMensal[]
}
```

- [ ] **Step 3: Create src/types/domain.ts**

```ts
// KPI display data
export interface KPIData {
  label: string
  value: string | number
  subvalue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'green' | 'red' | 'orange' | 'blue' | 'gray'
  sparkData?: number[]
  sparkColor?: string
}

// CRM funnel stage
export interface FunilEtapa {
  nome: string
  qtd: number
  valor: number
  taxaAvanco?: number
  perdas?: number
  vendas?: number
}

// CRM loss reason
export interface MotivoPerda {
  motivo: string
  qtd: number
  percentual: number
}

// CRM monthly evolution
export interface EvolucaoMensal {
  mes: string
  criadas: number
  vendidas: number
  perdidas: number
  valorVendido: number
  valorPerdido: number
}

// CRM data structure (matches CRM_FALLBACK shape)
export interface CRMData {
  dataExtracao: string
  funil: string
  totalNegociacoes: number
  valorPipeline: number
  taxaConversaoGeral: number
  cicloVendaDias: number
  cicloPercaDias: number
  ticketMedioMesAtual: number
  etapas: FunilEtapa[]
  motivosPerda: MotivoPerda[]
  evolucaoMensal: EvolucaoMensal[]
  responsaveis: Array<{
    nome: string
    criadas: number
    vendidas: number
    perdidas: number
    valorVendido: number
    valorPerdido: number
    taxaConversao: number
    ticketMedio: number
  }>
  origens: Array<{ fonte: string; qtd: number; percent: number }>
  saude: {
    scoreGeral: number
    dimensoes: Array<{
      nome: string
      score: number
      status: 'ok' | 'critico' | 'alerta'
    }>
  }
}

// Navigation section definition (used by Sidebar)
export interface NavigationSection {
  id: string
  label: string
  icon: string
  path: string
}

// Seed data wrapper to mark demo data
export interface SeedData<T> {
  data: T
  isDemoData: true
}

// Alert types
export type AlertTipo = 'critico' | 'alto' | 'medio' | 'positivo'

export interface Alerta {
  tipo: AlertTipo
  titulo: string
  desc: string
  acao: string
}

// Plano de acao
export interface PlanoAcao {
  numero: number
  titulo: string
  desc: string
  economia: string
}
```

- [ ] **Step 4: Verify types compile**

Run: `npx tsc --noEmit --project tsconfig.json 2>&1 | head -20`
Expected: May show errors about missing source files — that's expected. Type files themselves should have no errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/ && git commit -m "feat: add TypeScript type definitions for database, API, and domain"
```

---

### Task 3: Create Supabase Client and Service Layer

**Files:**
- Create: `src/services/supabase.ts`
- Create: `src/services/api/dashboard.ts`
- Create: `src/services/api/shopify.ts`
- Create: `src/services/api/rdstation.ts`
- Create: `src/services/api/sync.ts`
- Create: `src/services/api/auth.ts`

- [ ] **Step 1: Create src/services/supabase.ts**

Replaces `src/lib/supabase.js`. Uses env vars instead of hardcoded credentials:

```ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.example to .env and fill in values.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)
```

- [ ] **Step 2: Create src/services/api/dashboard.ts**

Extracts data fetching from `usePeriodoGlobal` and `useSupabaseData`:

```ts
import { supabase } from '../supabase'
import type { ResumoMensal, ClienteMes, UFMensal } from '../../types/database'
import type { DadosMes } from '../../types/api'

export async function fetchResumoMensal(): Promise<ResumoMensal[]> {
  const { data, error } = await supabase
    .from('vw_resumo_mensal')
    .select('*')
    .order('mes', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function fetchDadosMes(mes: string): Promise<DadosMes> {
  const [clientesRes, ufRes] = await Promise.all([
    supabase.from('vw_clientes_mes').select('*').eq('mes', mes),
    supabase.from('vw_uf_mensal').select('*').eq('mes', mes),
  ])

  if (clientesRes.error) throw clientesRes.error
  if (ufRes.error) throw ufRes.error

  return {
    clientes: (clientesRes.data ?? []) as ClienteMes[],
    estados: (ufRes.data ?? []) as UFMensal[],
  }
}

export async function fetchConnectionStatus() {
  const [blingRes, shopifyRes, rdRes] = await Promise.all([
    supabase.from('bling_tokens').select('id').eq('id', 1).maybeSingle(),
    supabase.from('shopify_tokens').select('id').eq('id', 1).maybeSingle(),
    supabase.from('rdstation_deals').select('id').limit(1),
  ])

  return {
    bling: !!blingRes.data,
    shopify: !!shopifyRes.data,
    rdstation: !rdRes.error && (rdRes.data?.length ?? 0) > 0,
  }
}
```

- [ ] **Step 3: Create src/services/api/shopify.ts**

Extracts from `useShopifyData`:

```ts
import { supabase } from '../supabase'
import type { ShopifyPedido, ShopifyCliente, ShopifyProduto } from '../../types/database'

export async function fetchShopifyPedidos(): Promise<ShopifyPedido[]> {
  const { data, error } = await supabase
    .from('shopify_pedidos')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as ShopifyPedido[]
}

export async function fetchShopifyClientes(): Promise<ShopifyCliente[]> {
  const { data, error } = await supabase
    .from('shopify_clientes')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as ShopifyCliente[]
}

export async function fetchShopifyProdutos(): Promise<ShopifyProduto[]> {
  const { data, error } = await supabase
    .from('shopify_produtos')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as ShopifyProduto[]
}

export interface ShopifyData {
  pedidos: ShopifyPedido[]
  clientes: ShopifyCliente[]
  produtos: ShopifyProduto[]
}

export async function fetchAllShopifyData(): Promise<ShopifyData> {
  const [pedidos, clientes, produtos] = await Promise.all([
    fetchShopifyPedidos(),
    fetchShopifyClientes(),
    fetchShopifyProdutos(),
  ])
  return { pedidos, clientes, produtos }
}
```

- [ ] **Step 4: Create src/services/api/rdstation.ts**

Extracts from `useRDStationData` AND `CRMPage` (dual-path: tables + RPC + REST API fallback):

```ts
import { supabase } from '../supabase'
import type {
  RDStationDeal,
  RDStationContact,
  RDStationStage,
  RDStationTask,
} from '../../types/database'
import type { CRMData } from '../../types/domain'

// ── Table queries (used by general RD Station data) ──

export async function fetchRDStationDeals(): Promise<RDStationDeal[]> {
  const { data, error } = await supabase
    .from('rdstation_deals')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as RDStationDeal[]
}

export async function fetchRDStationContacts(): Promise<RDStationContact[]> {
  const { data, error } = await supabase
    .from('rdstation_contacts')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as RDStationContact[]
}

export async function fetchRDStationStages(): Promise<RDStationStage[]> {
  const { data, error } = await supabase
    .from('rdstation_stages')
    .select('*')
    .order('stage_order')
    .limit(500)

  if (error) throw error
  return (data ?? []) as RDStationStage[]
}

export async function fetchRDStationTasks(): Promise<RDStationTask[]> {
  const { data, error } = await supabase
    .from('rdstation_tasks')
    .select('*')
    .limit(5000)

  if (error) throw error
  return (data ?? []) as RDStationTask[]
}

export interface RDStationData {
  deals: RDStationDeal[]
  contacts: RDStationContact[]
  stages: RDStationStage[]
  tasks: RDStationTask[]
  connected: boolean
}

export async function fetchAllRDStationData(): Promise<RDStationData> {
  const [deals, contacts, stages, tasks] = await Promise.all([
    fetchRDStationDeals(),
    fetchRDStationContacts(),
    fetchRDStationStages(),
    fetchRDStationTasks(),
  ])

  return {
    deals,
    contacts,
    stages,
    tasks,
    connected: deals.length > 0,
  }
}

// ── CRM Dashboard data (RPC + REST API fallback) ──

export async function fetchCRMDashboard(periodo?: string): Promise<CRMData | null> {
  // Primary path: Supabase RPC
  try {
    const { data, error } = await supabase.rpc('rdstation_dashboard_periodo', {
      periodo_inicio: periodo ?? undefined,
    })

    if (!error && data) {
      return data as CRMData
    }
  } catch {
    // Fall through to REST API
  }

  // Fallback: direct RD Station REST API
  try {
    const tokenRes = await supabase
      .from('rdstation_tokens')
      .select('access_token')
      .eq('id', 1)
      .maybeSingle()

    if (!tokenRes.data?.access_token) return null

    const token = tokenRes.data.access_token

    const [dealsRes, stagesRes] = await Promise.all([
      fetch('https://crm.rdstation.com/api/v1/deals?limit=200', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch('https://crm.rdstation.com/api/v1/deal_stages', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])

    if (!dealsRes.ok || !stagesRes.ok) return null

    const deals = await dealsRes.json()
    const stages = await stagesRes.json()

    // Transform REST API response into CRMData shape
    // The actual transformation depends on the API response structure
    // This is a passthrough — the CRMPage component handles the mapping
    return {
      ...deals,
      etapas: stages,
    } as CRMData
  } catch {
    return null
  }
}
```

- [ ] **Step 5: Create src/services/api/sync.ts**

Extracts sync logic from `DashboardPage`:

```ts
import { supabase } from '../supabase'
import type { SyncResponse } from '../../types/api'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

async function getAccessToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) {
    throw new Error('Não autenticado — faça login para sincronizar dados')
  }
  return session.access_token
}

export async function syncPlatformStep(
  platform: 'bling' | 'shopify' | 'rdstation',
  tipo: string
): Promise<SyncResponse> {
  const token = await getAccessToken()

  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/${platform}-sync?tipo=${tipo}&meses=1`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }
  )

  if (!res.ok) {
    throw new Error(`Erro ao sincronizar ${platform}/${tipo}: ${res.statusText}`)
  }

  return res.json()
}

export type SyncPlatform = 'bling' | 'shopify' | 'rdstation'

export const SYNC_STEPS: Record<SyncPlatform, string[]> = {
  bling: ['contatos', 'produtos', 'pedidos', 'financeiro'],
  shopify: ['pedidos', 'clientes', 'produtos'],
  rdstation: ['all'],
}

export function getBlingOAuthURL(): string {
  return 'https://www.bling.com.br/Api/v3/oauth/authorize?response_type=code&client_id=567bba7562d27003649ad247d8bd0baad95d3435&state=mdo'
}

export function getShopifyOAuthURL(): string {
  return `${SUPABASE_URL}/functions/v1/shopify-callback`
}
```

- [ ] **Step 6: Create src/services/api/auth.ts**

Thin wrapper around Supabase Auth:

```ts
import { supabase } from '../supabase'
import type { UserProfile } from '../../types/database'

export async function loginWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function fetchUserProfile(
  userId: string,
  email?: string
): Promise<UserProfile | null> {
  // Try by ID first
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (!error && data) return data as UserProfile

  // Fallback: try by email
  if (email) {
    const result = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single()

    if (!result.error && result.data) return result.data as UserProfile
  }

  return null
}
```

- [ ] **Step 7: Commit**

```bash
git add src/services/ && git commit -m "feat: add typed service layer — supabase client, API functions for dashboard, shopify, rdstation, sync, auth"
```

---

### Task 4: Create TanStack Query Hooks

**Files:**
- Create: `src/services/queries/useDashboardQueries.ts`
- Create: `src/services/queries/useShopifyQueries.ts`
- Create: `src/services/queries/useRDStationQueries.ts`
- Create: `src/services/queries/usePeriodoQueries.ts`
- Create: `src/services/queries/useSyncMutations.ts`

- [ ] **Step 1: Create src/services/queries/useDashboardQueries.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus } from '../api/dashboard'

export function useResumoMensal() {
  return useQuery({
    queryKey: ['resumo-mensal'],
    queryFn: fetchResumoMensal,
    staleTime: 5 * 60 * 1000,
  })
}

export function useDadosMes(mes: string | null) {
  return useQuery({
    queryKey: ['dados-mes', mes],
    queryFn: () => fetchDadosMes(mes!),
    enabled: !!mes,
    staleTime: 5 * 60 * 1000,
  })
}

export function useConnectionStatus() {
  return useQuery({
    queryKey: ['connection-status'],
    queryFn: fetchConnectionStatus,
    staleTime: 30 * 1000,
  })
}
```

- [ ] **Step 2: Create src/services/queries/useShopifyQueries.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import {
  fetchShopifyPedidos,
  fetchShopifyClientes,
  fetchShopifyProdutos,
  fetchAllShopifyData,
} from '../api/shopify'

export function useShopifyPedidos() {
  return useQuery({
    queryKey: ['shopify', 'pedidos'],
    queryFn: fetchShopifyPedidos,
    staleTime: 5 * 60 * 1000,
  })
}

export function useShopifyClientes() {
  return useQuery({
    queryKey: ['shopify', 'clientes'],
    queryFn: fetchShopifyClientes,
    staleTime: 5 * 60 * 1000,
  })
}

export function useShopifyProdutos() {
  return useQuery({
    queryKey: ['shopify', 'produtos'],
    queryFn: fetchShopifyProdutos,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAllShopifyData() {
  return useQuery({
    queryKey: ['shopify', 'all'],
    queryFn: fetchAllShopifyData,
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 3: Create src/services/queries/usePeriodoQueries.ts**

Dedicated hook for periodo selection (matches spec's `usePeriodoQueries.ts`):

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchResumoMensal, fetchDadosMes } from '../api/dashboard'
import { useState, useEffect } from 'react'

export function usePeriodo() {
  const resumo = useResumoMensal()
  const meses = resumo.data?.map((r) => r.mes) ?? []
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  // Auto-select first month when data loads
  useEffect(() => {
    if (meses.length > 0 && !mesSelecionado) {
      setMesSelecionado(meses[0])
    }
  }, [meses, mesSelecionado])

  const dadosMes = useDadosMes(mesSelecionado)

  return {
    mesesDisponiveis: meses,
    mesSelecionado,
    setMesSelecionado,
    dadosMes: dadosMes.data,
    resumoMensal: resumo.data ?? [],
    isLoading: resumo.isLoading || dadosMes.isLoading,
  }
}
```

Note: This re-uses `useResumoMensal` and `useDadosMes` from `useDashboardQueries.ts`, adding the periodo selection logic that was in `usePeriodoGlobal.js`.

- [ ] **Step 4: Create src/services/queries/useRDStationQueries.ts**

```ts
import { useQuery } from '@tanstack/react-query'
import { fetchAllRDStationData, fetchCRMDashboard } from '../api/rdstation'

export function useAllRDStationData() {
  return useQuery({
    queryKey: ['rdstation', 'all'],
    queryFn: fetchAllRDStationData,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCRMDashboard(periodo?: string) {
  return useQuery({
    queryKey: ['crm-dashboard', periodo],
    queryFn: () => fetchCRMDashboard(periodo),
    staleTime: 5 * 60 * 1000,
  })
}
```

- [ ] **Step 4: Create src/services/queries/useSyncMutations.ts**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { syncPlatformStep, type SyncPlatform, SYNC_STEPS } from '../api/sync'
import type { SyncResponse } from '../../types/api'
import { useState } from 'react'

interface SyncProgress {
  currentStep: string | null
  results: Record<string, SyncResponse>
  isRunning: boolean
  error: string | null
}

export function usePlatformSync(platform: SyncPlatform) {
  const queryClient = useQueryClient()
  const [progress, setProgress] = useState<SyncProgress>({
    currentStep: null,
    results: {},
    isRunning: false,
    error: null,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      setProgress({ currentStep: null, results: {}, isRunning: true, error: null })
      const steps = SYNC_STEPS[platform]
      const results: Record<string, SyncResponse> = {}

      for (const step of steps) {
        setProgress((prev) => ({ ...prev, currentStep: step }))
        try {
          results[step] = await syncPlatformStep(platform, step)
        } catch (err) {
          results[step] = { error: err instanceof Error ? err.message : 'Erro desconhecido' }
        }
      }

      return results
    },
    onSuccess: () => {
      setProgress((prev) => ({ ...prev, isRunning: false, currentStep: null }))
      // Invalidate relevant queries after sync
      if (platform === 'shopify') {
        queryClient.invalidateQueries({ queryKey: ['shopify'] })
      } else if (platform === 'rdstation') {
        queryClient.invalidateQueries({ queryKey: ['rdstation'] })
        queryClient.invalidateQueries({ queryKey: ['crm-dashboard'] })
      }
      queryClient.invalidateQueries({ queryKey: ['connection-status'] })
    },
    onError: (err: Error) => {
      setProgress((prev) => ({
        ...prev,
        isRunning: false,
        currentStep: null,
        error: err.message,
      }))
    },
  })

  return { ...mutation, progress }
}
```

- [ ] **Step 5: Commit**

```bash
git add src/services/queries/ && git commit -m "feat: add TanStack Query hooks for dashboard, shopify, rdstation, and sync mutations"
```

---

### Task 5: Migrate Contexts to TypeScript

**Files:**
- Create: `src/contexts/AuthContext.tsx` (replaces .jsx)
- Create: `src/contexts/ThemeContext.tsx` (replaces .jsx)
- Create: `src/hooks/useAuth.ts`
- Create: `src/hooks/useTheme.ts`

- [ ] **Step 1: Create src/contexts/AuthContext.tsx**

Migrate existing AuthContext to TypeScript. Keep same logic, add types. Use `fetchUserProfile` from services:

```ts
import { createContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { supabase } from '../services/supabase'
import { fetchUserProfile } from '../services/api/auth'
import type { UserProfile } from '../types/database'

interface AuthContextType {
  user: import('@supabase/supabase-js').User | null
  userProfile: UserProfile | null
  authLoading: boolean
  isAdmin: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<import('@supabase/supabase-js').User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const loadProfile = useCallback(async (userId: string, email?: string) => {
    const profile = await fetchUserProfile(userId, email)
    setUserProfile(profile)
  }, [])

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setUserProfile(null)
  }

  useEffect(() => {
    let mounted = true

    const timeout = setTimeout(() => {
      if (mounted) setAuthLoading(false)
    }, 5000)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        loadProfile(currentUser.id, currentUser.email).finally(() => {
          if (mounted) { clearTimeout(timeout); setAuthLoading(false) }
        })
      } else {
        clearTimeout(timeout)
        setAuthLoading(false)
      }
    }).catch(() => {
      if (mounted) { clearTimeout(timeout); setAuthLoading(false) }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          await loadProfile(currentUser.id, currentUser.email)
        } else {
          setUserProfile(null)
        }

        setAuthLoading(false)
      }
    )

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const isAdmin = userProfile?.role === 'admin'
  const isAuthenticated = !!user

  return (
    <AuthContext.Provider value={{ user, userProfile, authLoading, isAdmin, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
```

- [ ] **Step 2: Create src/hooks/useAuth.ts**

```ts
import { useContext } from 'react'
import { AuthContext } from '../contexts/AuthContext'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

- [ ] **Step 3: Create src/contexts/ThemeContext.tsx**

Migrate to TypeScript + Tailwind `dark:` class strategy + localStorage persistence:

```ts
import { createContext, useState, useEffect, type ReactNode } from 'react'

interface ThemeContextType {
  darkMode: boolean
  toggleDarkMode: () => void
}

export const ThemeContext = createContext<ThemeContextType | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('mdo-dark-mode')
    return saved === 'true'
  })

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('mdo-dark-mode', String(darkMode))
  }, [darkMode])

  const toggleDarkMode = () => setDarkMode((prev) => !prev)

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

- [ ] **Step 4: Create src/hooks/useTheme.ts**

```ts
import { useContext } from 'react'
import { ThemeContext } from '../contexts/ThemeContext'

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
```

- [ ] **Step 5: Commit**

```bash
git add src/contexts/ src/hooks/ && git commit -m "feat: migrate AuthContext and ThemeContext to TypeScript with localStorage persistence"
```

---

### Task 6: Migrate Utility Libraries

**Files:**
- Create: `src/lib/formatters.ts` (replaces .js)
- Create: `src/lib/constants.ts`
- Create: `src/data/seed.ts` (replaces constants.js)

- [ ] **Step 1: Create src/lib/formatters.ts**

Direct migration of `src/lib/formatters.js` with types added:

```ts
export function formatCurrency(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0,0%'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(1)}%`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null || isNaN(value)) return '0'
  return new Intl.NumberFormat('pt-BR').format(value)
}

const MESES_LABEL: Record<string, string> = {
  '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
  '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
}

export function formatMesLabel(m: string | null | undefined): string {
  if (!m) return ''
  const [y, mo] = m.split('-')
  return `${MESES_LABEL[mo] || mo}/${y.slice(2)}`
}

export function parseMoney(v: string | number | null | undefined): number {
  if (v == null) return 0
  const s = String(v).replace(/R\$|\s|\xa0/g, '').replace(/\./g, '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}

export function parsePercent(v: string | number | null | undefined): number {
  if (v == null) return 0
  const s = String(v).replace('%', '').replace(',', '.').trim()
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
```

- [ ] **Step 2: Write the failing test for formatters**

Create `src/lib/formatters.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatPercent, formatNumber, formatMesLabel, parseMoney, parsePercent } from './formatters'

describe('formatCurrency', () => {
  it('formats positive values in BRL', () => {
    const result = formatCurrency(1234.56)
    expect(result).toContain('1.234,56')
    expect(result).toContain('R$')
  })

  it('returns R$ 0,00 for null/undefined/NaN', () => {
    expect(formatCurrency(null)).toContain('0,00')
    expect(formatCurrency(undefined)).toContain('0,00')
    expect(formatCurrency(NaN)).toContain('0,00')
  })
})

describe('formatPercent', () => {
  it('formats positive values with + prefix', () => {
    expect(formatPercent(12.5)).toBe('+12.5%')
  })

  it('formats negative values without prefix', () => {
    expect(formatPercent(-38.1)).toBe('-38.1%')
  })

  it('returns 0.0% for null', () => {
    expect(formatPercent(null)).toBe('0,0%')
  })
})

describe('formatNumber', () => {
  it('formats with Brazilian thousands separator', () => {
    expect(formatNumber(28275)).toBe('28.275')
  })

  it('returns 0 for null', () => {
    expect(formatNumber(null)).toBe('0')
  })
})

describe('formatMesLabel', () => {
  it('converts YYYY-MM to Mmm/YY', () => {
    expect(formatMesLabel('2026-03')).toBe('Mar/26')
  })

  it('returns empty string for null', () => {
    expect(formatMesLabel(null)).toBe('')
  })
})

describe('parseMoney', () => {
  it('parses BRL formatted string', () => {
    expect(parseMoney('R$ 1.234,56')).toBe(1234.56)
  })

  it('returns 0 for null', () => {
    expect(parseMoney(null)).toBe(0)
  })
})

describe('parsePercent', () => {
  it('parses percent string', () => {
    expect(parsePercent('38,1%')).toBe(38.1)
  })

  it('returns 0 for null', () => {
    expect(parsePercent(null)).toBe(0)
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npx vitest run src/lib/formatters.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Create src/data/seed.ts**

Migrate `src/data/constants.js` to TypeScript with `isDemoData` flag. Keep the exact same data, just add types:

```ts
// Demo/seed data — extracted from real business data March 2026
// Used as fallback when APIs are unavailable
// isDemoData flag indicates this is not live data

export const SEED_DATA = {
  isDemoData: true as const,
  // ... (copy entire DADOS object from constants.js, keeping all data intact)
  // Just add the isDemoData field at the top level
} as const

// Re-export with original name for backward compatibility during migration
export const DADOS = SEED_DATA
```

Note to implementer: Copy the full content of `src/data/constants.js` into this file. The DADOS export should contain the exact same data. Add `isDemoData: true` as the first property.

- [ ] **Step 5: Create src/lib/constants.ts**

Navigation sections (extracted from App.jsx SECTIONS array), now with route paths:

```ts
import type { NavigationSection } from '../types/domain'

export const NAVIGATION_SECTIONS: NavigationSection[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/app/dashboard' },
  { id: 'fluxo', label: 'Fluxo de Caixa', icon: '💰', path: '/app/fluxo-caixa' },
  { id: 'clientes', label: 'Clientes', icon: '👥', path: '/app/clientes' },
  { id: 'b2c', label: 'Análise B2C', icon: '🛒', path: '/app/analise-b2c' },
  { id: 'rfm', label: 'Matriz RFM', icon: '🎯', path: '/app/matriz-rfm' },
  { id: 'b2b', label: 'Canais B2B', icon: '🏢', path: '/app/canais-b2b' },
  { id: 'produtos', label: 'Produtos', icon: '📦', path: '/app/produtos' },
  { id: 'temporal', label: 'Análise Temporal', icon: '📈', path: '/app/analise-temporal' },
  { id: 'shopify', label: 'Shopify', icon: '🟢', path: '/app/shopify' },
  { id: 'crm', label: 'CRM', icon: '📞', path: '/app/crm' },
  { id: 'funil', label: 'Funil', icon: '🔻', path: '/app/funil' },
  { id: 'analise', label: 'Análise IA', icon: '🤖', path: '/app/analise-ia' },
  { id: 'metas', label: 'Metas 90 Dias', icon: '🎯', path: '/app/metas' },
  { id: 'alertas', label: 'Alertas', icon: '🚨', path: '/app/alertas' },
]
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/ src/data/ && git commit -m "feat: migrate formatters to TypeScript with tests, add seed data and navigation constants"
```

---

### Task 7: Setup React Router and Layout

**Files:**
- Create: `src/app/routes.tsx`
- Create: `src/app/providers.tsx`
- Create: `src/app/App.tsx`
- Create: `src/components/ui/Spinner.tsx`
- Create: `src/components/ui/ErrorFallback.tsx`
- Create: `src/components/layout/AppLayout.tsx` (replaces .jsx)
- Create: `src/main.tsx` (replaces .jsx)

- [ ] **Step 1: Create src/components/ui/Spinner.tsx**

```tsx
export default function Spinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
```

- [ ] **Step 2: Create src/components/ui/ErrorFallback.tsx**

```tsx
import { useRouteError, isRouteErrorResponse } from 'react-router-dom'

interface ErrorFallbackProps {
  error?: Error
  resetErrorBoundary?: () => void
}

export default function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const routeError = useRouteError?.()

  const message = error?.message
    ?? (isRouteErrorResponse(routeError) ? routeError.statusText : 'Erro inesperado')

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-2">
        Algo deu errado
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center max-w-md">
        {message}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors"
        >
          Tentar novamente
        </button>
      )}
    </div>
  )
}

// Route error element version (used by React Router errorElement)
export function RouteErrorFallback() {
  return <ErrorFallback />
}
```

- [ ] **Step 3: Create src/components/layout/AppLayout.tsx**

Migrate from prop-driven to React Router Outlet:

```tsx
import { useState, Suspense } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import Spinner from '../ui/Spinner'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="lg:pl-16 flex flex-col min-h-screen transition-all duration-300">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <Suspense fallback={<Spinner />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create src/app/routes.tsx**

```tsx
import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { RouteErrorFallback } from '../components/ui/ErrorFallback'

const LoginPage = lazy(() => import('../pages/LoginPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const FluxoCaixaPage = lazy(() => import('../pages/FluxoCaixaPage'))
const ClientesPage = lazy(() => import('../pages/ClientesPage'))
const AnaliseB2CPage = lazy(() => import('../pages/AnaliseB2CPage'))
const MatrizRFMPage = lazy(() => import('../pages/MatrizRFMPage'))
const CanaisB2BPage = lazy(() => import('../pages/CanaisB2BPage'))
const ProdutosPage = lazy(() => import('../pages/ProdutosPage'))
const AnaliseTemporalPage = lazy(() => import('../pages/AnaliseTemporalPage'))
const ShopifyPage = lazy(() => import('../pages/ShopifyPage'))
const CRMPage = lazy(() => import('../pages/CRMPage'))
const FunilPage = lazy(() => import('../pages/FunilPage'))
const AnaliseIAPage = lazy(() => import('../pages/AnaliseIAPage'))
const MetasPage = lazy(() => import('../pages/MetasPage'))
const AlertasPage = lazy(() => import('../pages/AlertasPage'))

// ProtectedRoute inline — checks auth, redirects to login
import { useAuth } from '../hooks/useAuth'
import Spinner from '../components/ui/Spinner'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, authLoading } = useAuth()

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-lg">MdO</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: <RouteErrorFallback />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'fluxo-caixa', element: <FluxoCaixaPage /> },
      { path: 'clientes', element: <ClientesPage /> },
      { path: 'analise-b2c', element: <AnaliseB2CPage /> },
      { path: 'matriz-rfm', element: <MatrizRFMPage /> },
      { path: 'canais-b2b', element: <CanaisB2BPage /> },
      { path: 'produtos', element: <ProdutosPage /> },
      { path: 'analise-temporal', element: <AnaliseTemporalPage /> },
      { path: 'shopify', element: <ShopifyPage /> },
      { path: 'crm', element: <CRMPage /> },
      { path: 'funil', element: <FunilPage /> },
      { path: 'analise-ia', element: <AnaliseIAPage /> },
      { path: 'metas', element: <MetasPage /> },
      { path: 'alertas', element: <AlertasPage /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/app" replace />,
  },
])
```

- [ ] **Step 5: Create src/app/providers.tsx**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../contexts/AuthContext'
import { ThemeProvider } from '../contexts/ThemeContext'
import type { ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
})

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          {children}
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
```

- [ ] **Step 6: Create src/app/App.tsx**

```tsx
import { RouterProvider } from 'react-router-dom'
import Providers from './providers'
import { router } from './routes'

export default function App() {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
```

- [ ] **Step 7: Create src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 8: Commit**

```bash
git add src/app/ src/components/ui/Spinner.tsx src/components/ui/ErrorFallback.tsx src/components/layout/AppLayout.tsx src/main.tsx && git commit -m "feat: setup React Router with nested layout, providers, error boundaries"
```

---

### Task 8: Migrate UI Components to TypeScript

**Files:**
- Create: `src/components/ui/KPICard.tsx` (replaces .jsx)
- Create: `src/components/ui/Badge.tsx` (replaces .jsx)
- Create: `src/components/ui/SectionCard.tsx` (replaces .jsx)
- Create: `src/components/ui/ProgressBar.tsx` (replaces .jsx)
- Create: `src/components/ui/DateRangePicker.tsx` (replaces .jsx)
- Create: `src/components/ui/DetailModal.tsx` (replaces .jsx)
- Create: `src/components/charts/PieChart.tsx` (replaces ui/PieChart.jsx)
- Create: `src/components/charts/SparklineChart.tsx` (new — Recharts)

- [ ] **Step 1: Migrate KPICard.tsx**

Migrate `src/components/ui/KPICard.jsx` to TypeScript. Extract the inline `Sparkline` SVG component into using the new `SparklineChart` component. Add typed props:

```tsx
import SparklineChart from '../charts/SparklineChart'

interface KPICardProps {
  label: string
  value: string | number
  subvalue?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'green' | 'red' | 'orange' | 'blue' | 'gray'
  sparkData?: number[]
  sparkColor?: string
  onClick?: () => void
}

// ... (migrate the existing component with same Tailwind classes, just adding types)
// Replace the inline Sparkline component with <SparklineChart data={sparkData} color={sparkColor} />
```

Note to implementer: Keep the exact same visual output. The only changes are: TypeScript types on props, and replacing the inline `Sparkline` SVG function with the new `SparklineChart` component.

- [ ] **Step 2: Create SparklineChart with Recharts**

Create `src/components/charts/SparklineChart.tsx`:

```tsx
import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface SparklineChartProps {
  data: number[]
  color?: string
  width?: number
  height?: number
}

export default function SparklineChart({
  data,
  color = '#3b82f6',
  width = 80,
  height = 28,
}: SparklineChartProps) {
  if (!data || data.length < 2) return null

  const chartData = data.map((value, index) => ({ index, value }))

  return (
    <div style={{ width, height }} className="shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            fill={color}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 3: Create PieChart with Recharts**

Create `src/components/charts/PieChart.tsx`:

```tsx
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const DEFAULT_COLORS = [
  '#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#6366f1', '#14b8a6',
]

interface PieChartProps {
  data: Array<Record<string, unknown>>
  size?: number
  valueKey?: string
  labelKey?: string
  colors?: string[]
  className?: string
}

export default function PieChart({
  data = [],
  size = 160,
  valueKey = 'value',
  labelKey = 'label',
  colors = DEFAULT_COLORS,
  className = '',
}: PieChartProps) {
  const total = data.reduce((sum, item) => sum + (Number(item[valueKey]) || 0), 0)

  if (!data.length || total === 0) {
    return (
      <div
        className={`flex items-center justify-center text-sm text-gray-400 dark:text-gray-500 ${className}`}
        style={{ width: size, height: size }}
      >
        Sem dados
      </div>
    )
  }

  return (
    <div className={`flex items-start gap-4 ${className}`}>
      <div style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={size / 2 - 5}
              isAnimationActive={false}
            >
              {data.map((_entry, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </RechartsPieChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-col gap-1.5 py-1">
        {data.map((item, i) => {
          const val = Number(item[valueKey]) || 0
          const pct = ((val / total) * 100).toFixed(1)
          return (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-gray-700 dark:text-gray-300">
                {String(item[labelKey])}
              </span>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {pct}%
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create DemoBanner component**

Create `src/components/ui/DemoBanner.tsx`:

```tsx
import { useState } from 'react'

export default function DemoBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="rounded-lg bg-yellow-50 border border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 p-3 text-sm text-yellow-800 dark:text-yellow-200 flex items-center justify-between">
      <p>Dados de demonstração — conecte suas integrações para ver dados reais</p>
      <button onClick={() => setDismissed(true)} className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 text-sm font-medium ml-4">
        Fechar
      </button>
    </div>
  )
}
```

- [ ] **Step 5: Migrate remaining UI components**

For each of Badge, SectionCard, ProgressBar, DateRangePicker, DetailModal:
- Read the existing .jsx file
- Create the .tsx version with typed props
- Keep exact same visual output and Tailwind classes

These are straightforward type additions — no logic changes.

- [ ] **Step 5: Commit**

```bash
git add src/components/ && git commit -m "feat: migrate UI components to TypeScript, replace custom charts with Recharts"
```

---

### Task 9: Migrate Layout Components (Sidebar + Header)

**Files:**
- Create: `src/components/layout/Sidebar.tsx` (replaces .jsx)
- Create: `src/components/layout/Header.tsx` (replaces .jsx)

- [ ] **Step 1: Migrate Sidebar to use React Router NavLink**

Key changes from current Sidebar:
- Replace `sections` + `activeSection` + `setActiveSection` props with React Router `NavLink`
- Import `NAVIGATION_SECTIONS` from `src/lib/constants.ts`
- `NavLink` automatically adds active class

```tsx
import { NavLink } from 'react-router-dom'
import { NAVIGATION_SECTIONS } from '../../lib/constants'

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  // ... same visual structure
  // Replace onClick={setActiveSection(section.id)} with <NavLink to={section.path}>
  // Use NavLink className callback: ({isActive}) => isActive ? 'bg-green-...' : 'bg-gray-...'
}
```

Note to implementer: Read the full current `Sidebar.jsx`, keep exact same visual styling, replace the navigation mechanism with `NavLink`.

- [ ] **Step 2: Migrate Header to TypeScript**

Key changes:
- Remove props that came from App: `fonteAtiva`, `setFonteAtiva`, `dbStatus`, `recarregar`, `activeSection`
- Use `useAuth()` hook directly for user info
- Use `useSearchParams()` for `fonteAtiva` (URL query param)
- Use `useResumoMensal()` query for periodo data
- Keep `onToggleSidebar` prop

```tsx
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useTheme } from '../../hooks/useTheme'
import { useResumoMensal } from '../../services/queries/useDashboardQueries'

interface HeaderProps {
  onToggleSidebar: () => void
}

export default function Header({ onToggleSidebar }: HeaderProps) {
  const { user, userProfile, isAdmin, logout } = useAuth()
  const { darkMode, toggleDarkMode } = useTheme()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: resumoMensal } = useResumoMensal()

  const fonteAtiva = searchParams.get('fonte') ?? 'bling'
  const setFonteAtiva = (fonte: string) => {
    setSearchParams((prev) => { prev.set('fonte', fonte); return prev })
  }

  // ... rest of header with same visual output
}
```

Note to implementer: Read the full current `Header.jsx` (376 lines), keep exact same visual output and Tailwind classes, replace prop-driven state with hooks and URL params.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/ && git commit -m "feat: migrate Sidebar and Header to TypeScript with React Router NavLink"
```

---

### Task 10: Proof of Concept — Migrate AlertasPage

**Files:**
- Create: `src/pages/AlertasPage.tsx` (replaces .jsx)

- [ ] **Step 1: Migrate AlertasPage to TypeScript**

AlertasPage is one of the simplest pages — it reads from DADOS (seed data) with no API calls. This validates the full stack works end-to-end.

```tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DADOS } from '../data/seed'
import { formatCurrency } from '../lib/formatters'
import SectionCard from '../components/ui/SectionCard'
import DateRangePicker from '../components/ui/DateRangePicker'
import Badge from '../components/ui/Badge'
import type { Alerta, AlertTipo, PlanoAcao } from '../types/domain'

const tipoConfig: Record<AlertTipo, { emoji: string; label: string; order: number }> = {
  critico: { emoji: '🔴', label: 'Critico', order: 0 },
  alto:    { emoji: '🟠', label: 'Alto', order: 1 },
  medio:   { emoji: '🟡', label: 'Medio', order: 2 },
  positivo:{ emoji: '🟢', label: 'Positivo', order: 3 },
}

const planoAcao: PlanoAcao[] = [
  { numero: 1, titulo: 'Renegociar Webi', desc: 'Migrar para modelo success fee ou reduzir escopo', economia: 'Economia R$ 5-6K/mes' },
  { numero: 2, titulo: 'Refinanciar dividas', desc: 'Consolidar emprestimo + cartao em parcelas menores', economia: 'R$ 8K → R$ 3K/mes' },
  { numero: 3, titulo: 'Campanha reativacao base 28K', desc: 'E-mail marketing + WhatsApp para clientes inativos', economia: 'R$ 163K receita potencial' },
  { numero: 4, titulo: 'Prospeccao 10 farmacias B2B', desc: 'Kit amostras + visita comercial para farmacias de manipulacao', economia: 'R$ 25K/mes receita recorrente' },
]

export default function AlertasPage() {
  const [range, setRange] = useState({ dataIni: '', dataFim: '' })
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte')

  const alertas = DADOS.alertas as Alerta[]

  const grupos = alertas.reduce<Record<string, Alerta[]>>((acc, alerta) => {
    if (!acc[alerta.tipo]) acc[alerta.tipo] = []
    acc[alerta.tipo].push(alerta)
    return acc
  }, {})

  const gruposOrdenados = Object.entries(grupos).sort(
    ([a], [b]) => (tipoConfig[a as AlertTipo]?.order ?? 99) - (tipoConfig[b as AlertTipo]?.order ?? 99)
  )

  return (
    <div className="space-y-6">
      {/* ... exact same JSX as current AlertasPage.jsx */}
    </div>
  )
}
```

Note to implementer: Copy the JSX from current `AlertasPage.jsx` exactly. Only changes: remove `fonteAtiva` prop (use `useSearchParams` instead), add TypeScript types.

- [ ] **Step 2: Verify the page works in the browser**

Run: `npm run dev`
Navigate to: `http://localhost:3000/app/alertas`
Expected: AlertasPage renders correctly with seed data, sidebar navigation works, URL shows `/app/alertas`

- [ ] **Step 3: Commit**

```bash
git add src/pages/AlertasPage.tsx && git commit -m "feat: migrate AlertasPage to TypeScript — proof of concept for full stack"
```

---

### Task 11: Migrate LoginPage

**Files:**
- Create: `src/pages/LoginPage.tsx` (replaces .jsx)

- [ ] **Step 1: Migrate LoginPage to TypeScript**

Key changes:
- Add types for state and form events
- Use `useAuth()` hook (already typed)
- Use `useNavigate()` to redirect after login
- Remove any props — LoginPage is now a standalone route

```tsx
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/app')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  // ... same visual JSX as current LoginPage
}
```

Note to implementer: Read the full current `LoginPage.jsx`, keep same Tailwind styling, add TypeScript types and React Router navigation.

- [ ] **Step 2: Commit**

```bash
git add src/pages/LoginPage.tsx && git commit -m "feat: migrate LoginPage to TypeScript with React Router navigation"
```

---

### Task 12: Migrate DashboardPage

**Files:**
- Create: `src/pages/DashboardPage.tsx` (replaces .jsx)

- [ ] **Step 1: Migrate DashboardPage to TypeScript**

This is the most complex migration. Key changes:
- Remove all props (`onDataApplied` is dead code, `isAdmin` comes from `useAuth()`, `fonteAtiva` from URL)
- Use `useAuth()` for `isAdmin`
- Use `useSearchParams()` for `fonteAtiva`
- Use `useConnectionStatus()` query instead of inline `useEffect` for connection checks
- Use `usePlatformSync()` mutation for sync operations
- Import sync helpers from `services/api/sync.ts`
- Keep same visual layout and Tailwind classes
- `PieChart` import path changes from `../components/ui/PieChart` to `../components/charts/PieChart`

```tsx
import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useConnectionStatus } from '../services/queries/useDashboardQueries'
import { usePlatformSync } from '../services/queries/useSyncMutations'
import { getBlingOAuthURL, getShopifyOAuthURL } from '../services/api/sync'
import { DADOS } from '../data/seed'
import { formatCurrency, formatPercent, formatNumber } from '../lib/formatters'
import KPICard from '../components/ui/KPICard'
import Badge from '../components/ui/Badge'
import SectionCard from '../components/ui/SectionCard'
import PieChart from '../components/charts/PieChart'

export default function DashboardPage() {
  const { isAdmin } = useAuth()
  const [searchParams] = useSearchParams()
  const fonteAtiva = searchParams.get('fonte') ?? 'bling'

  const { data: connected } = useConnectionStatus()
  const blingSync = usePlatformSync('bling')
  const shopifySync = usePlatformSync('shopify')
  const rdstationSync = usePlatformSync('rdstation')

  // ... rest of component using same DADOS + same visual JSX
  // Replace handleBlingConnect with: () => window.open(getBlingOAuthURL(), '_blank')
  // Replace handleShopifyConnect with: () => window.open(getShopifyOAuthURL(), '_blank')
  // Replace handleBlingSync with: () => blingSync.mutate()
  // Replace sync status display with: blingSync.progress.currentStep, blingSync.progress.isRunning, etc.
}
```

Note to implementer: Read the full current `DashboardPage.jsx` (390 lines). Keep same visual output. Remove props, use hooks. The sync progress display maps: `syncLoading[platform]` -> `platformSync.progress.isRunning`, `syncStatus[platform]?.etapa` -> `platformSync.progress.currentStep`.

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.tsx && git commit -m "feat: migrate DashboardPage to TypeScript — remove prop drilling, use query hooks for sync"
```

---

### Task 13: Migrate CRMPage

**Files:**
- Create: `src/pages/CRMPage.tsx` (replaces .jsx)

- [ ] **Step 1: Migrate CRMPage to TypeScript**

Key changes:
- Remove props — uses `useCRMDashboard()` query hook
- Move `CRM_FALLBACK` data to `src/data/seed.ts` (add to existing SEED_DATA)
- When query returns null/error, fall back to seed data with demo banner
- Keep all sub-components (`SecaoCRMKPIs`, `SecaoCRMFunil`, `SecaoCRMPerdas`, etc.) — just add types
- Type all the CRM data structures using `CRMData` from `types/domain.ts`

```tsx
import { useCRMDashboard } from '../services/queries/useRDStationQueries'
import { CRM_SEED } from '../data/seed'
import type { CRMData } from '../types/domain'
import Spinner from '../components/ui/Spinner'

export default function CRMPage() {
  const { data: crmData, isLoading, error } = useCRMDashboard()

  const crm: CRMData = crmData ?? CRM_SEED
  const isDemoData = !crmData

  if (isLoading) return <Spinner />

  return (
    <div className="space-y-6">
      {isDemoData && <DemoBanner />}
      <SecaoCRMKPIs crm={crm} />
      <SecaoCRMFunil crm={crm} />
      {/* ... rest of sections */}
    </div>
  )
}
```

Note to implementer: Read the full current `CRMPage.jsx` (646 lines). Move `CRM_FALLBACK` to `seed.ts` as `CRM_SEED`. Keep all section components, add TypeScript types using `CRMData` interface.

- [ ] **Step 2: Update src/data/seed.ts to include CRM_SEED**

Add the `CRM_FALLBACK` data as `CRM_SEED` export in `seed.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/CRMPage.tsx src/data/seed.ts && git commit -m "feat: migrate CRMPage to TypeScript with TanStack Query and demo data fallback"
```

---

### Task 14: Migrate Remaining Pages

**Files:**
- Create: `src/pages/FluxoCaixaPage.tsx`
- Create: `src/pages/ClientesPage.tsx`
- Create: `src/pages/AnaliseB2CPage.tsx`
- Create: `src/pages/MatrizRFMPage.tsx`
- Create: `src/pages/CanaisB2BPage.tsx`
- Create: `src/pages/ProdutosPage.tsx`
- Create: `src/pages/AnaliseTemporalPage.tsx`
- Create: `src/pages/ShopifyPage.tsx`
- Create: `src/pages/FunilPage.tsx`
- Create: `src/pages/AnaliseIAPage.tsx`
- Create: `src/pages/MetasPage.tsx`

- [ ] **Step 1: Migrate each page one at a time**

For each page, apply the same pattern:
1. Read the current .jsx file
2. Remove props — use hooks: `useAuth()`, `useSearchParams()`, query hooks as needed
3. Add TypeScript types to state, props, and data
4. Replace `darkMode ? 'class-a' : 'class-b'` patterns with Tailwind `dark:` variants
5. Change chart imports from `components/ui/PieChart` to `components/charts/PieChart`
6. Keep same visual output

Pages that use live data from hooks:
- `ShopifyPage` — use `useAllShopifyData()` query
- `FunilPage` — use `useAllRDStationData()` query (if it uses deals/stages)

Pages that use only seed data (DADOS):
- `FluxoCaixaPage`, `ClientesPage`, `AnaliseB2CPage`, `MatrizRFMPage`, `CanaisB2BPage`, `ProdutosPage`, `AnaliseTemporalPage`, `AnaliseIAPage`, `MetasPage`

- [ ] **Step 2: Verify each page renders after migration**

Run: `npm run dev`
Navigate to each page URL and verify it renders correctly.

- [ ] **Step 3: Commit after each 2-3 pages**

```bash
git add src/pages/ && git commit -m "feat: migrate [PageNames] to TypeScript"
```

Suggested batches:
1. FluxoCaixaPage + ClientesPage + AnaliseB2CPage
2. MatrizRFMPage + CanaisB2BPage + ProdutosPage
3. AnaliseTemporalPage + ShopifyPage
4. FunilPage + AnaliseIAPage + MetasPage

---

### Task 15: Write Priority Tests

**Files:**
- Create: `src/services/api/dashboard.test.ts`
- Create: `src/services/api/sync.test.ts`
- Create: `src/contexts/AuthContext.test.tsx`
- Create: `src/lib/formatters.test.ts` (already created in Task 6)

- [ ] **Step 1: Write service layer tests for dashboard API**

Create `src/services/api/dashboard.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchResumoMensal, fetchDadosMes, fetchConnectionStatus } from './dashboard'

// Mock the supabase module
vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [{ mes: '2026-03', receita_total: 43890 }],
          error: null,
        })),
        eq: vi.fn(() => ({
          data: [{ nome: 'Cliente A', total_gasto: 1000 }],
          error: null,
        })),
        limit: vi.fn(() => ({
          data: [{ id: 1 }],
          error: null,
        })),
        maybeSingle: vi.fn(),
      })),
    })),
  },
}))

describe('fetchResumoMensal', () => {
  it('returns array of monthly summaries', async () => {
    const result = await fetchResumoMensal()
    expect(result).toBeInstanceOf(Array)
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty('mes')
  })
})

describe('fetchDadosMes', () => {
  it('returns clientes and estados for a given month', async () => {
    const result = await fetchDadosMes('2026-03')
    expect(result).toHaveProperty('clientes')
    expect(result).toHaveProperty('estados')
  })
})
```

Note to implementer: Adjust mocks to match actual Supabase client chaining behavior. The key is testing that errors propagate and data is returned typed.

- [ ] **Step 2: Write auth context test**

Create `src/contexts/AuthContext.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AuthProvider } from './AuthContext'
import { useAuth } from '../hooks/useAuth'
import type { ReactNode } from 'react'

vi.mock('../services/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('../services/api/auth', () => ({
  fetchUserProfile: vi.fn(() => Promise.resolve(null)),
}))

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  it('starts with no user and loading true', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('throws when used outside provider', () => {
    expect(() => {
      renderHook(() => useAuth())
    }).toThrow('useAuth must be used within AuthProvider')
  })
})
```

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: add priority tests — services/api, AuthContext, formatters"
```

---

### Task 16: Remove Dead Code and Old JS Files

**Files:**
- Delete: `src/App.jsx`
- Delete: `src/main.jsx`
- Delete: `src/lib/supabase.js`
- Delete: `src/lib/formatters.js`
- Delete: `src/data/constants.js`
- Delete: `src/contexts/AuthContext.jsx`
- Delete: `src/contexts/ThemeContext.jsx`
- Delete: `src/hooks/usePeriodoGlobal.js`
- Delete: `src/hooks/useSupabaseData.js`
- Delete: `src/hooks/useShopifyData.js`
- Delete: `src/hooks/useRDStationData.js`
- Delete: `src/components/layout/AppLayout.jsx`
- Delete: `src/components/layout/Header.jsx`
- Delete: `src/components/layout/Sidebar.jsx`
- Delete: `src/components/ui/KPICard.jsx`
- Delete: `src/components/ui/PieChart.jsx`
- Delete: `src/components/ui/Badge.jsx`
- Delete: `src/components/ui/SectionCard.jsx`
- Delete: `src/components/ui/ProgressBar.jsx`
- Delete: `src/components/ui/DateRangePicker.jsx`
- Delete: `src/components/ui/DetailModal.jsx`
- Delete: All `src/pages/*.jsx` files
- Modify: `vite.config.js` -> delete (replaced by `vite.config.ts`)

- [ ] **Step 1: Delete all old .jsx/.js files that have been replaced by .tsx/.ts**

```bash
# Remove old entry points
rm src/App.jsx src/main.jsx

# Remove old lib
rm src/lib/supabase.js src/lib/formatters.js

# Remove old data
rm src/data/constants.js

# Remove old contexts
rm src/contexts/AuthContext.jsx src/contexts/ThemeContext.jsx

# Remove old hooks
rm src/hooks/usePeriodoGlobal.js src/hooks/useSupabaseData.js src/hooks/useShopifyData.js src/hooks/useRDStationData.js

# Remove old layout components
rm src/components/layout/AppLayout.jsx src/components/layout/Header.jsx src/components/layout/Sidebar.jsx

# Remove old UI components
rm src/components/ui/KPICard.jsx src/components/ui/PieChart.jsx src/components/ui/Badge.jsx src/components/ui/SectionCard.jsx src/components/ui/ProgressBar.jsx src/components/ui/DateRangePicker.jsx src/components/ui/DetailModal.jsx

# Remove old pages
rm src/pages/*.jsx

# Remove old vite config
rm vite.config.js
```

- [ ] **Step 2: Set `allowJs: false` in tsconfig.json**

Now that all .jsx/.js files are removed, flip `"allowJs": true` to `"allowJs": false` in `tsconfig.json` to enforce TypeScript-only.

- [ ] **Step 3: Delete `index-vite.html` if it exists (dead file in repo root)**

```bash
rm -f index-vite.html
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 5: Verify dev server runs**

Run: `npm run dev`
Expected: App loads, login works, navigation works, all pages render

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: remove all old JS files, set allowJs false — migration to TypeScript complete"
```

---

### Task 17: Final Cleanup and Lint

**Files:**
- Modify: `eslint.config.js`
- Modify: `package.json`

- [ ] **Step 1: Update ESLint for TypeScript**

Install TypeScript ESLint:

```bash
npm install -D @typescript-eslint/eslint-plugin @typescript-eslint/parser
```

Update `eslint.config.js` to support TypeScript files.

- [ ] **Step 2: Run lint and fix issues**

Run: `npx eslint src/ --ext .ts,.tsx --fix`
Fix any remaining lint errors.

- [ ] **Step 3: Run full build**

Run: `npm run build`
Expected: Clean build, no warnings, no errors

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: update ESLint for TypeScript, fix lint issues, verify clean build"
```

---

### Task 18: Write Remaining Tests

**Files:**
- Create: `src/components/ui/KPICard.test.tsx`
- Create: `src/components/ui/ErrorFallback.test.tsx`
- Create: `src/pages/AlertasPage.test.tsx`

- [ ] **Step 1: Write KPICard rendering test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import KPICard from './KPICard'

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard label="Receita" value="R$ 43.890" />)
    expect(screen.getByText('Receita')).toBeInTheDocument()
    expect(screen.getByText('R$ 43.890')).toBeInTheDocument()
  })

  it('renders subvalue when provided', () => {
    render(<KPICard label="Receita" value="R$ 43.890" subvalue="-38% vs Fev" />)
    expect(screen.getByText('-38% vs Fev')).toBeInTheDocument()
  })

  it('applies color classes', () => {
    const { container } = render(<KPICard label="Test" value="100" color="green" />)
    expect(container.firstChild).toHaveClass('bg-green-50')
  })
})
```

- [ ] **Step 2: Write ErrorFallback test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorFallback from './ErrorFallback'

describe('ErrorFallback', () => {
  it('shows error message', () => {
    render(<ErrorFallback error={new Error('Test error')} />)
    expect(screen.getByText('Algo deu errado')).toBeInTheDocument()
    expect(screen.getByText('Test error')).toBeInTheDocument()
  })

  it('shows retry button when callback provided', () => {
    render(<ErrorFallback error={new Error('fail')} resetErrorBoundary={() => {}} />)
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Write AlertasPage integration test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AlertasPage from './AlertasPage'

describe('AlertasPage', () => {
  it('renders alert groups from seed data', () => {
    render(
      <MemoryRouter>
        <AlertasPage />
      </MemoryRouter>
    )
    expect(screen.getByText(/Alertas e Plano de Acao/)).toBeInTheDocument()
    expect(screen.getByText(/Deficit Operacional/)).toBeInTheDocument()
    expect(screen.getByText(/Renegociar Webi/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "test: add component and page integration tests"
```

---

### Task 19: Final Verification

- [ ] **Step 1: Run full build**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Run preview server**

Run: `npm run preview`
Expected: Production build serves correctly at localhost:4173

- [ ] **Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 4: Verify all pages work**

Manually navigate to each route in the browser:
- `/login` — login form renders
- `/app/dashboard` — KPIs, integrations, charts render
- `/app/crm` — CRM funnel with seed data (or live if connected)
- `/app/alertas` — Alerts with seed data
- All other 11 pages render without errors
- Sidebar navigation works (NavLink active states)
- Dark mode toggle works and persists on refresh
- URL-based routing works (direct navigation, refresh, back button)

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 6: Final commit**

```bash
git add -A && git commit -m "chore: final verification — build, tests, lint all pass"
```

---

## Post-Migration Reminders

After merging the feature branch:

1. **Rotate the Supabase anon key** — the current key is in git history
2. **Consider adding @tanstack/react-query-devtools** for development debugging
3. **Consider Cypress or Playwright** for E2E tests in a future iteration
4. **Legacy files** (`mdo_painel.html`, `mdo_painel_completo.jsx`, `mdo_dados_consultoria.js`) remain in the repo root as reference
