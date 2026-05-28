# frame.up

A Pixieset alternative for photographers. Fastest/simplest client gallery delivery.
Built with React + Vite + Supabase. Deploys to Vercel in minutes.

---

## Stack

- **Frontend** — React 18, React Router, Vite
- **Backend / DB** — Supabase (Postgres + Auth + Storage)
- **Deploy** — Vercel

---

## Setup

### 1. Supabase project

1. Go to https://app.supabase.com and create a new project
2. In the SQL Editor, paste and run the entire contents of `supabase-schema.sql`
3. Go to **Storage → New bucket**, name it `gallery-photos`, set to **private**
4. Go to **Settings → API** and copy your **Project URL** and **anon public key**

### 2. Environment variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Run locally

```bash
npm install
npm run dev
```

App runs at http://localhost:5173

---

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

When prompted, add your env vars:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Or add them in the Vercel dashboard under Project → Settings → Environment Variables.

---

## Routes

| Route | Description |
|---|---|
| `/login` | Photographer login |
| `/signup` | Photographer signup |
| `/` | Dashboard |
| `/galleries` | All galleries |
| `/galleries/new` | Create gallery + upload photos |
| `/galleries/:id` | Manage a gallery |
| `/store` | Store (coming soon) |
| `/g/:slug` | **Public client gallery** |

---

## Key features (MVP)

- ✅ Photographer auth (signup / login / logout)
- ✅ Create galleries with name, client name, password, expiry date
- ✅ Upload photos to Supabase Storage
- ✅ Signed URL delivery (no public exposure)
- ✅ Client-facing gallery at `/g/:slug`
- ✅ Password-protected galleries
- ✅ Client favouriting (anonymous, session-based)
- ✅ Download all photos
- ✅ Lightbox photo viewer
- ✅ Gallery analytics (view count)
- ✅ Activate / deactivate galleries
- ✅ Delete galleries and individual photos

## Coming next

- [ ] Stripe billing (Starter $19/mo, Pro $39/mo)
- [ ] Print store with Stripe Connect
- [ ] Custom domain support
- [ ] Email delivery to clients
- [ ] Mobile-responsive layout
- [ ] Batch photo management (reorder, select all)
- [ ] Gallery cover photo selection
