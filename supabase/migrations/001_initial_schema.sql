-- StreakForge Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES TABLE
-- Synced from auth.users via trigger
-- ============================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  onboarded BOOLEAN DEFAULT FALSE,
  preferences JSONB DEFAULT '{"theme": "system", "notifications": true, "reminderTime": "19:00"}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. HABITS TABLE
-- ============================================================
CREATE TABLE public.habits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  description TEXT DEFAULT '' CHECK (char_length(description) <= 500),
  category TEXT NOT NULL DEFAULT 'personal' CHECK (category IN ('coding', 'study', 'gym', 'reading', 'work', 'fitness', 'personal', 'other')),
  icon TEXT DEFAULT '🎯',
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  mode TEXT NOT NULL DEFAULT 'flexible' CHECK (mode IN ('strict', 'flexible')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  color TEXT DEFAULT '#22c55e',
  freeze_count INT DEFAULT 0 CHECK (freeze_count >= 0 AND freeze_count <= 10),
  freeze_enabled BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_habits_user_id ON public.habits(user_id);
CREATE INDEX idx_habits_user_status ON public.habits(user_id, status);

ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own habits" ON public.habits
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own habits" ON public.habits
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own habits" ON public.habits
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own habits" ON public.habits
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- 3. COMPLETIONS TABLE
-- ============================================================
CREATE TABLE public.completions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  timezone TEXT DEFAULT 'UTC',
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'api', 'sync')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate completions for same user+habit+date
  CONSTRAINT unique_completion UNIQUE (user_id, habit_id, date)
);

CREATE INDEX idx_completions_user_id ON public.completions(user_id);
CREATE INDEX idx_completions_habit_id ON public.completions(habit_id);
CREATE INDEX idx_completions_date ON public.completions(date);
CREATE INDEX idx_completions_user_date ON public.completions(user_id, date);
CREATE INDEX idx_completions_habit_date ON public.completions(habit_id, date);

ALTER TABLE public.completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completions" ON public.completions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions" ON public.completions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own completions" ON public.completions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions" ON public.completions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Prevent future date completions
CREATE OR REPLACE FUNCTION public.prevent_future_completions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot create completion for a future date: %', NEW.date;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_future_date
  BEFORE INSERT ON public.completions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_future_completions();

-- Prevent editing/deleting strict mode completions
CREATE OR REPLACE FUNCTION public.prevent_strict_mode_edits()
RETURNS TRIGGER AS $$
DECLARE
  habit_mode TEXT;
BEGIN
  SELECT mode INTO habit_mode FROM public.habits WHERE id = OLD.habit_id;
  IF habit_mode = 'strict' THEN
    RAISE EXCEPTION 'Cannot modify or delete completions for strict mode habits';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_strict_mode_delete
  BEFORE DELETE ON public.completions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_strict_mode_edits();

CREATE TRIGGER check_strict_mode_update
  BEFORE UPDATE ON public.completions
  FOR EACH ROW EXECUTE FUNCTION public.prevent_strict_mode_edits();

-- ============================================================
-- 4. MILESTONES TABLE
-- ============================================================
CREATE TABLE public.milestones (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  milestone INT NOT NULL CHECK (milestone > 0),
  achieved_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_milestone UNIQUE (user_id, habit_id, milestone)
);

CREATE INDEX idx_milestones_user_id ON public.milestones(user_id);
CREATE INDEX idx_milestones_habit_id ON public.milestones(habit_id);

ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own milestones" ON public.milestones
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own milestones" ON public.milestones
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 5. STREAK FREEZES TABLE
-- ============================================================
CREATE TABLE public.streak_freezes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE CASCADE NOT NULL,
  used_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_freeze UNIQUE (user_id, habit_id, used_date)
);

CREATE INDEX idx_streak_freezes_habit ON public.streak_freezes(habit_id);

ALTER TABLE public.streak_freezes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own freezes" ON public.streak_freezes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own freezes" ON public.streak_freezes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================
CREATE TABLE public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('completion_added', 'completion_removed', 'completion_modified', 'habit_created', 'habit_updated', 'habit_deleted', 'habit_archived', 'habit_paused', 'freeze_used', 'mode_changed')),
  target_date DATE,
  previous_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_habit_id ON public.audit_logs(habit_id);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. HELPER FUNCTIONS
-- ============================================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_habits_updated_at
  BEFORE UPDATE ON public.habits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
