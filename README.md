# AI Odyssey × CodeHunt

> Decode the clues. Investigate the unknown. **Crack the case.**

The official full-stack website for **AI Odyssey × CodeHunt** — a technical AI
treasure hunt and crime-investigation event hosted by **EMEL Club, CSE-Allied,
MVSR Engineering College, Hyderabad**, under **SHIKHARA '26** as part of
**SAMAVARTHAN '26**.

- Cinematic cyber-investigation visual theme (dark navy + cyan/violet, animated
  grid, scanlines, drifting particles, glassmorphism).
- Two investigation divisions with a server-authoritative case wheel.
- Public **real-time leaderboard** driven directly from the database.
- Secure admin **Investigation Control Room** for CSV upload and manual edits.
- Supabase for Auth + Postgres + Realtime; row-level security enforces every
  policy on the database side.

---

## Stack

| Layer      | Tech                                                     |
| ---------- | -------------------------------------------------------- |
| Build      | Vite + TypeScript                                        |
| UI         | React 18, Tailwind CSS, framer-motion, lucide-react      |
| Backend    | Supabase (PostgreSQL + Auth + Realtime)                  |
| CSV parse  | PapaParse                                                |
| Routing    | react-router-dom                                         |

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure env — see "Backend setup" below
cp .env.example .env
#   -> fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Apply the database schema (see "Backend setup")

