import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Require auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { reference } = await req.json();
    if (!reference || typeof reference !== "string") return json({ error: "reference required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Caller's org
    const { data: profile } = await admin.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
    if (!profile?.organization_id) return json({ error: "No organization" }, 403);

    const { data: payment } = await admin.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
    if (!payment) return json({ error: "Payment not found" }, 404);
    if (payment.organization_id !== profile.organization_id) return json({ error: "Forbidden" }, 403);

    if (payment.status === "approved") {
      return json({ status: "approved", subscription_id: payment.subscription_id });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      await admin.from("payment_transactions").update({ status: "failed", metadata: { ...(payment.metadata as object || {}), verify: verifyData } }).eq("id", payment.id);
      return json({ status: "failed", message: "Verification failed" });
    }

    const paidAmount = (verifyData.data.amount || 0) / 100;
    if (paidAmount < Number(payment.amount)) {
      await admin.from("payment_transactions").update({ status: "failed", admin_note: "Underpayment" }).eq("id", payment.id);
      return json({ status: "failed", message: "Underpayment" });
    }

    const { data: subId, error: actErr } = await admin.rpc("activate_subscription_from_payment", { p_payment_id: payment.id });
    if (actErr) throw actErr;

    return json({ status: "approved", subscription_id: subId });
  } catch (e) {
    console.error("paystack-verify error:", e);
    return json({ error: "Payment verification failed. Please try again." }, 500);
  }
});
