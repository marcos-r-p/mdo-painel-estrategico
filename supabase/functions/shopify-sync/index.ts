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

/** Fetch with timeout to avoid hanging requests */
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const tipo = url.searchParams.get("tipo") ?? "pedidos";
    const meses = parseInt(url.searchParams.get("meses") ?? "3");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get Shopify token
    const { data: tokenRow } = await supabase
      .from("shopify_tokens")
      .select("shop, access_token")
      .eq("id", 1)
      .single();

    if (!tokenRow?.access_token || !tokenRow?.shop) {
      return json({ error: "Shopify não conectado" }, 400);
    }

    const { shop, access_token } = tokenRow;
    // Ensure shop domain doesn't have protocol prefix
    const cleanShop = shop.replace(/^https?:\/\//, "").replace(/\/$/, "");
    const baseUrl = `https://${cleanShop}/admin/api/2024-01`;
    const headers = { "X-Shopify-Access-Token": access_token, "Content-Type": "application/json" };

    const sincronizados: Record<string, number> = {};
    const since = new Date();
    since.setMonth(since.getMonth() - meses);
    const sinceISO = since.toISOString();

    if (tipo === "pedidos" || tipo === "all") {
      let pageInfo: string | null = null;
      let total = 0;
      do {
        const endpoint = pageInfo
          ? `${baseUrl}/orders.json?limit=250&page_info=${pageInfo}`
          : `${baseUrl}/orders.json?limit=250&status=any&created_at_min=${sinceISO}`;
        const res = await fetchWithTimeout(endpoint, { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Shopify orders: ${res.status} - ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        const orders = data.orders ?? [];
        if (orders.length === 0) break;

        const rows = orders.map((o: any) => ({
          id: o.id,
          numero: o.order_number?.toString(),
          data: o.created_at,
          cliente_email: o.email,
          cliente_nome: o.customer?.first_name ? `${o.customer.first_name} ${o.customer.last_name ?? ""}`.trim() : o.email,
          valor_total: parseFloat(o.total_price ?? "0"),
          subtotal: parseFloat(o.subtotal_price ?? "0"),
          desconto: parseFloat(o.total_discounts ?? "0"),
          frete: o.shipping_lines?.[0] ? parseFloat(o.shipping_lines[0].price ?? "0") : 0,
          impostos: parseFloat(o.total_tax ?? "0"),
          status_financeiro: o.financial_status,
          status_fulfillment: o.fulfillment_status,
          canal: o.source_name,
          gateway_pagamento: o.gateway,
          uf: o.shipping_address?.province_code,
          cidade: o.shipping_address?.city,
          pais: o.shipping_address?.country_code ?? "BR",
          itens: (o.line_items ?? []).map((li: any) => ({ sku: li.sku, titulo: li.title, quantidade: li.quantity, preco: parseFloat(li.price ?? "0") })),
          tags: o.tags,
          nota: o.note,
        }));

        await supabase.from("shopify_pedidos").upsert(rows, { onConflict: "id" });
        total += rows.length;

        const linkHeader = res.headers.get("link");
        const nextMatch = linkHeader?.match(/<[^>]*page_info=([^>&]*)>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } while (pageInfo);
      sincronizados.pedidos = total;
    }

    if (tipo === "clientes" || tipo === "all") {
      let pageInfo: string | null = null;
      let total = 0;
      do {
        const endpoint = pageInfo
          ? `${baseUrl}/customers.json?limit=250&page_info=${pageInfo}`
          : `${baseUrl}/customers.json?limit=250&created_at_min=${sinceISO}`;
        const res = await fetchWithTimeout(endpoint, { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Shopify customers: ${res.status} - ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        const customers = data.customers ?? [];
        if (customers.length === 0) break;

        const rows = customers.map((c: any) => ({
          id: c.id,
          email: c.email,
          nome: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.email,
          telefone: c.phone,
          total_pedidos: c.orders_count ?? 0,
          total_gasto: parseFloat(c.total_spent ?? "0"),
          tags: c.tags,
          aceita_marketing: c.accepts_marketing ?? false,
          uf: c.default_address?.province_code,
          cidade: c.default_address?.city,
          pais: c.default_address?.country_code ?? "BR",
          primeira_compra: c.created_at,
          ultima_compra: c.updated_at,
          nota: c.note,
        }));

        await supabase.from("shopify_clientes").upsert(rows, { onConflict: "id" });
        total += rows.length;

        const linkHeader = res.headers.get("link");
        const nextMatch = linkHeader?.match(/<[^>]*page_info=([^>&]*)>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } while (pageInfo);
      sincronizados.clientes = total;
    }

    if (tipo === "produtos" || tipo === "all") {
      let pageInfo: string | null = null;
      let total = 0;
      do {
        const endpoint = pageInfo
          ? `${baseUrl}/products.json?limit=250&page_info=${pageInfo}`
          : `${baseUrl}/products.json?limit=250`;
        const res = await fetchWithTimeout(endpoint, { headers });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(`Shopify products: ${res.status} - ${text.slice(0, 200)}`);
        }
        const data = await res.json();
        const products = data.products ?? [];
        if (products.length === 0) break;

        const rows = products.map((p: any) => ({
          id: p.id,
          titulo: p.title,
          tipo: p.product_type,
          vendor: p.vendor,
          tags: p.tags,
          status: p.status,
          variantes: (p.variants ?? []).map((v: any) => ({ id: v.id, sku: v.sku, preco: v.price, estoque: v.inventory_quantity })),
          imagem_url: p.image?.src,
        }));

        await supabase.from("shopify_produtos").upsert(rows, { onConflict: "id" });
        total += rows.length;

        const linkHeader = res.headers.get("link");
        const nextMatch = linkHeader?.match(/<[^>]*page_info=([^>&]*)>; rel="next"/);
        pageInfo = nextMatch ? nextMatch[1] : null;
      } while (pageInfo);
      sincronizados.produtos = total;
    }

    await supabase.from("shopify_sync_log").insert({ tipo, registros: Object.values(sincronizados).reduce((a, b) => a + b, 0), status: "sucesso" });

    return json({ status: "ok", sincronizados });
  } catch (err) {
    return json({ status: "error", error: err.message }, 500);
  }
});
