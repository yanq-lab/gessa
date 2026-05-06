import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2023-10-16",
});

const WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return new Response("Missing signature", { status: 400 });
  }

  if (!WEBHOOK_SECRET) {
    console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
    return new Response(`Webhook signature verification failed: ${err.message}`, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) {
          console.warn(`[Stripe Webhook] No user_id in subscription metadata: ${sub.id}`);
          break;
        }

        const tier = sub.items?.data?.[0]?.price?.metadata?.tier || sub.metadata?.tier || "free";

        const { error } = await supabase.from("Subscription").upsert({
          id: sub.id,
          userId,
          status: sub.status,
          tier,
          stripeSubscriptionId: sub.id,
          stripeCustomerId: typeof sub.customer === "string" ? sub.customer : sub.customer.id,
          currentPeriodStart: new Date(sub.current_period_start * 1000).toISOString(),
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          updatedAt: new Date().toISOString(),
        }, { onConflict: "id" });

        if (error) {
          console.error(`[Stripe Webhook] Failed to upsert subscription: ${error.message}`);
          throw error;
        }

        console.log(`[Stripe Webhook] Subscription ${event.type}: ${sub.id} -> tier=${tier}, status=${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { error } = await supabase.from("Subscription").update({
          status: "canceled",
          cancelAtPeriodEnd: false,
          updatedAt: new Date().toISOString(),
        }).eq("id", sub.id);

        if (error) {
          console.error(`[Stripe Webhook] Failed to cancel subscription: ${error.message}`);
          throw error;
        }

        console.log(`[Stripe Webhook] Subscription canceled: ${sub.id}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(`[Stripe Webhook] Payment succeeded: ${invoice.id}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.error(`[Stripe Webhook] Payment failed: ${invoice.id}`);
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`[Stripe Webhook] Error processing event ${event.id}: ${err.message}`);
    return new Response(`Webhook processing failed: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true, eventId: event.id }));
});
