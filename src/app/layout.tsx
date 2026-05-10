import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Gessa — AI Artwork Restoration",
  description: "Transform photos of physical artworks into professional digital reproductions with AI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "pk_test_c3RlYWR5LWNoaW1wLTM5LmNsZXJrLmFjY291bnRzLmRldiQ"}>
      <html lang="en">
        <body className="min-h-screen flex flex-col">
          <Providers><Navbar /><main className="flex-1">{children}</main><Footer /></Providers>
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
