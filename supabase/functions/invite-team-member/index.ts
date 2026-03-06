import { createClient } from "https://esm.sh/@supabase/supabase-js@2.97.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the caller is an owner
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check caller is owner
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "owner");
    if (!callerRoles || callerRoles.length === 0) throw new Error("Only owners can invite team members");

    const { name, phone, email, password, role } = await req.json();
    if (!name || !email || !password || !role) throw new Error("Missing required fields");

    // Get caller's branch
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("branch_id")
      .eq("id", caller.id)
      .single();

    // Create user via admin API
    const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone },
    });
    if (createErr) throw createErr;

    // Update profile with branch
    if (callerProfile?.branch_id) {
      await adminClient
        .from("profiles")
        .update({ branch_id: callerProfile.branch_id, phone })
        .eq("id", newUser.user.id);
    }

    // Assign role
    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: newUser.user.id, role, branch_id: callerProfile?.branch_id });
    if (roleErr) throw roleErr;

    return new Response(JSON.stringify({ success: true, userId: newUser.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
