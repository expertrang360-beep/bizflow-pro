import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// HaveIBeenPwned (HIBP) password check
// Reference: https://haveibeenpwned.com/API/v3#SearchingPastesForAnEmail

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
      });
    }

    const { password } = await req.json();

    if (!password) {
      return new Response(
        JSON.stringify({ error: "Password required" }),
        { status: 400 }
      );
    }

    // Convert password to SHA-1 (HIBP requires it)
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-1", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const hashUpper = hashHex.toUpperCase();

    // Use range search: first 5 chars of hash
    const prefix = hashUpper.substring(0, 5);
    const suffix = hashUpper.substring(5);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        headers: {
          "User-Agent": "BizKit-Password-Check/1.0",
        },
      }
    );

    if (!response.ok) {
      console.error("HIBP API error:", response.status);
      // If HIBP is unavailable, don't block the user
      return new Response(
        JSON.stringify({ leaked: false, checked: false }),
        { status: 200 }
      );
    }

    const text = await response.text();
    const leaked = text
      .split("\r\n")
      .some((line) => line.startsWith(suffix));

    return new Response(
      JSON.stringify({ leaked, checked: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("check-hibp error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", checked: false }),
      { status: 500 }
    );
  }
});
