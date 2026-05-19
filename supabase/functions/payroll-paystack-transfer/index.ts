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
    const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!PAYSTACK_SECRET_KEY) {
      throw new Error("Paystack is not configured. Please add your Paystack secret key in Settings.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
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
    if (!callerRoles || callerRoles.length === 0) throw new Error("Only owners can initiate payroll transfers");

    const { payroll_run_id } = await req.json();
    if (!payroll_run_id) throw new Error("Missing payroll_run_id");

    // Verify caller's organization
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", caller.id)
      .single();
    if (!callerProfile?.organization_id) throw new Error("Unauthorized");

    // Get the payroll run
    const { data: run, error: runErr } = await adminClient
      .from("payroll_runs")
      .select("*")
      .eq("id", payroll_run_id)
      .single();
    if (runErr || !run) throw new Error("Payroll run not found");
    if (run.organization_id !== callerProfile.organization_id) {
      throw new Error("Unauthorized: payroll run does not belong to your organization");
    }
    if (run.status !== "approved") throw new Error("Payroll must be approved before payment");

    // Get payroll items with staff details
    const { data: items, error: itemsErr } = await adminClient
      .from("payroll_items")
      .select("*, staff_salaries:staff_salary_id(bank_name, account_number)")
      .eq("payroll_run_id", payroll_run_id);
    if (itemsErr) throw itemsErr;

    const results: { staff_name: string; status: string; message: string }[] = [];

    for (const item of items || []) {
      const staffSalary = (item as any).staff_salaries;
      if (!staffSalary?.bank_name || !staffSalary?.account_number) {
        results.push({ staff_name: item.staff_name, status: "skipped", message: "Missing bank details" });
        continue;
      }

      try {
        // Step 1: Resolve bank code from bank name
        const bankListRes = await fetch("https://api.paystack.co/bank", {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        const bankListData = await bankListRes.json();
        const bank = bankListData.data?.find((b: any) =>
          b.name.toLowerCase().includes(staffSalary.bank_name.toLowerCase())
        );
        if (!bank) {
          results.push({ staff_name: item.staff_name, status: "failed", message: `Bank not found: ${staffSalary.bank_name}` });
          continue;
        }

        // Step 2: Create transfer recipient
        const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: "nuban",
            name: item.staff_name,
            account_number: staffSalary.account_number,
            bank_code: bank.code,
            currency: "NGN",
          }),
        });
        const recipientData = await recipientRes.json();
        if (!recipientData.status) {
          results.push({ staff_name: item.staff_name, status: "failed", message: recipientData.message || "Failed to create recipient" });
          continue;
        }

        // Step 3: Initiate transfer (amount in kobo)
        const transferRes = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(item.net_pay * 100),
            recipient: recipientData.data.recipient_code,
            reason: `Salary: ${run.pay_period}`,
          }),
        });
        const transferData = await transferRes.json();

        if (transferData.status) {
          results.push({ staff_name: item.staff_name, status: "success", message: transferData.data.transfer_code });
          // Update item payment status
          await adminClient.from("payroll_items")
            .update({ payment_status: "sent" } as any)
            .eq("id", item.id);
        } else {
          results.push({ staff_name: item.staff_name, status: "failed", message: transferData.message || "Transfer failed" });
        }
      } catch (transferErr: any) {
        results.push({ staff_name: item.staff_name, status: "failed", message: transferErr.message });
      }
    }

    // If all succeeded, mark payroll as paid
    const allSuccess = results.every(r => r.status === "success" || r.status === "skipped");
    if (allSuccess && results.some(r => r.status === "success")) {
      await adminClient.from("payroll_runs")
        .update({ status: "paid", paid_date: new Date().toISOString().split("T")[0] } as any)
        .eq("id", payroll_run_id);
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
