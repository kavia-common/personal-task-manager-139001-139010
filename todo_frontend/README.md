# Things Todo – Minimalist Todo App (React + Supabase)

A very basic and minimalistic todo application with per-user authentication and persistent CRUD backed by Supabase.

## Features

- Email/password authentication (signup, login, logout)
- Session persistence and auto-refresh
- Per-user todos (fetch, add, edit, toggle complete, delete)
- Minimalist "Ocean Professional" styling with accessibility and keyboard support

## Prerequisites

- Node 16+ (Create React App)
- Supabase project with a `todos` table as defined below

## Environment Variables

Create a `.env` file at the project root (managed by the orchestrator) with:

- REACT_APP_SUPABASE_URL
- REACT_APP_SUPABASE_KEY
- (Optional) REACT_APP_SITE_URL – used for email redirect after signup, defaults to window.location.origin

Example `.env.example`:
```
REACT_APP_SUPABASE_URL=https://YOUR-PROJECT-ref.supabase.co
REACT_APP_SUPABASE_KEY=YOUR-ANON-KEY
REACT_APP_SITE_URL=http://localhost:3000
```

Note: Request these values from the user; do not hardcode in code.

## Supabase Table Schema (expected)

Create a table `todos` with Row Level Security enabled and the following columns:

- id: bigint or uuid (primary key; if uuid, use `uuid_generate_v4()`)
- user_id: uuid (references auth.users.id)
- title: text
- is_complete: boolean (default false)
- created_at: timestamp with time zone (default now())

Example SQL (uuid id):
```sql
create extension if not exists "uuid-ossp";

create table if not exists public.todos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  is_complete boolean not null default false,
  created_at timestamp with time zone not null default now()
);

alter table public.todos enable row level security;

create policy "Allow user read own todos"
on public.todos for select
using (auth.uid() = user_id);

create policy "Allow user insert own todos"
on public.todos for insert
with check (auth.uid() = user_id);

create policy "Allow user update own todos"
on public.todos for update
using (auth.uid() = user_id);

create policy "Allow user delete own todos"
on public.todos for delete
using (auth.uid() = user_id);
```

## Install and Run

- Install dependencies:
  ```
  npm install
  ```
- Start development server:
  ```
  npm start
  ```
- Run tests:
  ```
  npm test
  ```
- Build production:
  ```
  npm run build
  ```

## Project Structure

- src/lib/supabaseClient.js – Supabase client setup using env vars
- src/App.js – Main app with auth + todos logic
- src/App.css – Minimalist Ocean Professional styles

## Accessibility

- Proper labels and aria attributes on inputs and buttons
- Keyboard navigation supported
- Visible focus states and polite status messages

## Notes

- Email confirmations: After signup, check your inbox and confirm your email if required by your Supabase project settings.
- Make sure your RLS policies match the above for per-user data isolation.
