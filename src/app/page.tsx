import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Image, Sparkles, Frame, Eye, Camera, Palette } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col">
      <section className="mx-auto flex w-full max-w-6xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <h1 className="max-w-3xl font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">Faithful digital presentation for physical artworks.</h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">Gessa helps artists turn imperfect photos of physical artworks into refined digital presentations and personal online galleries.</p>
        <div className="mt-10">
          <Button asChild size="lg" className="bg-stone-900 px-8 text-stone-50 hover:bg-stone-800">
            <Link href="/auth/register">Start with one artwork<ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      <section className="w-full border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">The problem</p>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            {[{icon:Camera,label:"Poor lighting"},{icon:Palette,label:"Color distortion"},{icon:Eye,label:"Shadows and glare"},{icon:Frame,label:"Crooked photos"},{icon:Image,label:"No personal gallery"}].map((item)=>(
              <div key={item.label} className="flex flex-col items-center gap-3 text-center"><item.icon className="h-6 w-6 text-stone-400" strokeWidth={1.5} /><span className="text-sm text-stone-700">{item.label}</span></div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">How it works</p>
          <div className="grid gap-12 sm:grid-cols-3">
            {[{step:"01",title:"Upload a photo",desc:"Take a photo of your artwork with any camera. Upload it to Gessa."},{step:"02",title:"Restore the artwork",desc:"Our system corrects perspective, lighting, color, and removes distractions."},{step:"03",title:"Publish a gallery page",desc:"Review the result, add details, and share your professional artwork page."}].map((item)=>(
              <div key={item.step} className="flex flex-col">
                <span className="mb-3 text-xs font-medium uppercase tracking-widest text-stone-400">{item.step}</span>
                <h3 className="font-serif text-xl text-stone-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">Before & After</p>
          <div className="grid gap-8 sm:grid-cols-2">
            <div className="flex flex-col items-center">
              <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><Camera className="mx-auto h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-2 text-sm text-stone-500">Original photo</p><p className="text-xs text-stone-400">Uneven lighting, color cast, slight angle</p></div></div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-widest text-stone-500">Before</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="relative aspect-[4/3] w-full max-w-md overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><Sparkles className="mx-auto h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-2 text-sm text-stone-500">Restored artwork</p><p className="text-xs text-stone-400">Color corrected, perspective fixed, clean presentation</p></div></div>
              </div>
              <p className="mt-4 text-xs uppercase tracking-widest text-stone-500">After</p>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">Your personal gallery</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1,2,3,4].map((i)=>(
              <div key={i} className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                <div className="absolute inset-0 flex items-center justify-center"><Frame className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>
                <div className="absolute inset-x-0 bottom-0 bg-white/90 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs text-stone-600">Artwork title</p><p className="text-xs text-stone-400">Oil on canvas, 2024</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">What artists say</p>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { quote: "Gessa saved me hours of Photoshop work. My oil paintings look like they were shot in a studio.", name: "Maria Chen", role: "Oil painter" },
              { quote: "I don't have a professional camera. Gessa made my phone photos gallery-ready in seconds.", name: "James Rivera", role: "Mixed media artist" },
              { quote: "Finally, a tool that respects the artwork. It preserves my brushstrokes instead of smoothing them out.", name: "Aiko Tanaka", role: "Watercolorist" },
            ].map((t) => (
              <div key={t.name} className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-sm font-medium text-stone-500">{t.name.split(" ").map(n => n[0]).join("")}</div>
                <p className="mb-3 font-serif text-base italic leading-relaxed text-stone-700">&ldquo;{t.quote}&rdquo;</p>
                <p className="text-sm font-medium text-stone-900">{t.name}</p>
                <p className="text-xs text-stone-500">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <p className="mb-12 text-center text-sm uppercase tracking-widest text-stone-500">Featured artworks</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: "Distant Shore", info: "Oil on canvas, 2024" },
              { title: "Morning Light", info: "Watercolor, 2023" },
              { title: "Urban Fragment #7", info: "Mixed media, 2024" },
              { title: "Untitled (Blue)", info: "Acrylic on linen, 2025" },
            ].map((a) => (
              <div key={a.title} className="group relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                <div className="absolute inset-0 flex items-center justify-center"><Frame className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>
                <div className="absolute inset-x-0 bottom-0 bg-white/90 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-xs text-stone-600">{a.title}</p><p className="text-xs text-stone-400">{a.info}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="w-full border-t border-stone-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-4 py-20 text-center sm:px-6">
          <h2 className="max-w-lg font-serif text-2xl text-stone-900 sm:text-3xl">Present your work as it deserves to be seen.</h2>
          <p className="mt-4 text-sm text-stone-600">Create your gallery today. No subscription required to start.</p>
          <div className="mt-8">
            <Button asChild size="lg" className="bg-stone-900 px-8 text-stone-50 hover:bg-stone-800"><Link href="/auth/register">Get started</Link></Button>
          </div>
        </div>
      </section>
    </div>
  );
}
