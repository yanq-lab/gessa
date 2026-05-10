import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Image, Download, Shield } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative bg-stone-50 py-24 sm:py-32">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h1 className="font-serif text-4xl leading-tight text-stone-900 sm:text-5xl md:text-6xl">
            Transform artwork photos into
            <br />
            <span className="text-stone-600">museum-quality digital reproductions</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-stone-600">
            Upload a photo of your physical artwork. Our AI corrects perspective, lighting, and color to create a professional digital version in minutes.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild size="lg" className="bg-stone-900 text-stone-50 hover:bg-stone-800">
              <Link href="/artwork/upload">Upload artwork <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-stone-300 text-stone-700 hover:bg-stone-100">
              <Link href="/pricing">View pricing</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-stone-500">1 free restoration for new users. No credit card required.</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                <Image className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="mt-4 font-serif text-xl text-stone-900">Upload any photo</h3>
              <p className="mt-2 text-sm text-stone-600">Works with phone photos, scans, or camera images. Supports JPG, PNG, WebP up to 10MB.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                <Sparkles className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="mt-4 font-serif text-xl text-stone-900">AI restoration</h3>
              <p className="mt-2 text-sm text-stone-600">Corrects perspective distortion, uneven lighting, color cast, and glare. Crops precisely to artwork edges.</p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
                <Download className="h-6 w-6 text-stone-600" />
              </div>
              <h3 className="mt-4 font-serif text-xl text-stone-900">Download &amp; share</h3>
              <p className="mt-2 text-sm text-stone-600">Get a high-resolution 1024×1024 PNG. Perfect for portfolios, prints, or online galleries.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-200 bg-stone-50 py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <h2 className="text-center font-serif text-3xl text-stone-900">How it works</h2>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="relative">
              <div className="text-5xl font-serif text-stone-200">01</div>
              <h3 className="mt-2 font-medium text-stone-900">Upload</h3>
              <p className="mt-1 text-sm text-stone-600">Take a photo or scan of your artwork and upload it.</p>
            </div>
            <div className="relative">
              <div className="text-5xl font-serif text-stone-200">02</div>
              <h3 className="mt-2 font-medium text-stone-900">Restore</h3>
              <p className="mt-1 text-sm text-stone-600">AI processes your image in 1-2 minutes, correcting all imperfections.</p>
            </div>
            <div className="relative">
              <div className="text-5xl font-serif text-stone-200">03</div>
              <h3 className="mt-2 font-medium text-stone-900">Download</h3>
              <p className="mt-1 text-sm text-stone-600">Review the before/after comparison and download your restored image.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-serif text-3xl text-stone-900">Simple, transparent pricing</h2>
          <p className="mt-4 text-stone-600">Pay per restoration or buy credits in bulk and save.</p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="rounded-sm border border-stone-200 p-6">
              <div className="text-sm text-stone-500">Pay as you go</div>
              <div className="mt-2 text-3xl font-serif text-stone-900">$1</div>
              <div className="text-sm text-stone-600">per restoration</div>
            </div>
            <div className="rounded-sm border border-stone-200 p-6">
              <div className="text-sm text-stone-500">Starter</div>
              <div className="mt-2 text-3xl font-serif text-stone-900">$8</div>
              <div className="text-sm text-stone-600">10 credits</div>
              <div className="mt-1 text-xs text-stone-500">Save $2</div>
            </div>
            <div className="rounded-sm border border-stone-200 p-6">
              <div className="text-sm text-stone-500">Studio</div>
              <div className="mt-2 text-3xl font-serif text-stone-900">$60</div>
              <div className="text-sm text-stone-600">50 credits</div>
              <div className="mt-1 text-xs text-stone-500">Save $40</div>
            </div>
          </div>
          <Button asChild className="mt-8 bg-stone-900 text-stone-50 hover:bg-stone-800">
            <Link href="/pricing">View full pricing</Link>
          </Button>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t border-stone-200 bg-stone-50 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5 text-stone-400" />
            <span className="text-sm text-stone-600">Your images are private and secure. We never use your artwork to train AI models.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
