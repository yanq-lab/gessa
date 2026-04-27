-- Gessa MVP — Supabase Database Initialization

-- 1. ArtistProfile
CREATE TABLE IF NOT EXISTS "ArtistProfile" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "userId" UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "displayName" TEXT,
  slug TEXT UNIQUE,
  bio TEXT,
  location TEXT,
  "websiteUrl" TEXT,
  "instagramUrl" TEXT,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "ArtistProfile" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles" ON "ArtistProfile" FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Users insert own profile" ON "ArtistProfile" FOR INSERT TO authenticated WITH CHECK (auth.uid() = "userId");
CREATE POLICY "Users update own profile" ON "ArtistProfile" FOR UPDATE TO authenticated USING (auth.uid() = "userId") WITH CHECK (auth.uid() = "userId");

-- 2. Artwork
CREATE TABLE IF NOT EXISTS "Artwork" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "artistProfileId" UUID NOT NULL REFERENCES "ArtistProfile"(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  year TEXT,
  medium TEXT,
  dimensions TEXT,
  description TEXT,
  price TEXT,
  "availabilityStatus" TEXT DEFAULT 'available',
  "originalImageUrl" TEXT,
  "restoredImageUrl" TEXT,
  "publishedImageUrl" TEXT,
  status TEXT DEFAULT 'draft',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "Artwork" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published artworks" ON "Artwork" FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Artists read own artworks" ON "Artwork" FOR SELECT TO authenticated USING ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid()));
CREATE POLICY "Artists insert own artworks" ON "Artwork" FOR INSERT TO authenticated WITH CHECK ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid()));
CREATE POLICY "Artists update own artworks" ON "Artwork" FOR UPDATE TO authenticated USING ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid())) WITH CHECK ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid()));
CREATE POLICY "Artists delete own artworks" ON "Artwork" FOR DELETE TO authenticated USING ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid()));

-- 3. Inquiry
CREATE TABLE IF NOT EXISTS "Inquiry" (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "artistProfileId" UUID NOT NULL REFERENCES "ArtistProfile"(id) ON DELETE CASCADE,
  "artworkId" UUID REFERENCES "Artwork"(id) ON DELETE SET NULL,
  "senderName" TEXT NOT NULL,
  "senderEmail" TEXT NOT NULL,
  message TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE "Inquiry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create inquiry" ON "Inquiry" FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Artists read own inquiries" ON "Inquiry" FOR SELECT TO authenticated USING ("artistProfileId" IN (SELECT id FROM "ArtistProfile" WHERE "userId" = auth.uid()));

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_artwork_artist ON "Artwork"("artistProfileId");
CREATE INDEX IF NOT EXISTS idx_artwork_status ON "Artwork"(status);
CREATE INDEX IF NOT EXISTS idx_artwork_slug ON "Artwork"(slug);
CREATE INDEX IF NOT EXISTS idx_artist_slug ON "ArtistProfile"(slug);
CREATE INDEX IF NOT EXISTS idx_artist_user ON "ArtistProfile"("userId");
CREATE INDEX IF NOT EXISTS idx_inquiry_artist ON "Inquiry"("artistProfileId");
