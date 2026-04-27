# Gessa — Cloudflare Pages + Supabase

Gessa is an AI artwork digitization and personal online gallery platform for physical artists.

## Architecture

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS v3 + shadcn/ui
- **Hosting**: Cloudflare Pages (static export)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Deployment**: GitHub Actions → Cloudflare Pages (automatic on every push to main)

## Required Accounts

| Service | Purpose |
|---------|---------|
| Supabase | Database, Auth, Storage |
| Cloudflare | Static hosting, custom domain |
| GitHub | Source control + CI/CD |

## Setup

### 1. Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste contents of `supabase/init.sql` → Run
3. Go to **Storage** → Create a new public bucket named `artworks`
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public` API Key

### 2. Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com)
2. Get your **Account ID** (from the right sidebar of any domain)
3. Create an **API Token**:
   - My Profile → API Tokens → Create Token
   - Use the "Cloudflare Pages" template
   - Permissions: `Cloudflare Pages:Edit`
   - Copy the token

### 3. GitHub Secrets

In your GitHub repository, go to **Settings → Secrets and variables → Actions → New repository secret** and add:

| Secret Name | Value |
|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `CLOUDFLARE_API_TOKEN` | Your Cloudflare API token |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare Account ID |

### 4. Deploy

Push to the `main` branch. GitHub Actions will automatically build and deploy to Cloudflare Pages.

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 5. Custom Domain (Optional)

1. Cloudflare Pages project → **Custom domains**
2. Add your domain (e.g., `gallery.yourdomain.com`)
3. Follow DNS instructions (auto-configured if domain is on Cloudflare)

## Local Development

```bash
npm install
cp .env.example .env.local
# Edit .env.local with your Supabase credentials
npm run dev
```

Visit `http://localhost:3000`

## File Structure

```
src/
  app/              # Next.js App Router pages
  components/       # Shared components + shadcn/ui
  lib/              # Supabase client + utilities
supabase/
  init.sql          # Database schema + RLS policies
.github/workflows/
  deploy.yml        # GitHub Actions CI/CD
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI | shadcn/ui (stone theme) |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Hosting | Cloudflare Pages |
| CI/CD | GitHub Actions |

## Limitations

1. **AI restoration is simulated** — The "restore" button copies the original image. Connect a real AI service (Replicate, OpenAI, etc.) for production.
2. **Static export** — No SSR. All data is fetched client-side via Supabase.
3. **No email notifications** — Inquiries are saved to the database. Add Supabase Edge Functions + Resend for email alerts.

## Project Info

**Name**: Gessa  
**Tagline**: Faithful digital presentation for physical artworks
