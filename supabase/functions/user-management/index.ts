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

    const url = new URL(req.url);
    const action = url.pathname.split("/").pop();

    switch (action) {
      case "invite": {
        if (req.method !== "POST") return errorResponse("Method not allowed", 405);
        const { email, nome, role_id, send_email, password } = await req.json();

        if (!email || !role_id) return errorResponse("email and role_id are required");

        const { data: existing } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (existing) return errorResponse("Email already registered");

        if (send_email) {
          const { data: inviteData, error: inviteError } =
            await supabaseAdmin.auth.admin.inviteUserByEmail(email);
          if (inviteError) return errorResponse(inviteError.message);

          await supabaseAdmin.from("user_profiles").insert({
            id: inviteData.user.id,
            email,
            nome: nome || null,
            role_id,
            ativo: true,
          });

          return json({ user_id: inviteData.user.id, method: "invite_email" });
        } else {
          if (!password || password.length < 6) {
            return errorResponse("Password must be at least 6 characters");
          }

          const { data: createData, error: createError } =
            await supabaseAdmin.auth.admin.createUser({
              email,
              password,
              email_confirm: true,
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

        if (user_id === caller.id) {
          return errorResponse("Cannot deactivate your own account");
        }

        await supabaseAdmin
          .from("user_profiles")
          .update({ ativo: false, deleted_at: new Date().toISOString() })
          .eq("id", user_id);

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
