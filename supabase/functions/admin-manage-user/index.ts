import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type AppRole = "ADMIN" | "OPERATOR" | "VIEWER";
const ALLOWED_ROLES: AppRole[] = ["ADMIN", "OPERATOR", "VIEWER"];

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asRole(value: unknown): AppRole | null {
  if (typeof value !== "string") return null;
  return ALLOWED_ROLES.includes(value as AppRole) ? (value as AppRole) : null;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return jsonResponse({ error: "Server env misconfigured" }, 500);
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !userData.user) return jsonResponse({ error: "Unauthorized" }, 401);
    const caller = userData.user;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .single();
    if (roleError) return jsonResponse({ error: roleError.message }, 500);
    if (roleData?.role !== "ADMIN") return jsonResponse({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const action = asNonEmptyString((body as Record<string, unknown>).action);
    if (!action) return jsonResponse({ error: "Missing action" }, 400);

    if (action === "create") {
      const email = asNonEmptyString((body as Record<string, unknown>).email);
      const password = asNonEmptyString((body as Record<string, unknown>).password);
      const name = asNonEmptyString((body as Record<string, unknown>).name);
      const role = asRole((body as Record<string, unknown>).role) ?? "OPERATOR";

      if (!email || !password || !name) return jsonResponse({ error: "Missing fields" }, 400);
      if (!isValidEmail(email)) return jsonResponse({ error: "Invalid email" }, 400);
      if (password.length < 8) return jsonResponse({ error: "Password must have at least 8 characters" }, 400);

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });
      if (createError || !newUser.user) return jsonResponse({ error: createError?.message ?? "User creation failed" }, 400);

      if (role !== "OPERATOR") {
        const { error: updateRoleError } = await adminClient
          .from("user_roles")
          .update({ role })
          .eq("user_id", newUser.user.id);
        if (updateRoleError) {
          await adminClient.auth.admin.deleteUser(newUser.user.id);
          return jsonResponse({ error: `Role update failed: ${updateRoleError.message}` }, 400);
        }
      }

      const { error: auditError } = await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        user_email: caller.email,
        user_name: asNonEmptyString(caller.user_metadata?.name) ?? caller.email,
        action: "USER_CREATED",
        entity: "users",
        entity_id: newUser.user.id,
        details: { email, name, role },
      });
      if (auditError) return jsonResponse({ error: `Audit log failed: ${auditError.message}` }, 500);

      return jsonResponse({ success: true, user_id: newUser.user.id });
    }

    if (action === "update") {
      const userId = asNonEmptyString((body as Record<string, unknown>).user_id);
      const name = asNonEmptyString((body as Record<string, unknown>).name);
      const role = asRole((body as Record<string, unknown>).role);
      const active = asOptionalBoolean((body as Record<string, unknown>).active);

      if (!userId) return jsonResponse({ error: "Missing user_id" }, 400);
      if (name === null && role === null && active === undefined) {
        return jsonResponse({ error: "No valid fields to update" }, 400);
      }

      const changes: Record<string, unknown> = {};

      if (name !== null) {
        const { error } = await adminClient.from("profiles").update({ name }).eq("user_id", userId);
        if (error) return jsonResponse({ error: `Profile update failed: ${error.message}` }, 400);
        changes.name = name;
      }

      if (role !== null) {
        const { error } = await adminClient.from("user_roles").update({ role }).eq("user_id", userId);
        if (error) return jsonResponse({ error: `Role update failed: ${error.message}` }, 400);
        changes.role = role;
      }

      if (active !== undefined) {
        const { error: profileActiveError } = await adminClient
          .from("profiles")
          .update({ active })
          .eq("user_id", userId);
        if (profileActiveError) return jsonResponse({ error: `Active update failed: ${profileActiveError.message}` }, 400);

        const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
          ban_duration: active ? "none" : "876600h",
        });
        if (authError) return jsonResponse({ error: `Auth status update failed: ${authError.message}` }, 400);
        changes.active = active;
      }

      const { error: auditError } = await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        user_email: caller.email,
        action: "USER_UPDATED",
        entity: "users",
        entity_id: userId,
        details: changes,
      });
      if (auditError) return jsonResponse({ error: `Audit log failed: ${auditError.message}` }, 500);

      return jsonResponse({ success: true });
    }

    if (action === "reset_password") {
      const userId = asNonEmptyString((body as Record<string, unknown>).user_id);
      const newPassword = asNonEmptyString((body as Record<string, unknown>).new_password);
      if (!userId || !newPassword) return jsonResponse({ error: "Missing fields" }, 400);
      if (newPassword.length < 8) return jsonResponse({ error: "Password must have at least 8 characters" }, 400);

      const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) return jsonResponse({ error: error.message }, 400);

      const { error: auditError } = await adminClient.from("audit_logs").insert({
        user_id: caller.id,
        user_email: caller.email,
        action: "PASSWORD_RESET",
        entity: "users",
        entity_id: userId,
        details: { reset_by: caller.email },
      });
      if (auditError) return jsonResponse({ error: `Audit log failed: ${auditError.message}` }, 500);

      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
