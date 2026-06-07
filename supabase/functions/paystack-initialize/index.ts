import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { plan_id, callback_url } = await req.json();
    if (!plan_id) {
      return new Response(JSON.stringify({ error: "plan_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Service-role client for trusted DB ops
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: profile } = await admin.from("profiles").select("organization_id, name").eq("id", user.id).maybeSingle();
    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: plan } = await admin.from("plans").select("*").eq("id", plan_id).eq("active", true).maybeSingle();
    if (!plan) return new Response(JSON.stringify({ error: "Plan not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (Number(plan.price) <= 0) return new Response(JSON.stringify({ error: "Free plan cannot be paid" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const reference = `BZK-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const amountKobo = Math.round(Number(plan.price) * 100);

    const psRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: amountKobo,
        currency: plan.currency || "NGN",
        reference,
        callback_url,
        metadata: { organization_id: profile.organization_id, plan_id, user_id: user.id },
      }),
    });
    const psData = await psRes.json();
    if (!psData.status) {
      return new Response(JSON.stringify({ error: psData.message || "Paystack init failed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("payment_transactions").insert({
      organization_id: profile.organization_id,
      plan_id,
      user_id: user.id,
      provider: "paystack",
      reference,
      amount: plan.price,
      currency: plan.currency || "NGN",
      status: "pending",
      metadata: { paystack: psData.data },
    });

    return new Response(JSON.stringify({ authorization_url: psData.data.authorization_url, reference }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("paystack-initialize error:", e);
    return new Response(JSON.stringify({ error: "Payment initialization failed. Please try again." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
