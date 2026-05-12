# Personal Notepad

A lightweight browser-based notepad app built with Next.js for deployment on Vercel.

## Features

- Create, edit, delete, and search notes
- Shared public notes stored in Supabase
- Light and dark mode with persisted preference
- Local browser persistence for theme and font-size preferences
- Responsive layout for desktop and mobile
- Markdown-style fenced code block preview

## Run Locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

Create a Supabase project, open the SQL editor, and run:

```sql
-- supabase/schema.sql
```

Use the contents of [supabase/schema.sql](supabase/schema.sql). It creates a public
`notes` table and anonymous read/write policies. This is intentionally shared:
anyone with the deployed app can read, create, edit, and delete notes.

Then set these environment variables in `.env.local` and in Vercel:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Deploy To Vercel

Import this repository into Vercel. The default build settings work:

- Framework Preset: Next.js
- Build Command: `npm run build`
- Output Directory: `.next`