# 4. Run
npm run dev          # http://localhost:5173
```

Production build:

```bash
npm run build
npm run preview
```

The UI still boots with no backend configured — a yellow banner appears across
the top and the admin flows show "Supabase is not configured". Everything
except case assignment, authenticated admin actions, and real database reads
remains visible so you can review the design offline.

---

## Backend setup (Supabase)

### 1. Create the project

1. Go to <https://supabase.com> → **New project**.
2. Copy the **Project URL** and **anon public key** from
   *Project Settings → API* into `.env`:

   ```env
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-public-key>
   ```

   > The anon key is safe for the browser. **Never** ship the `service_role`
   > key — it bypasses Row-Level Security.

### 2. Apply the schema

Open the Supabase SQL editor and paste the contents of
[`supabase/schema.sql`](./supabase/schema.sql). It creates:

- `profiles` (role store: `admin` | `coordinator`), auto-populated on signup.
- `team_assignments` with unique constraints that enforce **one case per team
  per track** and **one team per case per track** — at the database level.
- `assign_case(team, track)` — a `SECURITY DEFINER` RPC that atomically picks a
  random still-available case for a team, or returns the team's existing
  assignment. This is the only path the frontend can take to get a case; the
  rule cannot be bypassed by replaying the request.
- `results` (public competition rows) with a one-row-per-team-per-track unique
  index.
- `leaderboard_public` view exposing only safe columns.
- Row-Level Security:
  - Public may **read** `results` and `leaderboard_public` (and
    `team_assignments` so dashboards can echo their own assignment).
  - Only users whose `profiles.role` is `admin` or `coordinator` may
    `INSERT`/`UPDATE`/`DELETE` on `results`.
  - `team_assignments` has no write policy — all writes flow through
    `assign_case()`.
- Realtime publication on `results` so the leaderboard subscribes to changes.
- Demo seed rows clearly tagged `is_demo = true` and prefixed with `DEMO ·`.

### 3. Create the reserved `admin` account

The login UI accepts a **username** or an email. The reserved username
`admin` is a fixed convention that maps to the email
`admin@aiodyssey.local` — Supabase Auth itself always authenticates by
email. The map lives in `src/lib/auth.tsx` (`USERNAME_EMAIL_MAP`) so no
email directory is exposed.

1. In the Supabase dashboard → **Authentication → Users → Add user**.
2. Use **email = `admin@aiodyssey.local`** and choose a strong password of
   your own. Tick "Auto confirm user" so no email verification is required.
   The password is **never** stored anywhere outside Supabase Auth.
3. In the SQL editor, promote them and set the display name:

   ```sql
   update public.profiles
      set role = 'admin', full_name = 'admin'
    where email = 'admin@aiodyssey.local';
   ```

4. Sign in at `/login` with username `admin` + your password.

> **Coordinators** sign in with their own real email address, not with a
> reserved username. Create them in Supabase Auth exactly as above, then
> `update public.profiles set role = 'coordinator' where email = '…';`.
>
> **Never** promote a role via the client. Role elevation is server-side
> only (SQL editor or an Edge Function with the service-role key). The
> `profiles_self_update` RLS policy explicitly rejects any client-side
> attempt to change `role`, `email`, or `created_at`.

### 3b. Apply the security migration (one-time)

If you set up this project before the `profiles_self_update` policy was
tightened, run the migration at
[`supabase/migrations/0001_tighten_profiles_update.sql`](./supabase/migrations/0001_tighten_profiles_update.sql).
It is idempotent and safe to re-run. Fresh installs picked up from
`supabase/schema.sql` are already on the tightened policy.

Verify it worked by signing in as a non-admin and running:

```sql
update public.profiles set role = 'admin' where id = auth.uid();
-- Expected: `new row violates row-level security policy for table "profiles"`
```

### Role matrix

| Capability                             | Public | Coordinator | Admin |
| -------------------------------------- | :----: | :---------: | :---: |
| View leaderboard                       |   ✅   |     ✅      |  ✅   |
| Spin the wheel (assigns a case)        |   ✅   |     ✅      |  ✅   |
| Upload CSV results                     |   ❌   |     ✅      |  ✅   |
| Add / edit / delete a result manually  |   ❌   |     ✅      |  ✅   |
| Change user roles                      |   ❌   |     ❌      |  ✅*  |

\* via Supabase SQL editor; the website intentionally doesn't expose role
management to minimise blast radius.

---

## Project layout

```
.
├── index.html
├── public/
│   ├── favicon.svg
│   ├── sample-results.csv              # download-ready CSV template
│   └── cases/
│       ├── junior/   case-01.pdf … case-08.pdf   (you add these)
│       └── senior/   case-01.pdf … case-10.pdf
├── src/
│   ├── main.tsx                         Entry point
│   ├── App.tsx                          Routes
│   ├── index.css                        Tailwind + theme + backdrop
│   ├── lib/
│   │   ├── supabase.ts                  Client (safe stub when unconfigured)
│   │   ├── types.ts                     Shared TS types
│   │   ├── cases.ts                     Case titles + pdfPath lookup
│   │   └── auth.tsx                     Auth + profile context
│   ├── components/
│   │   ├── Backdrop.tsx                 Grid, scanline, particles
│   │   ├── Nav.tsx / Footer.tsx / Logo.tsx
│   │   ├── Toast.tsx                    Toast context + hook
│   │   ├── Wheel.tsx                    SVG case wheel + rotation math
│   │   ├── RequireAdmin.tsx             Route guard
│   │   └── NotConfiguredBanner.tsx
│   ├── admin/
│   │   ├── useResults.ts                Live-syncing results hook
│   │   ├── csv.ts                       Parse + validate + template
│   │   ├── ResultsUploader.tsx          CSV upload + preview + commit
│   │   └── ResultsEditor.tsx            CRUD table + modal editor
│   └── pages/
│       ├── Landing.tsx                  Hero + marketing + CTAs
│       ├── Tracks.tsx                   Junior vs Advanced
│       ├── Dashboard.tsx                Wheel + assignment flow
│       ├── Leaderboard.tsx              Public, realtime
│       ├── Login.tsx                    Admin / coordinator sign-in
│       ├── Admin.tsx                    Investigation Control Room
│       └── NotFound.tsx
└── supabase/
    └── schema.sql                       Tables, RLS, RPC, realtime, seed
