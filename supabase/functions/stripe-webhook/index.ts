import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeSig = req.headers.get("stripe-signature");
  const body = await req.text();

  // Placeholder: In production, verify with Stripe SDK
  let event;
  try {
    event = JSON.parse(body);
  } catch {
    return new Response("Invalid body", { status: 400 });
  }

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object;
      const userId = sub.metadata?.user_id;
      if (!userId) break;

      const tier = sub.items?.data?.[0]?.price?.metadata?.tier || sub.metadata?.tier || "free";

      await supabase.from("Subscription").upsert({
        id: sub.id,
        userId,
        status: sub.status,
        tier,
        stripeSubscriptionId: sub.id,
        stripeCustomerId: sub.customer,
        currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        updatedAt: new Date().toISOString(),
      }, { onConflict: "id" });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object;
      await supabase.from("Subscription").update({
        status: "canceled",
        cancelAtPeriodEnd: false,
        updatedAt: new Date().toISOString(),
      }).eq("id", sub.id);
      break;
    }
  }

  return new Response(JSON.stringify({ received: true }));
});
