# AV PROP MISSION — Vercel + Supabase (lifetime cloud storage, live sync)

This version stores all admin data (HRs, projects, submissions, callbacks,
offers, etc.) in **Supabase Postgres** — true lifetime storage, never lost,
synced live across every device that opens the site. Deploys to **Vercel**
in one click.

## What changed vs. the old self-hosted version
- SQLite file → **Supabase Postgres** (`kv_store` table)
- Server-Sent Events → **Supabase Realtime** (works on Vercel serverless)
- `render.yaml` → `vercel.json`, with `/api/*` Vercel serverless functions
- Admin **Submissions** tab now has **Edit** and **Delete** buttons
  (in addition to *Mark as Done* and *Download*)

## 1. Create the Supabase project (free)
1. Go to https://supabase.com → **New Project**.
2. Open **SQL Editor** → paste the contents of `supabase-schema.sql` → **Run**.
   This creates the `kv_store` table, enables Realtime on it, and locks
   down direct writes via RLS.
3. Open **Project Settings → API** and copy these three values:
   - `Project URL`         → `SUPABASE_URL`
   - `anon` public key     → `SUPABASE_ANON_KEY`
   - `service_role` key    → `SUPABASE_SERVICE_ROLE_KEY` *(secret — server only)*

## 2. Deploy to Vercel
1. Push this folder to a GitHub repo (or drag-drop on Vercel).
2. In Vercel → **New Project** → import the repo.
3. Under **Environment Variables**, add the three values from step 1.3.
4. Click **Deploy**. That's it — your live URL will share data across
   every device in real time.

## 3. Run locally
```bash
npm install
SUPABASE_URL=...  SUPABASE_ANON_KEY=...  SUPABASE_SERVICE_ROLE_KEY=...  npm start
```
Open http://localhost:3000

(Or copy `.env.example` to `.env` and use a tool like `dotenv-cli`.)

## How sync works
- All localStorage keys starting with `av_` (HRs, projects, submissions,
  leads, etc.) are pushed to Supabase via `/api/kv/*`.
- Every other connected device receives the change in **~1 second** via
  Supabase Realtime — no refresh needed.
- `av_session` stays per-device, so each browser keeps its own login.
- A **Cloud** badge appears at the bottom-right of every page:
  - 🟢 green dot = live connected
  - 🔴 red dot = offline / config missing (writes still queued via REST)
  - 🟠 orange dot = syncing — click the badge to force a re-sync.

## Admin: editing / deleting submissions
In the Admin Dashboard → **Submissions** tab, every submission row now has:
- **Edit** — change title, description, or status (Pending ↔ Done)
- **Delete** — permanent delete, with confirmation
- **Mark as Done** / **Download** — unchanged

All edits/deletes sync to every other device instantly.

## Files
- `api/kv.js` — `GET /api/kv` returns the whole store
- `api/kv/[key].js` — `PUT` / `DELETE` a single key
- `api/config.js` — exposes the **public** Supabase URL + anon key to the browser
- `api/_supabase.js` — server-side admin client (uses service-role key)
- `supabase-schema.sql` — one-time DB setup
- `public/cloud.js` — browser sync shim (REST writes + Realtime updates)
- `server.js` — local dev only; Vercel uses `/api/*` directly
- `vercel.json` — minimal Vercel config
