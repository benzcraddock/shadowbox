# ShadowBox 🥊

**AI-Powered Boxing Form Tracker & Coach**

ShadowBox is a browser-based boxing training app that uses pose estimation to provide real-time feedback on punch form, defensive movements, and combos. Think of it as your virtual boxing coach that watches your form through your webcam.

## Features (Phase 1 - MVP)

✅ **Pose Detection & Tracking**
- Real-time body landmark detection via MediaPipe Pose
- 33-point skeleton overlay on camera feed
- 30fps detection on modern hardware

✅ **Authentication**
- Email/password signup and login
- Google OAuth integration
- Secure session management with Supabase

✅ **Training Interface**
- Full-screen camera view with skeleton overlay
- Session timer and stats tracking
- Responsive layout with collapsible stats panel

🚧 **Coming in Phase 2**
- Punch classification (Jab, Cross, Hooks, Uppercuts)
- Defensive movement detection (Slips, Ducks, Pull Backs)
- Real-time form feedback with color-coded skeleton
- Form correction cues

🚧 **Coming in Phase 3**
- Combo prompt system
- Progressive difficulty
- Session history and analytics
- Progress dashboard

## Tech Stack

- **Frontend**: Next.js 14+ (App Router), TypeScript, Tailwind CSS
- **Pose Detection**: MediaPipe Pose (@mediapipe/tasks-vision)
- **Canvas**: HTML5 Canvas API for skeleton rendering
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **State**: Zustand for client state, React Query for server state
- **Hosting**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Camera-enabled device for testing

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd boxing
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the schema from `supabase/schema.sql`
3. Enable **Email** and **Google** auth providers in **Authentication** → **Providers**
4. Get your API keys from **Settings** → **API**

See detailed instructions in [`supabase/README.md`](./supabase/README.md)

### 3. Configure Environment Variables

```bash
cp .env.local.example .env.local
```

Then edit `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### 5. Test the App

1. Sign up with email/password or Google
2. Grant camera permissions when prompted
3. You should see your skeleton overlay on the camera feed!

## Project Structure

```
├── app/
│   ├── (auth)/           # Auth pages (login, signup)
│   ├── (app)/            # Protected app pages (train)
│   ├── auth/             # OAuth callback routes
│   └── page.tsx          # Landing page
├── lib/
│   ├── hooks/            # Custom React hooks (camera, pose detection)
│   ├── supabase/         # Supabase client utilities
│   └── types/            # TypeScript type definitions
├── supabase/
│   ├── schema.sql        # Database schema
│   └── README.md         # Supabase setup instructions
└── public/               # Static assets
```

## Design System

ShadowBox uses a **dark-mode-first** design with carefully chosen color tokens:

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | #0A0A0F | App background |
| `bg-surface` | #141419 | Cards, panels |
| `bg-elevated` | #1C1C24 | Modals, dropdowns |
| `border-subtle` | #2A2A35 | Borders, dividers |
| `text-primary` | #F5F5F7 | Headlines, key text |
| `text-secondary` | #8B8B9E | Body text, labels |
| `accent-positive` | #4ADE80 (80%) | Good form, success |
| `accent-negative` | #F87171 (80%) | Form errors |
| `accent-neutral` | #A78BFA (60%) | Active/focus states |

**Typography**: Geist Sans (geometric, clean)
**Border Radius**: 8-12px on cards, 6px on inputs/buttons
**Motion**: Smooth fades (200-300ms), subtle easing

## Development Phases

### ✅ Phase 1: Foundation (COMPLETE)
- Next.js scaffolding with design system
- Supabase setup with database schema
- Authentication (email + Google OAuth)
- Camera access and MediaPipe Pose integration
- Training view layout with skeleton overlay

### 🚧 Phase 2: Intelligence (NEXT)
- Punch classification engine
- Defensive movement detection
- Form feedback engine with benchmarks
- Real-time visual and text feedback

### 📋 Phase 3: Progression
- Combo prompt system (8-10 combos)
- Combo tracking and scoring
- Session persistence to database
- Progress dashboard with charts

### 🎨 Phase 4: Polish
- Complete design token application
- Glow and bloom effects
- Motion system (fades, transitions)
- Performance audit (maintain 30fps)

## Contributing

This is a personal project by Ben Craddock. Contributions are welcome!

## License

MIT

---

**Built with Claude Code** 🤖
