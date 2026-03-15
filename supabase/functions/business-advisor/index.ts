import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { message, context_type } = await req.json();
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Fetch business data based on context
    const businessData: Record<string, unknown> = {};

    // Always fetch summary data
    const today = new Date().toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];

    // Recent sales (last 30 days)
    const { data: sales } = await supabase
      .from("sales")
      .select("total, status, payment_type, created_at, discount, tax")
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(200);
    businessData.recent_sales = sales || [];
    businessData.sales_count_30d = sales?.length || 0;
    businessData.total_revenue_30d = sales?.reduce((s, r) => s + Number(r.total), 0) || 0;

    // Recent expenses (last 30 days)
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount, category, expense_date")
      .gte("expense_date", thirtyDaysAgo)
      .limit(200);
    businessData.recent_expenses = expenses || [];
    businessData.total_expenses_30d = expenses?.reduce((s, r) => s + Number(r.amount), 0) || 0;

    // Products with stock levels
    const { data: products } = await supabase
      .from("products")
      .select("name, stock_qty, cost_price, sell_price, reorder_level, category")
      .eq("active", true)
      .limit(100);
    businessData.products = products || [];
    businessData.low_stock_items = products?.filter(
      (p) => p.reorder_level && p.stock_qty <= p.reorder_level
    ) || [];

    // Customers with credit
    const { data: customers } = await supabase
      .from("customers")
      .select("name, total_credit")
      .gt("total_credit", 0)
      .order("total_credit", { ascending: false })
      .limit(20);
    businessData.customers_with_debt = customers || [];
    businessData.total_receivables = customers?.reduce((s, c) => s + Number(c.total_credit), 0) || 0;

    // Suppliers with payable
    const { data: suppliers } = await supabase
      .from("suppliers")
      .select("name, total_payable")
      .gt("total_payable", 0)
      .limit(20);
    businessData.total_payables = suppliers?.reduce((s, c) => s + Number(c.total_payable), 0) || 0;

    // Sale items for product performance
    const { data: saleItems } = await supabase
      .from("sale_items")
      .select("product_name, qty, total, sale_id")
      .limit(500);
    businessData.sale_items_sample = saleItems || [];

    // Check if manufacturer - get raw materials
    const { data: rawMats } = await supabase
      .from("raw_materials")
      .select("name, stock_qty, cost_price, reorder_level, unit")
      .eq("active", true)
      .limit(50);
    if (rawMats && rawMats.length > 0) {
      businessData.raw_materials = rawMats;
      businessData.low_stock_materials = rawMats.filter(
        (m) => m.reorder_level && m.stock_qty <= m.reorder_level
      );
      businessData.is_manufacturer = true;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are BizKit AI Advisor — a sharp, no-nonsense Nigerian business consultant built into a business management app. You analyze real business data and give actionable, practical advice.

PERSONALITY:
- Speak like a savvy Nigerian business advisor — professional but relatable
- Use Naira (₦) for all money references
- Be specific with numbers — don't be vague
- Give 2-3 actionable recommendations per response
- Use bullet points and bold text for key insights
- Keep responses concise (max 300 words)
- Use emojis sparingly for emphasis (📊 💰 ⚠️ 🔥 📈)

BUSINESS DATA CONTEXT (as of ${today}):
${JSON.stringify(businessData, null, 2)}

RULES:
- Always reference specific numbers from the data
- If data is empty/limited, acknowledge it and suggest the user adds more data
- Compare metrics where possible (e.g., revenue vs expenses)
- Flag urgent issues first (low stock, high debt, declining sales)
- For manufacturers, also analyze raw material efficiency and production costs
- Calculate profit margins when you have both cost and sell prices
- Identify top-selling and underperforming products`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please top up." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("business-advisor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
