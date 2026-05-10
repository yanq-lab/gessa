-- Create User table for credit system
CREATE TABLE IF NOT EXISTS "User" (
  id TEXT PRIMARY KEY,
  email TEXT,
  credits INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ DEFAULT NOW()
);

-- Add userId to Artwork if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Artwork' AND column_name = 'userId') THEN
    ALTER TABLE "Artwork" ADD COLUMN "userId" TEXT;
  END IF;
END $$;

-- Create index on userId
CREATE INDEX IF NOT EXISTS idx_artwork_user_id ON "Artwork"("userId");

-- Migrate existing data: copy userId from ArtistProfile
UPDATE "Artwork" a
SET "userId" = p."userId"
FROM "ArtistProfile" p
WHERE a."artistProfileId" = p.id
  AND a."userId" IS NULL;

-- Enable RLS on User table
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

-- User can only read/update their own record
CREATE POLICY "User read own" ON "User"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "User update own" ON "User"
  FOR UPDATE USING (auth.uid() = id);

-- Allow inserts (for new user creation)
CREATE POLICY "User insert" ON "User"
  FOR INSERT WITH CHECK (true);
