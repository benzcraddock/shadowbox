# ShadowBox Setup Guide

This guide will walk you through setting up ShadowBox from scratch.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **New Project**
3. Fill in:
   - **Name**: ShadowBox (or whatever you prefer)
   - **Database Password**: Choose a strong password (save it somewhere safe)
   - **Region**: Choose closest to you
4. Click **Create new project** and wait for it to initialize (~2 minutes)

## Step 3: Set Up Database Schema

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **New query**
3. Open the file `supabase/schema.sql` in this project
4. Copy all the contents and paste into the SQL Editor
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. You should see "Success. No rows returned" - this means it worked!

## Step 4: Enable Authentication Providers

### Email Authentication (already enabled by default)

Email auth is enabled by default, so you're good to go!

### Google OAuth (optional but recommended)

1. In Supabase Dashboard, go to **Authentication** → **Providers**
2. Find **Google** and click **Enable**
3. Follow Supabase's instructions to:
   - Create a Google Cloud project
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI from Supabase
4. Paste your **Client ID** and **Client Secret** into Supabase
5. Click **Save**

## Step 5: Get Your API Keys

1. In Supabase Dashboard, go to **Settings** → **API**
2. You'll see two important values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")
3. Copy both of these

## Step 6: Configure Environment Variables

1. In your project folder, copy the example env file:

```bash
cp .env.local.example .env.local
```

2. Open `.env.local` in your editor
3. Replace the placeholder values with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

4. Save the file

## Step 7: Start the Development Server

```bash
npm run dev
```

The app should now be running at [http://localhost:3000](http://localhost:3000)

## Step 8: Test the App

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click **Get Started** or **Sign Up**
3. Create an account with email/password
4. After signing up, you should be redirected to `/train`
5. **Grant camera permissions** when prompted
6. You should see yourself in the camera feed with a skeleton overlay!

## Troubleshooting

### Camera Not Working

- **Make sure you granted camera permissions** when prompted
- Check browser console for errors
- Try a different browser (Chrome/Edge work best)
- Ensure you're on HTTPS or localhost (camera requires secure context)

### Supabase Connection Failed

- Double-check your `.env.local` file has the correct values
- Make sure you copied the **anon/public** key, not the service_role key
- Restart your dev server after changing `.env.local`

### Google OAuth Not Working

- Make sure you added the exact redirect URI from Supabase to your Google Cloud Console
- Check that Google+ API is enabled in your Google Cloud project
- Verify Client ID and Secret are correct in Supabase

### Pose Detection Not Loading

- Check browser console for errors
- MediaPipe requires a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- If on a slow connection, the model may take time to download
- Try refreshing the page

### "User already registered" Error

- This means the email is already in use
- Try logging in instead of signing up
- Or use a different email address

## Next Steps

Once everything is working:

1. **Test the camera and pose detection** - wave your arms around and watch the skeleton follow!
2. **Check the database** - in Supabase, go to **Table Editor** and you should see a new user in the `users` table
3. **Start training!** The current version tracks your session time and displays the skeleton overlay

## Need Help?

- Check the main [README.md](./README.md) for project overview
- Review [supabase/README.md](./supabase/README.md) for database details
- Open an issue on GitHub if you're stuck

Happy training! 🥊
