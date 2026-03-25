import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Delay helper for rate limiting */
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getBlingToken(supabase: any) {
  const { data: tokenRow } = await supabase
    .from("bling_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .single();

  if (!tokenRow?.access_token) throw new Error("Bling não conectado");

  // Check if token is expired
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    // Refresh the token
    const clientId = Deno.env.get("BLING_CLIENT_ID");
    const clientSecret = Deno.env.get("BLING_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("BLING_CLIENT_ID/SECRET não configurados");

    const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: `grant_type=refresh_token&refresh_token=${tokenRow.refresh_token}`,
    });

    if (!res.ok) throw new Error(`Bling refresh token falhou: ${res.status}`);
    const tokens = await res.json();

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (tokens.expires_in ?? 21600));

    await supabase.from("bling_tokens").update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", 1);

    return tokens.access_token;
  }

  return tokenRow.access_token;
}

/** Bling API v3 rate limit: ~3 req/s. We retry on 429 with exponential backoff. */
async function blingFetch(path: string, token: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://www.bling.com.br/Api/v3${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.status === 429) {
      if (attempt === retries) {
        throw new Error(`Bling API ${path}: 429 - Rate limit excedido após ${retries} tentativas`);
      }
      // Exponential backoff: 1s, 2s, 4s
      const backoff = Math.pow(2, attempt) * 1000;
      console.log(`Bling 429 on ${path}, retry ${attempt + 1} after ${backoff}ms`);
      await delay(backoff);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Bling API ${path}: ${res.status} - ${text.slice(0, 200)}`);
    }
    return res.json();
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const tipo = url.searchParams.get("tipo") ?? "contatos";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = await getBlingToken(supabase);
    const sincronizados: Record<string, number> = {};

    if (tipo === "contatos") {
      let page = 1;
      let total = 0;
      let hasMore = true;
      while (hasMore) {
        const data = await blingFetch(`/contatos?pagina=${page}&limite=100`, token);
        const contatos = data.data ?? [];
        if (contatos.length === 0) { hasMore = false; break; }

        const rows = contatos.map((c: any) => ({
          nome: c.nome,
          tipo: c.tipo === "J" ? "B2B" : "B2C",
          uf: c.endereco?.uf,
          cidade: c.endereco?.cidade,
          email: c.email,
          celular: c.celular,
          fonte: "bling",
        }));

        await supabase.from("clientes").insert(rows);
        total += rows.length;
        page++;
        if (contatos.length < 100) hasMore = false;
        // Rate limit: wait 500ms between pages
        if (hasMore) await delay(500);
      }
      sincronizados.contatos = total;
    }

    if (tipo === "produtos") {
      let page = 1;
      let total = 0;
      let hasMore = true;
      while (hasMore) {
        const data = await blingFetch(`/produtos?pagina=${page}&limite=100`, token);
        const produtos = data.data ?? [];
        if (produtos.length === 0) { hasMore = false; break; }

        const rows = produtos.map((p: any) => ({
          sku: p.codigo,
          nome: p.nome,
          categoria: p.categoria?.descricao,
          preco_venda: p.preco ?? 0,
          custo: p.precoCusto ?? 0,
          estoque: p.estoque?.saldoVirtualTotal ?? 0,
          fonte: "bling",
        }));

        await supabase.from("produtos").upsert(rows, { onConflict: "sku" });
        total += rows.length;
        page++;
        if (produtos.length < 100) hasMore = false;
        if (hasMore) await delay(500);
      }
      sincronizados.produtos = total;
    }

    if (tipo === "pedidos") {
      let page = 1;
      let total = 0;
      let hasMore = true;
      while (hasMore) {
        const data = await blingFetch(`/pedidos/vendas?pagina=${page}&limite=100`, token);
        const pedidos = data.data ?? [];
        if (pedidos.length === 0) { hasMore = false; break; }

        const rows = pedidos.map((p: any) => ({
          id: p.id,
          numero: p.numero?.toString(),
          data: p.data,
          cliente_nome: p.contato?.nome,
          valor_total: p.totalProdutos ?? 0,
          desconto: p.desconto ?? 0,
          frete: p.transporte?.frete ?? 0,
          situacao: p.situacao?.valor,
          loja: p.loja?.descricao ?? "Bling",
          fonte: "bling",
        }));

        await supabase.from("pedidos").upsert(rows, { onConflict: "id" });
        total += rows.length;
        page++;
        if (pedidos.length < 100) hasMore = false;
        if (hasMore) await delay(500);
      }
      sincronizados.pedidos = total;
    }

    if (tipo === "financeiro") {
      const steps: Array<{ step: string; status: string; registros: number; duracao_ms: number; erro?: string }> = [];

      // --- Helper: run a financial sync step with retry (1 retry on failure) ---
      async function runFinancialStep(
        stepName: string,
        fn: () => Promise<number>,
      ) {
        const t0 = Date.now();
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const count = await fn();
            steps.push({ step: stepName, status: "sucesso", registros: count, duracao_ms: Date.now() - t0 });
            sincronizados[stepName] = count;
            return;
          } catch (err: unknown) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            if (attempt === 0) {
              console.log(`[financeiro] ${stepName} falhou (tentativa 1), retrying: ${errorMsg}`);
              continue;
            }
            console.error(`[financeiro] ${stepName} falhou após 2 tentativas: ${errorMsg}`);
            steps.push({ step: stepName, status: "erro", registros: 0, duracao_ms: Date.now() - t0, erro: errorMsg });
            sincronizados[stepName] = 0;
          }
        }
      }

      // --- Helper: get last sync date for incremental sync ---
      async function getLastSyncDate(_stepName: string): Promise<string | null> {
        const { data: lastLog } = await supabase
          .from("bling_sync_log")
          .select("created_at")
          .eq("tipo", "financeiro")
          .eq("status", "sucesso")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        return lastLog?.created_at ?? null;
      }

      // --- Helper: paginated sync with upsert ---
      async function paginatedSync(
        endpoint: string,
        table: string,
        mapRow: (item: any) => Record<string, unknown>,
        extraParams?: string,
      ): Promise<number> {
        let page = 1;
        let total = 0;
        let hasMore = true;

        while (hasMore) {
          const separator = endpoint.includes("?") ? "&" : "?";
          const url = `${endpoint}${separator}pagina=${page}&limite=100${extraParams ? `&${extraParams}` : ""}`;
          const data = await blingFetch(url, token);
          const items = data.data ?? [];

          if (items.length === 0) {
            hasMore = false;
            break;
          }

          const rows = items.map((item: any) => mapRow(item));

          await supabase.from(table).upsert(rows, { onConflict: "bling_id" });
          total += rows.length;
          page++;

          if (items.length < 100) hasMore = false;
          // Rate limit: 350ms between calls (~3 req/s)
          if (hasMore) await delay(350);
        }

        return total;
      }

      // 1. Sync Categorias (non-paginated endpoint)
      await runFinancialStep("categorias", async () => {
        const data = await blingFetch("/categorias/receitas-despesas", token);
        const items = data.data ?? [];
        if (items.length === 0) return 0;

        const rows = items.map((c: any) => ({
          bling_id: c.id,
          descricao: c.descricao,
          tipo: c.tipo,
          situacao: c.situacao,
          synced_at: new Date().toISOString(),
        }));

        await supabase.from("bling_categorias").upsert(rows, { onConflict: "bling_id" });
        return rows.length;
      });

      // 2. Sync Contas a Receber (paginated, incremental)
      await runFinancialStep("contas_receber", async () => {
        const lastSync = await getLastSyncDate("contas_receber");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/contas/receber",
          "bling_contas_receber",
          (item: any) => ({
            bling_id: item.id,
            situacao: item.situacao,
            vencimento: item.vencimento,
            valor: item.valor,
            contato_id: item.contato?.id,
            contato_nome: item.contato?.nome,
            numero_documento: item.numeroDocumento,
            competencia: item.competencia,
            historico: item.historico,
            categoria_id: item.categoria?.id,
            portador_id: item.portador?.id,
            synced_at: new Date().toISOString(),
          }),
          extraParams,
        );
      });

      // 3. Sync Contas a Pagar (paginated, incremental)
      await runFinancialStep("contas_pagar", async () => {
        const lastSync = await getLastSyncDate("contas_pagar");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/contas/pagar",
          "bling_contas_pagar",
          (item: any) => ({
            bling_id: item.id,
            situacao: item.situacao,
            vencimento: item.vencimento,
            valor: item.valor,
            contato_id: item.contato?.id,
            contato_nome: item.contato?.nome,
            numero_documento: item.numeroDocumento,
            competencia: item.competencia,
            historico: item.historico,
            categoria_id: item.categoria?.id,
            portador_id: item.portador?.id,
            synced_at: new Date().toISOString(),
          }),
          extraParams,
        );
      });

      // 4. Sync Pedidos de Compra (paginated, incremental)
      await runFinancialStep("pedidos_compra", async () => {
        const lastSync = await getLastSyncDate("pedidos_compra");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/pedidos/compras",
          "bling_pedidos_compra",
          (item: any) => ({
            bling_id: item.id,
            numero: item.numero,
            data: item.data,
            situacao: item.situacao?.valor,
            fornecedor_id: item.fornecedor?.id,
            fornecedor_nome: item.fornecedor?.nome,
            valor_total: item.total,
            observacoes: item.observacoes,
            synced_at: new Date().toISOString(),
          }),
          extraParams,
        );
      });

      // 5. Refresh materialized views
      await runFinancialStep("refresh_views", async () => {
        const { error } = await supabase.rpc("refresh_financial_views");
        if (error) throw new Error(`refresh_financial_views failed: ${error.message}`);
        return 0;
      });

      // Log with detailed steps
      const totalRegistros = Object.values(sincronizados).reduce((a, b) => a + b, 0);
      const hasErrors = steps.some((s) => s.status === "erro");

      await supabase.from("bling_sync_log").insert({
        tipo: "financeiro",
        registros: totalRegistros,
        status: hasErrors ? "parcial" : "sucesso",
        steps,
      });

      return json({ status: hasErrors ? "parcial" : "ok", sincronizados, steps });
    }

    await supabase.from("bling_sync_log").insert({
      tipo,
      registros: Object.values(sincronizados).reduce((a, b) => a + b, 0),
      status: "sucesso",
    });

    return json({ status: "ok", sincronizados });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ status: "error", error: message }, 500);
  }
});
