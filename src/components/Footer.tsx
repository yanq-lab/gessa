import Link from "next/link";
export function Footer() {
  return (
    <footer className="w-full border-t border-stone-200 bg-[#fafaf9]">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2"><span className="font-serif text-lg tracking-tight text-stone-900">Gessa</span></div>
          <p className="text-xs text-stone-500">Faithful digital presentation for physical artworks.</p>
          <div className="flex gap-6">
            <Link href="/" className="text-xs text-stone-500 hover:text-stone-900 transition-colors">Home</Link>
            <Link href="/pricing" className="text-xs text-stone-500 hover:text-stone-900 transition-colors">Pricing</Link>
            <Link href="/account" className="text-xs text-stone-500 hover:text-stone-900 transition-colors">Account</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
