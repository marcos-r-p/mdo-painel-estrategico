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

// Fixed: use crm.rdstation.com directly instead of plugcrm.net (old domain causes infinite redirects)
const RD_BASE = "https://crm.rdstation.com/api/v1";

async function rdFetch(path: string, token: string) {
  const url = `${RD_BASE}${path}${path.includes("?") ? "&" : "?"}token=${token}`;
  const res = await fetch(url, { redirect: "error" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`RD Station API ${path}: ${res.status} - ${text.slice(0, 200)}`);
  }
  return res.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rdToken = Deno.env.get("RDSTATION_TOKEN");
    if (!rdToken) return json({ error: "RDSTATION_TOKEN não configurado" }, 400);

    const sincronizados: Record<string, number> = {};

    // 1. Sync deal stages
    const stagesData = await rdFetch("/deal_stages", rdToken);
    const stages = (stagesData.deal_stages ?? stagesData ?? []).map((s: any, i: number) => ({
      rdstation_id: s._id ?? s.id,
      name: s.name,
      stage_order: s.order ?? i,
      deals_count: s.deals_count ?? 0,
    }));
    if (stages.length > 0) {
      await supabase.from("rdstation_stages").upsert(stages, { onConflict: "rdstation_id" });
      sincronizados.stages = stages.length;
    }

    // 2. Sync deals (paginated)
    let page = 1;
    let totalDeals = 0;
    let hasMore = true;
    while (hasMore) {
      const dealsData = await rdFetch(`/deals?page=${page}&limit=200&win=true&win=false`, rdToken);
      const deals = (dealsData.deals ?? dealsData ?? []);
      if (!Array.isArray(deals) || deals.length === 0) { hasMore = false; break; }

      const rows = deals.map((d: any) => ({
        rdstation_id: d._id ?? d.id,
        name: d.name,
        amount: d.amount_montly ?? d.amount ?? 0,
        stage_id: d.deal_stage?._id ?? d.deal_stage?.id ?? d.stage_id,
        stage_name: d.deal_stage?.name,
        win: d.win ?? false,
        closed: d.closed ?? false,
        user_name: d.user?.name,
        deal_source: d.deal_source?.name,
        contact_name: d.contacts?.[0]?.name,
        contact_email: d.contacts?.[0]?.emails?.[0]?.email,
        loss_reason: d.loss_reason,
        created_at: d.created_at,
        closed_at: d.closed_at,
      }));

      await supabase.from("rdstation_deals").upsert(rows, { onConflict: "rdstation_id" });
      totalDeals += rows.length;
      page++;
      if (deals.length < 200) hasMore = false;
    }
    sincronizados.deals = totalDeals;

    // 3. Sync contacts (paginated)
    page = 1;
    let totalContacts = 0;
    hasMore = true;
    while (hasMore) {
      const contactsData = await rdFetch(`/contacts?page=${page}&limit=200`, rdToken);
      const contacts = (contactsData.contacts ?? contactsData ?? []);
      if (!Array.isArray(contacts) || contacts.length === 0) { hasMore = false; break; }

      const rows = contacts.map((c: any) => ({
        rdstation_id: c._id ?? c.id,
        name: c.name,
        email: c.emails?.[0]?.email,
        phone: c.phones?.[0]?.phone,
        tags: c.tags ?? [],
      }));

      await supabase.from("rdstation_contacts").upsert(rows, { onConflict: "rdstation_id" });
      totalContacts += rows.length;
      page++;
      if (contacts.length < 200) hasMore = false;
    }
    sincronizados.contacts = totalContacts;

    // 4. Sync tasks
    const tasksData = await rdFetch("/tasks?done=false&limit=200", rdToken);
    const tasks = (tasksData.tasks ?? tasksData ?? []).map((t: any) => ({
      rdstation_id: t._id ?? t.id,
      subject: t.subject,
      deal_id: t.deal_id,
      due_date: t.due_date,
      done: t.done ?? false,
    }));
    if (tasks.length > 0) {
      await supabase.from("rdstation_tasks").upsert(tasks, { onConflict: "rdstation_id" });
      sincronizados.tasks = tasks.length;
    }

    return json({ status: "ok", sincronizados });
  } catch (err) {
    return json({ status: "error", error: err.message }, 500);
  }
});
