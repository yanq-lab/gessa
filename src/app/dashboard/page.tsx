"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, ImageIcon, ExternalLink, Copy, Gift, Key, CreditCard, BarChart3, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { DashboardSkeleton } from "@/components/loading-skeletons";

interface Artwork { id: string; title: string; year: string | null; medium: string | null; status: string; publishedImageUrl: string | null; originalImageUrl: string | null; createdAt: string | null; }
interface Profile { id: string; slug: string | null; displayName: string | null; referralCode: string | null; transformationCredits: number; }
interface Subscription { id: string; status: string; tier: string; currentPeriodStart: string; currentPeriodEnd: string; }
interface TierLimit { tier: string; name: string; monthlyTransformations: number; customDomains: boolean; apiAccess: boolean; priceMonthlyCents: number; }
interface ApiKeyRow { id: string; name: string; keyPrefix: string; scopes: string[]; lastUsedAt: string | null; isActive: boolean; createdAt: string; }
interface ReferralRow { id: string; refereeId: string; status: string; transformationBonus: number; referredAt: string; }

type Tab = "artworks" | "subscription" | "apikeys" | "referrals";

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("artworks");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [tierLimits, setTierLimits] = useState<TierLimit[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKeyRow[]>([]);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [usage, setUsage] = useState({ used: 0, credits: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const loadAll = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { router.push("/auth/signin"); return; }
    const uid = session.user.id;

    const { data: pf } = await supabase.from("ArtistProfile").select("*").eq("userId", uid).single();
    setProfile(pf);

    const { data: aw } = await supabase.from("Artwork").select("id, title, year, medium, status, publishedImageUrl, originalImageUrl, createdAt").eq("artistProfileId", pf?.id).order("createdAt", { ascending: false });
    setArtworks(aw ?? []);

    const { data: sub } = await supabase.from("Subscription").select("*").eq("userId", uid).order("createdAt", { ascending: false }).limit(1).single();
    setSubscription(sub);

    const { data: tiers } = await supabase.from("TierLimit").select("*").order("priceMonthlyCents", { ascending: true });
    setTierLimits(tiers ?? []);

    const { data: keys } = await supabase.from("ApiKey").select("*").eq("userId", uid).order("createdAt", { ascending: false });
    setApiKeys(keys ?? []);

    const { data: refs } = await supabase.from("Referral").select("*").eq("referrerId", uid).order("referredAt", { ascending: false });
    setReferrals(refs ?? []);

    const periodStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: usedCount } = await supabase.from("TransformationUsage").select("*", { count: "exact", head: true }).eq("userId", uid).gte("periodStart", periodStart);
    setUsage({ used: usedCount ?? 0, credits: pf?.transformationCredits ?? 0 });

    setLoading(false);
  }, [router]);

  useEffect(() => { loadAll(); const { data: listener } = supabase.auth.onAuthStateChange(() => loadAll()); return () => listener.subscription.unsubscribe(); }, [loadAll]);

  const createApiKey = async () => {
    const prefix = "gk_live_";
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const keyBody = Array.from(randomBytes, b => b.toString(16).padStart(2, "0")).join("");
    const key = prefix + keyBody;
    const { error } = await supabase.from("ApiKey").insert({
      userId: (await supabase.auth.getUser()).data.user?.id,
      name: "Key " + (apiKeys.length + 1),
      key,
      keyPrefix: key.slice(0, 16) + "...",
      scopes: ["artworks:read", "artworks:write", "images:transform"],
    });
    if (error) { toast.error("Failed to create key"); return; }
    toast.success("API key created");
    loadAll();
  };

  const revokeApiKey = async (keyId: string) => {
    await supabase.from("ApiKey").update({ isActive: false }).eq("id", keyId);
    toast.success("API key revoked");
    loadAll();
  };

  const copyReferralLink = () => {
    if (!profile?.referralCode) return;
    navigator.clipboard.writeText("https://gessa.art/auth/register?ref=" + profile.referralCode).then(() => toast.success("Referral link copied"));
  };

  const toggleSelect = (artworkId: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(artworkId)) next.delete(artworkId); else next.add(artworkId); return next; });
  };

  const selectAll = () => {
    if (selectedIds.size === artworks.length) { setSelectedIds(new Set()); return; }
    setSelectedIds(new Set(artworks.map(a => a.id)));
  };

  const deleteArtworks = async (ids: string[]) => {
    if (!ids.length) return;
    setDeleting(true);
    let failed = 0;
    for (const id of ids) {
      const artwork = artworks.find(a => a.id === id);
      if (!artwork) continue;
      try {
        // Delete from Storage (both original and published)
        for (const url of [artwork.originalImageUrl, artwork.publishedImageUrl]) {
          if (!url) continue;
          try {
            const u = new URL(url);
            const parts = u.pathname.split("/");
            const bucketIdx = parts.indexOf("artworks");
            if (bucketIdx >= 0) {
              const p = parts.slice(bucketIdx + 1).join("/");
              await supabase.storage.from("artworks").remove([p]);
            }
          } catch { /* ignore per-file errors */ }
        }
        // Delete image versions then artwork
        await supabase.from("ArtworkImageVersion").delete().eq("artworkId", id);
        await supabase.from("Artwork").delete().eq("id", id);
      } catch { failed++; }
    }
    setDeleting(false);
    setSelectedIds(new Set());
    if (failed > 0) toast.error(`${failed} artwork(s) failed to delete`);
    else toast.success(`${ids.length} artwork(s) deleted`);
    loadAll();
  };

  if (loading) return <DashboardSkeleton />;

  const currentTier = tierLimits.find(t => t.tier === (subscription?.tier || "free")) || tierLimits[0];

  // Filter and sort artworks
  const filteredArtworks = artworks
    .filter(artwork => {
      if (statusFilter !== "all" && artwork.status !== statusFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return artwork.title.toLowerCase().includes(query) ||
               (artwork.year?.toLowerCase().includes(query) ?? false) ||
               (artwork.medium?.toLowerCase().includes(query) ?? false);
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        case "oldest": return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        case "name": return a.title.localeCompare(b.title);
        default: return 0;
      }
    });

  const totalPages = Math.ceil(filteredArtworks.length / itemsPerPage);
  const paginatedArtworks = filteredArtworks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "artworks", label: "Artworks", icon: ImageIcon },
    { id: "subscription", label: "Subscription", icon: CreditCard },
    { id: "apikeys", label: "API Keys", icon: Key },
    { id: "referrals", label: "Referrals", icon: Gift },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="font-serif text-3xl text-stone-900">Dashboard</h1><p className="mt-1 text-sm text-stone-600">Manage your artworks, subscription, and settings.</p></div>
        <Button asChild className="bg-stone-900 text-stone-50 hover:bg-stone-800"><Link href="/artwork/upload"><Upload className="mr-2 h-4 w-4" />Upload artwork</Link></Button>
      </div>

      <div className="mb-8 flex border-b border-stone-200 overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={"flex items-center gap-2 px-4 py-2.5 text-sm border-b-2 transition-colors whitespace-nowrap " + (activeTab === tab.id ? "border-stone-900 text-stone-900" : "border-transparent text-stone-500 hover:text-stone-700")}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === "artworks" && (<>
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Total artworks</p><p className="mt-1 font-serif text-3xl text-stone-900">{artworks.length}</p></CardContent></Card>
          <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Published</p><p className="mt-1 font-serif text-3xl text-stone-900">{artworks.filter(a => a.status === "published").length}</p></CardContent></Card>
          <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Transformations</p><p className="mt-1 font-serif text-3xl text-stone-900">{usage.used} / {currentTier?.monthlyTransformations || 3}</p></CardContent></Card>
        </div>

        {artworks.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <input
              type="text"
              placeholder="Search artworks..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-stone-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700"
            >
              <option value="all">All statuses</option>
              <option value="uploaded">Uploaded</option>
              <option value="processing">Processing</option>
              <option value="ready">Ready</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
            
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-9 rounded-md border border-stone-200 bg-white px-3 py-1 text-sm text-stone-700"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="name">Name (A-Z)</option>
            </select>
            
            <span className="text-xs text-stone-500">{filteredArtworks.length} artwork{filteredArtworks.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {artworks.length > 0 && (
          <div className="mb-3 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-stone-500 cursor-pointer select-none">
              <input type="checkbox" checked={selectedIds.size === artworks.length && artworks.length > 0} onChange={selectAll} className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400" />
              Select all
            </label>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-stone-500">{selectedIds.size} selected</span>
                <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="border-stone-200 text-xs h-7"><X className="h-3 w-3 mr-1" />Clear</Button>
                <Button variant="outline" size="sm" onClick={() => deleteArtworks(Array.from(selectedIds))} disabled={deleting} className="border-red-200 text-red-600 hover:bg-red-50 text-xs h-7">
                  <Trash2 className="h-3 w-3 mr-1" />{deleting ? "Deleting..." : "Delete selected"}
                </Button>
              </div>
            )}
          </div>
        )}

        <Card className="border-stone-200 shadow-none"><CardContent className="pt-6">
          {artworks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center"><ImageIcon className="h-8 w-8 text-stone-400" strokeWidth={1.5} /><p className="mt-3 text-sm text-stone-600">No artworks yet.</p><Button asChild variant="link" className="mt-2 text-stone-900"><Link href="/artwork/upload">Upload your first artwork</Link></Button></div>
          ) : filteredArtworks.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center"><p className="text-sm text-stone-600">No artworks match your filters.</p><Button variant="link" className="mt-2 text-stone-900" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>Clear filters</Button></div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {paginatedArtworks.map(artwork => (
                  <div key={artwork.id} className="group flex flex-col gap-2 relative">
                    <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-stone-200 bg-stone-100">
                      <Link href={"/artwork/review?id=" + artwork.id}>
                        {artwork.publishedImageUrl || artwork.originalImageUrl ? (
                          <img src={artwork.publishedImageUrl || artwork.originalImageUrl || ""} alt={artwork.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                        ) : (<div className="flex h-full items-center justify-center"><ImageIcon className="h-6 w-6 text-stone-300" strokeWidth={1.5} /></div>)}
                      </Link>
                      <div className="absolute left-2 top-2"><input type="checkbox" checked={selectedIds.has(artwork.id)} onChange={() => toggleSelect(artwork.id)} className="h-4 w-4 rounded border-stone-300 text-stone-900 focus:ring-stone-400 bg-white/80" /></div>
                      <div className="absolute right-2 top-2"><Badge variant="secondary" className="bg-white/90 text-[10px] font-normal text-stone-700">{artwork.status}</Badge></div>
                      <button onClick={() => deleteArtworks([artwork.id])} disabled={deleting} className="absolute right-2 bottom-2 rounded-full bg-white/90 p-1.5 text-stone-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                    <Link href={"/artwork/review?id=" + artwork.id}><p className="text-sm font-medium text-stone-900">{artwork.title}</p><p className="text-xs text-stone-500">{artwork.year} {artwork.medium && "· " + artwork.medium}</p></Link>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="border-stone-200 text-xs h-8">Previous</Button>
                  <span className="text-sm text-stone-600">Page {currentPage} of {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="border-stone-200 text-xs h-8">Next</Button>
                </div>
              )}
            </>
          )}
        </CardContent></Card>
      </>)}

      {activeTab === "subscription" && (
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-none"><CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-stone-500">Current plan</p>
                <p className="mt-1 font-serif text-2xl text-stone-900 capitalize">{subscription?.tier || "Free"}</p>
                <p className="mt-1 text-sm text-stone-600">{usage.used} / {currentTier?.monthlyTransformations || 3} transformations this month</p>
                {usage.credits > 0 && <p className="text-sm text-stone-500">{usage.credits} bonus credits from referrals</p>}
              </div>
              <BarChart3 className="h-8 w-8 text-stone-400" />
            </div>
            <div className="mt-4 h-2 w-full rounded-full bg-stone-100">
              <div className="h-2 rounded-full bg-stone-900" style={{ width: Math.min(100, (usage.used / (currentTier?.monthlyTransformations || 3)) * 100) + "%" }} />
            </div>
            {usage.used >= (currentTier?.monthlyTransformations || 3) && (
              <div className="mt-4 rounded-sm bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-800">
                  You have used all your monthly transformations. 
                  {currentTier?.tier === "free" ? (
                    <Link href="/pricing" className="underline font-medium">Upgrade your plan</Link>
                  ) : (
                    <span>Extra transformations are available at $0.80 each.</span>
                  )}
                </p>
              </div>
            )}
            {usage.used >= (currentTier?.monthlyTransformations || 3) * 0.8 && usage.used < (currentTier?.monthlyTransformations || 3) && (
              <div className="mt-4 rounded-sm bg-blue-50 border border-blue-200 p-3">
                <p className="text-sm text-blue-800">
                  You have used {Math.round((usage.used / (currentTier?.monthlyTransformations || 3)) * 100)}% of your monthly quota.
                </p>
              </div>
            )}
          </CardContent></Card>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {tierLimits.filter(t => t.tier !== "free").map(tier => (
              <Card key={tier.tier} className={"border-stone-200 shadow-none " + (subscription?.tier === tier.tier ? "bg-stone-50 ring-1 ring-stone-300" : "")}>
                <CardContent className="pt-6">
                  <p className="font-serif text-lg text-stone-900 capitalize">{tier.name}</p>
                  <p className="mt-1 text-2xl font-semibold text-stone-900">${(tier.priceMonthlyCents / 100).toFixed(0)}<span className="text-sm font-normal text-stone-500">/mo</span></p>
                  <ul className="mt-4 space-y-1.5 text-sm text-stone-600">
                    <li>{tier.monthlyTransformations} transformations/mo</li>
                    {tier.customDomains && <li>Custom domain</li>}
                    {tier.apiAccess && <li>API access</li>}
                  </ul>
                  {subscription?.tier === tier.tier ? (
                    <Button disabled className="mt-4 w-full bg-stone-900 text-stone-50">Current plan</Button>
                  ) : (
                    <Button asChild className="mt-4 w-full bg-stone-900 text-stone-50 hover:bg-stone-800"><Link href="/settings/billing">Upgrade</Link></Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === "apikeys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-600">Create API keys for AI agent access to your gallery.</p>
            <Button onClick={createApiKey} className="bg-stone-900 text-stone-50 hover:bg-stone-800">Create API key</Button>
          </div>
          {apiKeys.length === 0 ? (
            <Card className="border-stone-200 shadow-none"><CardContent className="pt-6 py-12 text-center"><Key className="mx-auto h-8 w-8 text-stone-400" /><p className="mt-3 text-sm text-stone-600">No API keys yet.</p></CardContent></Card>
          ) : apiKeys.map(key => (
            <Card key={key.id} className="border-stone-200 shadow-none"><CardContent className="pt-6 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-stone-900">{key.name}</p>
                <p className="text-xs text-stone-500 font-mono">{key.keyPrefix}</p>
                <div className="mt-1 flex gap-1.5">{(key.scopes || []).map((s: string) => <Badge key={s} variant="secondary" className="text-[10px] bg-stone-100">{s}</Badge>)}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className={key.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>{key.isActive ? "Active" : "Revoked"}</Badge>
                {key.isActive && <Button variant="outline" size="sm" onClick={() => revokeApiKey(key.id)} className="border-stone-200 text-red-600 hover:bg-red-50 text-xs h-7">Revoke</Button>}
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {activeTab === "referrals" && (
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-none"><CardContent className="pt-6">
            <p className="text-sm text-stone-500">Your referral link</p>
            <div className="mt-2 flex items-center gap-3">
              <code className="flex-1 rounded-sm border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700 break-all">{"https://gessa.art/signup?ref=" + (profile?.referralCode || "...")}</code>
              <Button variant="outline" size="sm" onClick={copyReferralLink} className="border-stone-200"><Copy className="h-4 w-4" /></Button>
            </div>
            <p className="mt-2 text-xs text-stone-500">Share this link. When someone signs up and subscribes, you both earn transformation credits.</p>
          </CardContent></Card>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Referred</p><p className="mt-1 font-serif text-3xl text-stone-900">{referrals.length}</p></CardContent></Card>
            <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Bonus credits</p><p className="mt-1 font-serif text-3xl text-stone-900">{usage.credits}</p></CardContent></Card>
            <Card className="border-stone-200 shadow-none"><CardContent className="pt-6"><p className="text-sm text-stone-500">Per referral</p><p className="mt-1 font-serif text-3xl text-stone-900">+5</p></CardContent></Card>
          </div>
        </div>
      )}
    </div>
  );
}