```

---

## Case PDFs — how to add or replace them

1. Drop files into `public/cases/junior/` or `public/cases/senior/`.
2. File names **must** be `case-NN.pdf`, zero-padded (`case-01.pdf` …
   `case-10.pdf`).
3. The dashboard's "Open case brief" button opens the file in a new tab.
4. To re-point or rename a case, edit `src/lib/cases.ts` — `pdfPath` is the
   single source of truth.

The site displays sensible fallback titles for every case out of the box, so
missing PDFs do not break the UI — they just 404 when opened, which signals to
coordinators that a brief still needs uploading.

---

## Importing results (CSV)

Each team can be assigned **up to five cases per track**, and the
leaderboard ranks by `cases_solved` first, then total score of solved cases,
then completion time. One CSV row = one (team × track × case).

CSV template (`public/sample-results.csv`, also downloadable from the admin
dashboard):

```csv
team_name,track,case_number,score,completion_time,status,is_solved
Null Pointer,senior,1,100,2026-02-14T13:42:00Z,Cleared,true
Null Pointer,senior,2,95,2026-02-14T14:15:00Z,Cleared,true
GhostProtocol,senior,1,90,2026-02-14T14:11:00Z,Cleared,true
Sentinel,junior,3,100,2026-02-14T13:58:00Z,Cleared,true
Watchdogs,junior,1,0,,In progress,false
```

- Required columns: `team_name`, `track`, `case_number`, `score`.
- Optional: `completion_time` (ISO 8601), `status` (free text, ≤ 80 chars),
  `is_solved` (defaults to `false` — only solved rows count on the board).
- `track` must be `junior` or `senior` (case-insensitive).
- `case_number` is an integer `1..5`.
- `score` is an integer `0..100000`.
- `is_solved` accepts `true` / `false` / `yes` / `no` / `1` / `0`.
- Duplicate (team + track + case) rows **update** the existing record instead
  of inserting a new one, so a corrected spreadsheet can be re-uploaded safely.
- Invalid rows are reported in a preview table and **never saved** — the
  administrator sees exactly what was skipped and why before confirming.
- Duplicate (team + track + case) tuples within the uploaded file are also
  flagged; the first occurrence counts, the rest are skipped so unintended
  overwrites don't silently clobber a correct row.

The public leaderboard updates **automatically** on commit via Supabase's
Postgres change feed. There's no code change required to publish results.

---

## Security notes

- No admin credentials, service-role keys, or passwords are hardcoded. The
  `.env` file holds only the public anon key.
- Row-Level Security is the enforcement layer. Even if a malicious client has
  the anon key and crafts raw REST calls, the database refuses writes unless
  `auth.uid()` resolves to a `profiles` row with role `admin` or `coordinator`.
- `assign_case()` is `SECURITY DEFINER` and uses a `FOR UPDATE` lock plus
  unique indexes to make case assignment atomic — two teams can't be dealt the
  same case, and the same team can't collect a second case by replaying the
  request.
- CSV upload validates on the client to give a fast preview, but the only
  thing that actually hits the database is the typed, bounded upsert the
  server accepts through RLS. The server has the final word.
- Realtime subscriptions deliver change notifications over an authenticated
  websocket; the leaderboard view exposes only safe columns.

---

## Deployment

### Vercel (recommended)

A ready-to-use [`vercel.json`](./vercel.json) ships in the repo — it sets
the Vite framework preset, SPA rewrites so React Router handles deep links,
long-lived immutable caching for `/assets/*`, and sensible security headers
(`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`Permissions-Policy`).

1. Push this repo to GitHub.
2. On <https://vercel.com> → **Add New → Project** → import the repo.
3. Framework preset auto-detects as **Vite**. Leave the build/output as-is.
4. Under **Environment Variables**, add for **Production** *and* **Preview**:

   ```
   VITE_SUPABASE_URL        = https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY   = <anon-public-key>
   VITE_SHOW_DEMO_BANNER    = false      # optional
   ```

5. Click **Deploy**. Every push to `main` ships to production; every PR gets
   a preview URL.
6. In the Supabase dashboard → **Authentication → URL configuration**, add
   your Vercel domain (and any preview domains) to **Site URL** / **Redirect
   URLs** so auth callbacks succeed.

### Other static hosts

Any static host works for the frontend (Netlify, Cloudflare Pages, GitHub
Pages, S3 + CloudFront). Build with `npm run build`, serve `dist/`, and add
a SPA fallback. For Netlify use `public/_redirects`:

```
/*    /index.html   200
```

Supabase is already managed; no server to run.

---

## Credits

Designed and engineered for EMEL Club, CSE-Allied, MVSR Engineering College,
under SHIKHARA '26 and SAMAVARTHAN '26.
