-- ShadowBox Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  stance TEXT CHECK (stance IN ('orthodox', 'southpaw')) DEFAULT 'orthodox',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read/update their own data
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_punches INTEGER DEFAULT 0,
  total_defensive_moves INTEGER DEFAULT 0,
  avg_form_score NUMERIC(5,2),
  combo_attempts INTEGER DEFAULT 0,
  combo_accuracy NUMERIC(5,2)
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own sessions" ON public.sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions" ON public.sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Punch logs table
CREATE TABLE IF NOT EXISTS public.punch_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  punch_type INTEGER CHECK (punch_type BETWEEN 1 AND 6) NOT NULL,
  form_score NUMERIC(5,2) CHECK (form_score BETWEEN 0 AND 100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.punch_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own punch logs" ON public.punch_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = punch_logs.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own punch logs" ON public.punch_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = punch_logs.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Movement logs table
CREATE TABLE IF NOT EXISTS public.movement_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  movement_type TEXT CHECK (movement_type IN ('slip_left', 'slip_right', 'duck', 'pull_back')) NOT NULL,
  form_score NUMERIC(5,2) CHECK (form_score BETWEEN 0 AND 100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.movement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own movement logs" ON public.movement_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = movement_logs.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own movement logs" ON public.movement_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = movement_logs.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Combo results table
CREATE TABLE IF NOT EXISTS public.combo_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  combo_name TEXT NOT NULL,
  sequence TEXT NOT NULL,
  punches_matched INTEGER DEFAULT 0,
  form_score NUMERIC(5,2) CHECK (form_score BETWEEN 0 AND 100),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.combo_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own combo results" ON public.combo_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = combo_results.session_id
      AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own combo results" ON public.combo_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sessions
      WHERE sessions.id = combo_results.session_id
      AND sessions.user_id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX idx_punch_logs_session_id ON public.punch_logs(session_id);
CREATE INDEX idx_movement_logs_session_id ON public.movement_logs(session_id);
CREATE INDEX idx_combo_results_session_id ON public.combo_results(session_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'display_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
