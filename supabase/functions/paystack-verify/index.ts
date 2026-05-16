import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { reference } = await req.json();
    if (!reference) {
      return new Response(JSON.stringify({ error: "reference required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: payment } = await admin.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
    if (!payment) return new Response(JSON.stringify({ error: "Payment not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if (payment.status === "approved") {
      return new Response(JSON.stringify({ status: "approved", subscription_id: payment.subscription_id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${Deno.env.get("PAYSTACK_SECRET_KEY")}` },
    });
    const verifyData = await verifyRes.json();

    if (!verifyData.status || verifyData.data?.status !== "success") {
      await admin.from("payment_transactions").update({ status: "failed", metadata: { ...(payment.metadata as object || {}), verify: verifyData } }).eq("id", payment.id);
      return new Response(JSON.stringify({ status: "failed", message: verifyData.message || "Verification failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const paidAmount = (verifyData.data.amount || 0) / 100;
    if (paidAmount < Number(payment.amount)) {
      await admin.from("payment_transactions").update({ status: "failed", admin_note: "Underpayment" }).eq("id", payment.id);
      return new Response(JSON.stringify({ status: "failed", message: "Underpayment" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: subId, error: actErr } = await admin.rpc("activate_subscription_from_payment", { p_payment_id: payment.id });
    if (actErr) throw actErr;

    return new Response(JSON.stringify({ status: "approved", subscription_id: subId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
