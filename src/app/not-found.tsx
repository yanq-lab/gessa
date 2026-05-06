import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center justify-center px-4 py-24 text-center">
      <h1 className="font-serif text-6xl text-stone-900">404</h1>
      <p className="mt-4 text-lg text-stone-600">Page not found</p>
      <p className="mt-2 text-sm text-stone-500">The page you are looking for does not exist or has been moved.</p>
      <div className="mt-8 flex gap-3">
        <Button asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800">
          <Link href="/">Go home</Link>
        </Button>
        <Button asChild variant="outline" className="border-stone-200">
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
