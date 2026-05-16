import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";
    const secret = Deno.env.get("PAYSTACK_SECRET_KEY")!;
    const computed = createHmac("sha512", secret).update(raw).digest("hex");
    if (computed !== signature) {
      return new Response("Invalid signature", { status: 401 });
    }

    const event = JSON.parse(raw);
    if (event.event !== "charge.success") return new Response("ok");

    const reference = event.data?.reference;
    if (!reference) return new Response("ok");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: payment } = await admin.from("payment_transactions").select("*").eq("reference", reference).maybeSingle();
    if (!payment || payment.status === "approved") return new Response("ok");

    await admin.rpc("activate_subscription_from_payment", { p_payment_id: payment.id });
    return new Response("ok");
  } catch (e) {
    return new Response((e as Error).message, { status: 500 });
  }
});
