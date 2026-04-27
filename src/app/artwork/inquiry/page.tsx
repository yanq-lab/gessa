"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

function InquiryForm() {
  const searchParams = useSearchParams();
  const artworkId = searchParams.get("artwork") || undefined;
  const artistProfileId = searchParams.get("artist") || "";
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ senderName: "", senderEmail: "", message: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!artistProfileId) { toast.error("Artist information is missing"); return; }
    setLoading(true);
    const { error } = await supabase.from("Inquiry").insert({ artistProfileId, artworkId: artworkId || null, senderName: form.senderName, senderEmail: form.senderEmail, message: form.message });
    if (error) toast.error(error.message || "Failed to send inquiry"); else { setSent(true); toast.success("Inquiry sent successfully"); }
    setLoading(false);
  };

  if (sent) return (
    <Card className="border-stone-200 shadow-none">
      <CardContent className="flex flex-col items-center py-12 text-center">
        <Send className="h-8 w-8 text-stone-400" strokeWidth={1.5} />
        <p className="mt-4 font-serif text-lg text-stone-900">Inquiry sent</p>
        <p className="mt-1 text-sm text-stone-600">The artist will receive your message and respond directly.</p>
        <Button variant="link" asChild className="mt-4 text-stone-900"><Link href="/">Return home</Link></Button>
      </CardContent>
    </Card>
  );

  return (
    <Card className="border-stone-200 shadow-none">
      <CardHeader className="space-y-1"><CardTitle className="font-serif text-2xl font-normal text-stone-900">Contact the artist</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="name">Your name *</Label><Input id="name" value={form.senderName} onChange={(e) => setForm({ ...form, senderName: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
          <div className="space-y-2"><Label htmlFor="email">Your email *</Label><Input id="email" type="email" value={form.senderEmail} onChange={(e) => setForm({ ...form, senderEmail: e.target.value })} required className="border-stone-200 focus-visible:ring-stone-400" /></div>
          <div className="space-y-2"><Label htmlFor="message">Message *</Label><Textarea id="message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required rows={5} className="border-stone-200 focus-visible:ring-stone-400 resize-none" placeholder="I'm interested in learning more about this artwork..." /></div>
          <Button type="submit" className="bg-stone-900 text-stone-50 hover:bg-stone-800" disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}{loading ? "Sending..." : "Send inquiry"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function InquiryPage() {
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-6">
      <Link href="/" className="mb-6 inline-flex items-center gap-1 text-sm text-stone-600 hover:text-stone-900"><ArrowLeft className="h-4 w-4" />Back</Link>
      <Suspense fallback={<div className="py-12 text-center text-stone-500">Loading...</div>}><InquiryForm /></Suspense>
    </div>
  );
}
