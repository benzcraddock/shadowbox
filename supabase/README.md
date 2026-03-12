# Supabase Setup Instructions

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be set up

## 2. Configure Authentication

1. In your Supabase Dashboard, go to **Authentication** → **Providers**
2. Enable **Email** provider (enabled by default)
3. Enable **Google** provider:
   - Follow Supabase's instructions to set up Google OAuth
   - Add your Google Client ID and Secret

## 3. Run Database Schema

1. Go to **SQL Editor** in your Supabase Dashboard
2. Copy the contents of `schema.sql` in this directory
3. Paste and run the SQL to create all tables and policies

## 4. Get Your API Keys

1. Go to **Settings** → **API**
2. Copy your **Project URL** and **anon/public** key
3. Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

4. Add your credentials to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## 5. Test the Connection

Run the development server and try signing up. Your user profile should be automatically created in the `users` table.

## Database Schema Overview

- **users**: User profiles with stance preference
- **sessions**: Training session records
- **punch_logs**: Individual punch attempts with form scores
- **movement_logs**: Defensive movement attempts with form scores
- **combo_results**: Combo execution results

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.
