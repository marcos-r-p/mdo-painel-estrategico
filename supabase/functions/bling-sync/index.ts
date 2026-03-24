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
      sincronizados.financeiro = 0;
    }

    await supabase.from("bling_sync_log").insert({
      tipo,
      registros: Object.values(sincronizados).reduce((a, b) => a + b, 0),
      status: "sucesso",
    });

    return json({ status: "ok", sincronizados });
  } catch (err) {
    return json({ status: "error", error: err.message }, 500);
  }
});
