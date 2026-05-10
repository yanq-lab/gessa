"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth, SignInButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Menu, Upload, X } from "lucide-react";

export function Navbar() {
  const { isSignedIn } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-stone-200 bg-[#fafaf9]/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl tracking-tight text-stone-900">Gessa</span>
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/pricing" className="text-sm text-stone-600 hover:text-stone-900">Pricing</Link>
          {isSignedIn ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="text-stone-600 hover:text-stone-900">
                <Link href="/artwork/upload"><Upload className="mr-1.5 h-4 w-4" />Upload</Link>
              </Button>
              <UserButton />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900">Sign in</Button>
              </SignInButton>
              <SignInButton mode="modal">
                <Button size="sm" className="bg-stone-900 text-stone-50 hover:bg-stone-800">Get started</Button>
              </SignInButton>
            </div>
          )}
        </nav>
        <button 
          className="md:hidden p-2 text-stone-600 hover:text-stone-900" 
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {mobileOpen && (
        <div ref={mobileMenuRef} className="md:hidden border-t border-stone-200 bg-[#fafaf9] px-4 py-4 shadow-lg">
          <nav className="flex flex-col gap-3">
            <Link href="/pricing" className="text-sm text-stone-600" onClick={() => setMobileOpen(false)}>Pricing</Link>
            {isSignedIn ? (
              <>
                <Link href="/artwork/upload" className="flex items-center gap-2 text-sm text-stone-600" onClick={() => setMobileOpen(false)}><Upload className="h-4 w-4" />Upload artwork</Link>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <UserButton />
                </div>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <span className="text-sm text-stone-600">Sign in</span>
                </SignInButton>
                <SignInButton mode="modal">
                  <span className="text-sm text-stone-900 font-medium">Get started</span>
                </SignInButton>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
