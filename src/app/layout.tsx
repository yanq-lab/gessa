import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "Gessa — Faithful digital presentation for physical artworks",
  description: "Gessa helps artists turn imperfect photos of physical artworks into refined digital presentations and personal online galleries.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <Providers><Navbar /><main className="flex-1">{children}</main><Footer /></Providers>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
