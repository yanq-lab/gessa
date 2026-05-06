"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, Zap, Crown } from "lucide-react";

const tiers = [
  {
    name: "Free",
    tier: "free",
    description: "Get started with digital restoration",
    priceMonthly: 0,
    priceYearly: 0,
    features: [
      "3 transformations/month",
      "Basic restoration",
      "Public gallery page",
      "Community support",
    ],
    notIncluded: [
      "API access",
      "Custom domain",
      "Priority support",
      "Bulk operations",
    ],
    icon: Sparkles,
    cta: "Get started",
    popular: false,
  },
  {
    name: "Artist",
    tier: "artist",
    description: "For independent artists",
    priceMonthly: 15,
    priceYearly: 150,
    features: [
      "30 transformations/month",
      "Advanced restoration modes",
      "Public gallery page",
      "API access",
      "Email support",
      "$0.80 per extra transformation",
    ],
    notIncluded: [
      "Custom domain",
      "Priority support",
    ],
    icon: Zap,
    cta: "Start free trial",
    popular: true,
  },
  {
    name: "Studio",
    tier: "studio",
    description: "For small galleries & studios",
    priceMonthly: 35,
    priceYearly: 350,
    features: [
      "120 transformations/month",
      "Advanced restoration modes",
      "Public gallery page",
      "API access",
      "Custom domain",
      "Priority email support",
      "$0.60 per extra transformation",
    ],
    notIncluded: [],
    icon: Crown,
    cta: "Start free trial",
    popular: false,
  },
  {
    name: "Gallery",
    tier: "gallery",
    description: "For large galleries & institutions",
    priceMonthly: 69,
    priceYearly: 690,
    features: [
      "500 transformations/month",
      "Advanced restoration modes",
      "Public gallery page",
      "API access",
      "Custom domain",
      "Priority support + SLA",
      "$0.40 per extra transformation",
      "Dedicated account manager",
    ],
    notIncluded: [],
    icon: Crown,
    cta: "Contact sales",
    popular: false,
  },
];

const faqs = [
  {
    q: "What counts as a transformation?",
    a: "Each time you restore an artwork image counts as one transformation. Regenerating the same artwork also counts as a new transformation.",
  },
  {
    q: "Can I cancel my subscription anytime?",
    a: "Yes, you can cancel your subscription at any time from your account settings. You will continue to have access until the end of your billing period.",
  },
  {
    q: "What happens if I exceed my monthly quota?",
    a: "Paid plans allow extra transformations at a per-use rate. Free plan users will need to upgrade to continue restoring.",
  },
  {
    q: "Do you offer refunds?",
    a: "We offer a 14-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.",
  },
  {
    q: "Can I switch plans?",
    a: "Yes, you can upgrade or downgrade your plan at any time. Upgrades take effect immediately, downgrades at the next billing cycle.",
  },
];

export default function PricingPage() {
  const [isYearly, setIsYearly] = useState(false);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="text-center mb-12">
        <h1 className="font-serif text-3xl text-stone-900 sm:text-4xl">Simple, transparent pricing</h1>
        <p className="mt-4 text-sm text-stone-600 max-w-xl mx-auto">
          Choose the plan that fits your needs. All plans include core restoration features.
        </p>
        
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white p-1">
          <button
            onClick={() => setIsYearly(false)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${!isYearly ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:text-stone-900"}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setIsYearly(true)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${isYearly ? "bg-stone-900 text-stone-50" : "text-stone-600 hover:text-stone-900"}`}
          >
            Yearly <span className="text-xs">(Save 15%)</span>
          </button>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {tiers.map((tier) => (
          <Card key={tier.tier} className={`border-stone-200 shadow-none relative ${tier.popular ? "ring-2 ring-stone-900" : ""}`}>
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-3 py-1 text-xs font-medium text-stone-50">
                Most popular
              </div>
            )}
            <CardContent className="pt-6">
              <div className="mb-4">
                <tier.icon className="h-6 w-6 text-stone-400" strokeWidth={1.5} />
              </div>
              <h3 className="font-serif text-xl text-stone-900">{tier.name}</h3>
              <p className="mt-1 text-sm text-stone-500">{tier.description}</p>
              
              <div className="mt-4">
                <span className="text-3xl font-semibold text-stone-900">${isYearly ? (tier.priceYearly / 12).toFixed(0) : tier.priceMonthly}</span>
                <span className="text-sm text-stone-500">/mo</span>
                {isYearly && tier.priceYearly > 0 && (
                  <p className="text-xs text-stone-400">Billed annually at ${tier.priceYearly}</p>
                )}
              </div>

              <Button 
                asChild 
                className={`mt-4 w-full ${tier.popular ? "bg-stone-900 text-stone-50 hover:bg-stone-800" : "border-stone-200 text-stone-700 hover:bg-stone-100"}`}
                variant={tier.popular ? "default" : "outline"}
              >
                <Link href={`/auth/register?plan=${tier.tier}`}>{tier.cta}</Link>
              </Button>

              <ul className="mt-6 space-y-2">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-stone-700">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-900" />
                    {feature}
                  </li>
                ))}
                {tier.notIncluded.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-stone-400">
                    <span className="mt-0.5 h-4 w-4 flex-shrink-0 text-stone-300">—</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-16">
        <h2 className="text-center font-serif text-2xl text-stone-900 mb-8">Frequently asked questions</h2>
        <div className="mx-auto max-w-2xl space-y-4">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-sm border border-stone-200 bg-white p-4">
              <h3 className="font-medium text-stone-900">{faq.q}</h3>
              <p className="mt-2 text-sm text-stone-600">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-16 text-center">
        <p className="text-sm text-stone-600">Need a custom plan for your organization?</p>
        <Button asChild variant="outline" className="mt-3 border-stone-200">
          <a href="mailto:sales@gessa.art">Contact sales</a>
        </Button>
      </div>
    </div>
  );
}
