-- ============================================================
-- RemindFlow - Full Database Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- PROFILES TABLE
-- Extends auth.users with additional fields
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone_number TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REMINDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  reminder_date DATE NOT NULL,
  reminder_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'daily', 'weekly', 'monthly')),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- REMINDER_USERS JUNCTION TABLE (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reminder_users (
  reminder_id UUID NOT NULL REFERENCES public.reminders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (reminder_id, user_id)
);

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_reminders_updated_at
  BEFORE UPDATE ON public.reminders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Unknown User'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'user'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: get_user_role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES RLS POLICIES
-- ============================================================

-- Admins can read all profiles
CREATE POLICY "admins_read_all_profiles" ON public.profiles
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can insert profiles (create users)
CREATE POLICY "admins_insert_profiles" ON public.profiles
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- System can insert own profile on signup
CREATE POLICY "system_insert_own_profile" ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "admins_update_profiles" ON public.profiles
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Admins can delete profiles
CREATE POLICY "admins_delete_profiles" ON public.profiles
  FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- REMINDERS RLS POLICIES
-- ============================================================

-- Admins can read all reminders
CREATE POLICY "admins_read_all_reminders" ON public.reminders
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Users can read reminders assigned to them
CREATE POLICY "users_read_assigned_reminders" ON public.reminders
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.reminder_users
      WHERE reminder_id = id
    )
  );

-- Admins can insert reminders
CREATE POLICY "admins_insert_reminders" ON public.reminders
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Admins can update reminders
CREATE POLICY "admins_update_reminders" ON public.reminders
  FOR UPDATE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Admins can delete reminders
CREATE POLICY "admins_delete_reminders" ON public.reminders
  FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- REMINDER_USERS RLS POLICIES
-- ============================================================

-- Admins can read all reminder_users
CREATE POLICY "admins_read_reminder_users" ON public.reminder_users
  FOR SELECT
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Users can read their own reminder assignments
CREATE POLICY "users_read_own_reminder_users" ON public.reminder_users
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can insert reminder_users
CREATE POLICY "admins_insert_reminder_users" ON public.reminder_users
  FOR INSERT
  WITH CHECK (public.get_user_role(auth.uid()) = 'admin');

-- Admins can delete reminder_users
CREATE POLICY "admins_delete_reminder_users" ON public.reminder_users
  FOR DELETE
  USING (public.get_user_role(auth.uid()) = 'admin');

-- ============================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reminders_status ON public.reminders(status);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON public.reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON public.reminders(created_by);
CREATE INDEX IF NOT EXISTS idx_reminder_users_user_id ON public.reminder_users(user_id);
CREATE INDEX IF NOT EXISTS idx_reminder_users_reminder_id ON public.reminder_users(reminder_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.reminders TO authenticated;
GRANT ALL ON public.reminder_users TO authenticated;
GRANT SELECT ON public.profiles TO anon;
