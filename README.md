# Classly — Teacher LMS Starter

A lightweight Learning Management System for teachers. Create spaces (classrooms), add students via join codes, and publish notes, quizzes, and assignments.

---

## What's included in this starter

- Teacher sign up / login (email + password)
- Create multiple classroom spaces
- Student join via code
- Add notes, quizzes (with auto-scoring), and assignments
- View student submissions and progress
- Row-level security (teachers only see their own data)

---

## Step-by-step setup

### Step 1 — Create a Supabase project (free)

1. Go to [https://supabase.com](https://supabase.com) and sign up
2. Click **New project**
3. Give it a name (e.g. "classly"), set a database password, choose a region close to you
4. Wait ~1 minute for it to finish setting up

---

### Step 2 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** (green button)
6. You should see "Success. No rows returned" — that means it worked ✓

---

### Step 3 — Get your API keys

1. In Supabase, go to **Settings** (gear icon) → **API**
2. You need two values:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **anon public key** — a long string starting with `eyJ...`

---

### Step 4 — Configure your environment

1. In this project folder, copy `.env.example` to a new file called `.env`:
   ```
   cp .env.example .env
   ```
2. Open `.env` and paste your values:
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. Save the file. **Never commit `.env` to git** (it's already in `.gitignore`)

---

### Step 5 — Install dependencies and run

Make sure you have [Node.js](https://nodejs.org) installed (v18 or higher).

```bash
# Install all packages
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

### Step 6 — Configure Supabase Auth (important!)

By default Supabase requires email confirmation. For development you may want to disable this:

1. In Supabase go to **Authentication** → **Providers** → **Email**
2. Toggle off **"Confirm email"** (you can turn it back on for production)

---

## Project structure

```
classly/
├── src/
│   ├── components/
│   │   ├── auth/           # (reserved for future auth components)
│   │   ├── layout/
│   │   │   └── Layout.jsx  # Sidebar + main area wrapper
│   │   ├── spaces/
│   │   │   └── CreateSpaceModal.jsx
│   │   └── content/
│   │       └── CreateContentModal.jsx
│   ├── hooks/
│   │   └── useAuth.jsx     # Auth context — login, signup, signout
│   ├── lib/
│   │   └── supabase.js     # Supabase client setup
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── SignupPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── SpacePage.jsx
│   │   ├── SpaceSettingsPage.jsx
│   │   └── ContentPage.jsx
│   ├── App.jsx             # Routes
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind + component styles
├── supabase-schema.sql     # Run this in Supabase SQL editor
├── .env.example            # Copy to .env and fill in your keys
└── package.json
```

---

## How the app works

### Authentication flow
- Teacher signs up → Supabase creates an `auth.users` row + a `profiles` row (via database trigger)
- Login sets a session cookie managed by Supabase
- `useAuth.jsx` exposes `user`, `profile`, `signIn`, `signUp`, `signOut` to the whole app
- `PrivateRoute` in `App.jsx` redirects to `/login` if not authenticated

### Spaces
- A space = a classroom. Teachers create spaces, each gets a unique join code like `BIO-7X4Q`
- Students join by entering the code (student-side feature to build next)
- Each space has its own content list and student roster

### Content
- **Note** — plain text reading material
- **Quiz** — multiple choice questions, auto-scored when students submit
- **Assignment** — written task, teacher reviews and grades manually

### Row Level Security (RLS)
- All tables have RLS enabled in Supabase
- Teachers can only read/write their own spaces and content
- Students can only read spaces they're enrolled in
- This security is enforced at the database level — even if someone finds your API key, they can't see other teachers' data

---

## What to build next (Phase 2)

| Feature | Where to add |
|---|---|
| Student-facing view (join by code, take quizzes) | New `/join` page + student dashboard |
| Auto-score quizzes on submission | `ContentPage.jsx` — submit answers, calculate score |
| Progress charts per student | `SpacePage.jsx` — add recharts bar chart |
| Rich text editor for notes | Replace textarea with `@tiptap/react` |
| File uploads for assignments | Supabase Storage + file input |
| Email notifications | Supabase Edge Functions |
| Parent portal (read-only) | New role + restricted RLS policies |

---

## Deploying to production (Vercel)

1. Push your code to a GitHub repo
2. Go to [https://vercel.com](https://vercel.com) and import the repo
3. In Vercel project settings → **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel auto-deploys on every git push

---

## Common issues

**"Missing Supabase environment variables" error**
→ Make sure your `.env` file exists and has the correct values. Restart `npm run dev` after editing `.env`.

**Login works but dashboard is empty**
→ Check the browser console for errors. Usually means RLS is blocking a query — make sure you ran the full schema SQL.

**"Email not confirmed" error on login**
→ Go to Supabase Auth settings and disable email confirmation, or click the confirmation link in your email.

**Styles not loading**
→ Make sure `tailwindcss`, `postcss`, and `autoprefixer` are installed. Run `npm install` again.
