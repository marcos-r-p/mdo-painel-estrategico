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

const MAX_PAGES = 50;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getLastSync(supabase: any, tipo: string): Promise<string | null> {
  const { data } = await supabase
    .from("bling_sync_log")
    .select("created_at")
    .eq("tipo", tipo)
    .eq("status", "sucesso")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.created_at ?? null;
}

async function getBlingToken(supabase: any) {
  const { data: tokenRow } = await supabase
    .from("bling_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("id", 1)
    .single();

  if (!tokenRow?.access_token) throw new Error("Bling nao conectado");

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    const clientId = Deno.env.get("BLING_CLIENT_ID");
    const clientSecret = Deno.env.get("BLING_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("BLING_CLIENT_ID/SECRET nao configurados");

    const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: `grant_type=refresh_token&refresh_token=${tokenRow.refresh_token}`,
    });

    if (!res.ok) throw new Error(`Bling refresh falhou: ${res.status}`);
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

async function blingFetch(path: string, token: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`https://www.bling.com.br/Api/v3${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    if (res.status === 429) {
      if (attempt === retries) {
        throw new Error(`Bling API ${path}: 429 - Rate limit apos ${retries} tentativas`);
      }
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
    const mode = url.searchParams.get("mode") ?? "full";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = await getBlingToken(supabase);
    const sincronizados: Record<string, number> = {};

    // Incremental: filter by dataAlteracao if we have a last sync date
    let sinceParam = "";
    if (mode === "incremental") {
      const lastSync = await getLastSync(supabase, tipo);
      if (lastSync) {
        const d = new Date(lastSync);
        sinceParam = `&dataAlteracaoInicial=${d.toISOString().split("T")[0]}`;
      } else {
        const d = new Date(); d.setDate(d.getDate() - 7);
        sinceParam = `&dataAlteracaoInicial=${d.toISOString().split("T")[0]}`;
      }
    }

    if (tipo === "contatos") {
      let page = 1;
      let total = 0;
      while (page <= MAX_PAGES) {
        const data = await blingFetch(`/contatos?pagina=${page}&limite=100${sinceParam}`, token);
        const contatos = data.data ?? [];
        if (contatos.length === 0) break;

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
        if (contatos.length < 100) break;
        if (page <= MAX_PAGES) await delay(350);
      }
      sincronizados.contatos = total;
    }

    if (tipo === "produtos") {
      let page = 1;
      let total = 0;
      while (page <= MAX_PAGES) {
        const data = await blingFetch(`/produtos?pagina=${page}&limite=100${sinceParam}`, token);
        const produtos = data.data ?? [];
        if (produtos.length === 0) break;

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
        if (produtos.length < 100) break;
        if (page <= MAX_PAGES) await delay(350);
      }
      sincronizados.produtos = total;
    }

    if (tipo === "pedidos") {
      let page = 1;
      let total = 0;
      while (page <= MAX_PAGES) {
        const data = await blingFetch(`/pedidos/vendas?pagina=${page}&limite=100${sinceParam}`, token);
        const pedidos = data.data ?? [];
        if (pedidos.length === 0) break;

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
        if (pedidos.length < 100) break;
        if (page <= MAX_PAGES) await delay(350);
      }
      sincronizados.pedidos = total;
    }

    if (tipo === "financeiro") {
      const steps: Array<{ step: string; status: string; registros: number; duracao_ms: number; erro?: string }> = [];

      async function runFinancialStep(stepName: string, fn: () => Promise<number>) {
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
            console.error(`[financeiro] ${stepName} falhou apos 2 tentativas: ${errorMsg}`);
            steps.push({ step: stepName, status: "erro", registros: 0, duracao_ms: Date.now() - t0, erro: errorMsg });
            sincronizados[stepName] = 0;
          }
        }
      }

      async function paginatedSync(
        endpoint: string,
        table: string,
        mapRow: (item: any) => Record<string, unknown>,
        extraParams?: string,
      ): Promise<number> {
        let page = 1;
        let total = 0;
        while (page <= MAX_PAGES) {
          const separator = endpoint.includes("?") ? "&" : "?";
          const url = `${endpoint}${separator}pagina=${page}&limite=100${extraParams ? `&${extraParams}` : ""}`;
          const data = await blingFetch(url, token);
          const items = data.data ?? [];
          if (items.length === 0) break;

          const rows = items.map((item: any) => mapRow(item));
          const { error } = await supabase.from(table).upsert(rows, { onConflict: "bling_id" });
          if (error) {
            console.error(`[financeiro] upsert ${table} erro:`, error.message);
            throw new Error(`Upsert ${table} falhou: ${error.message}`);
          }
          total += rows.length;
          page++;
          if (items.length < 100) break;
          if (page <= MAX_PAGES) await delay(350);
        }
        return total;
      }

      // 1. Sync Categorias
      await runFinancialStep("categorias", async () => {
        const data = await blingFetch("/categorias/receitas-despesas", token);
        const items = data.data ?? [];
        if (items.length === 0) return 0;

        const rows = items.map((c: any) => ({
          bling_id: c.id,
          descricao: c.descricao,
          tipo: c.tipo,
          synced_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("bling_categorias").upsert(rows, { onConflict: "bling_id" });
        if (error) throw new Error(`Upsert categorias falhou: ${error.message}`);
        return rows.length;
      });

      // 2. Sync Contas a Receber
      await runFinancialStep("contas_receber", async () => {
        const lastSync = await getLastSync(supabase, "financeiro");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/contas/receber",
          "bling_contas_receber",
          (item: any) => ({
            bling_id: item.id,
            situacao: typeof item.situacao === "object" ? item.situacao?.valor : item.situacao,
            data_vencimento: item.vencimento || null,
            data_emissao: item.dataEmissao || item.competencia || null,
            data_recebimento: item.dataRecebimento || null,
            valor: item.valor ?? 0,
            valor_recebido: item.valorRecebido ?? 0,
            saldo: item.saldo ?? (item.valor ?? 0) - (item.valorRecebido ?? 0),
            contato_id: item.contato?.id || null,
            contato_nome: item.contato?.nome || null,
            numero_documento: item.numeroDocumento || null,
            categoria: item.categoria?.descricao || null,
            historico: item.historico || null,
            synced_at: new Date().toISOString(),
          }),
          extraParams,
        );
      });

      // 3. Sync Contas a Pagar
      await runFinancialStep("contas_pagar", async () => {
        const lastSync = await getLastSync(supabase, "financeiro");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/contas/pagar",
          "bling_contas_pagar",
          (item: any) => ({
            bling_id: item.id,
            situacao: typeof item.situacao === "object" ? item.situacao?.valor : item.situacao,
            data_vencimento: item.vencimento || null,
            data_emissao: item.dataEmissao || item.competencia || null,
            data_pagamento: item.dataPagamento || null,
            valor: item.valor ?? 0,
            valor_pago: item.valorPago ?? 0,
            saldo: item.saldo ?? (item.valor ?? 0) - (item.valorPago ?? 0),
            fornecedor_id: item.contato?.id || item.fornecedor?.id || null,
            fornecedor_nome: item.contato?.nome || item.fornecedor?.nome || null,
            numero_documento: item.numeroDocumento || null,
            categoria: item.categoria?.descricao || null,
            historico: item.historico || null,
            synced_at: new Date().toISOString(),
          }),
          extraParams,
        );
      });

      // 4. Sync Pedidos de Compra
      await runFinancialStep("pedidos_compra", async () => {
        const lastSync = await getLastSync(supabase, "financeiro");
        const extraParams = lastSync ? `dataAlteracaoInicial=${lastSync.slice(0, 10)}` : undefined;

        return paginatedSync(
          "/pedidos/compras",
          "bling_pedidos_compra",
          (item: any) => ({
            bling_id: item.id,
            numero: item.numero?.toString() || null,
            data_pedido: item.data || null,
            situacao: typeof item.situacao === "object" ? item.situacao?.valor : item.situacao,
            fornecedor_id: item.fornecedor?.id || item.contato?.id || null,
            fornecedor_nome: item.fornecedor?.nome || item.contato?.nome || null,
            valor_total: item.total ?? item.totalProdutos ?? 0,
            valor_frete: item.transporte?.frete ?? 0,
            valor_desconto: item.desconto ?? 0,
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

    return json({ status: "ok", mode, sincronizados });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[bling-sync] error:", message);
    return json({ status: "error", error: message }, 500);
  }
});
