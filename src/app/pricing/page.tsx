"use client";
import { useState } from "react";
import { useAuth, useSession } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PACKAGES = [
  {
    id: "starter",
    name: "Starter",
    credits: 5,
    price: 10,
    popular: false,
    savings: "",
  },
  {
    id: "creator",
    name: "Creator",
    credits: 20,
    price: 30,
    popular: true,
    savings: "Save $10",
  },
  {
    id: "studio",
    name: "Studio",
    credits: 50,
    price: 60,
    popular: false,
    savings: "Save $40",
  },
];

export default function PricingPage() {
  const { getToken, isSignedIn } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  const handlePurchase = async (packageId: string) => {
    if (!isSignedIn) {
      toast.error("Please sign in first");
      return;
    }

    setLoading(packageId);
    try {
        const token = await getToken();
      const res = await fetch("https://dev.gessa.art/stripe/checkout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ packageId }),
      });
      const data = await res.json();
      if (data.ok && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error?.message || "Checkout failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl text-stone-900">Pricing</h1>
        <p className="mt-4 text-lg text-stone-600">Simple, pay-as-you-go pricing. Buy credits and restore your artwork.</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.id}
            className={`relative rounded-sm border p-6 ${
              pkg.popular
                ? "border-stone-900 bg-stone-50"
                : "border-stone-200 bg-white"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-stone-900 px-3 py-1 text-xs text-stone-50">
                Most popular
              </div>
            )}
            <div className="text-sm text-stone-500">{pkg.name}</div>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-serif text-stone-900">${pkg.price}</span>
            </div>
            <div className="mt-1 text-sm text-stone-600">{pkg.credits} credits</div>
            {pkg.savings && (
              <div className="mt-1 text-xs text-stone-500">{pkg.savings}</div>
            )}
            <ul className="mt-4 space-y-2">
              <li className="flex items-center gap-2 text-sm text-stone-600">
                <Check className="h-4 w-4 text-stone-400" /> {pkg.credits} artwork restorations
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-600">
                <Check className="h-4 w-4 text-stone-400" /> High-resolution 1024×1024 PNG
              </li>
              <li className="flex items-center gap-2 text-sm text-stone-600">
                <Check className="h-4 w-4 text-stone-400" /> Credits never expire
              </li>
            </ul>
            <Button
              onClick={() => handlePurchase(pkg.id)}
              disabled={loading === pkg.id}
              className={`mt-6 w-full ${
                pkg.popular
                  ? "bg-stone-900 text-stone-50 hover:bg-stone-800"
                  : "border-stone-200 text-stone-700 hover:bg-stone-100"
              }`}
              variant={pkg.popular ? "default" : "outline"}
            >
              {loading === pkg.id ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
              ) : (
                "Buy credits"
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-sm border border-stone-200 bg-stone-50 p-6 text-center">
        <h3 className="font-serif text-xl text-stone-900">Pay as you go</h3>
        <p className="mt-2 text-stone-600">Don't want to buy a package? Pay $1.00 per restoration.</p>
        <p className="mt-1 text-sm text-stone-500">Minimum balance: 1 credit. Top up any time.</p>
      </div>
    </div>
  );
}
