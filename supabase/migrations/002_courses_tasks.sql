-- Migration: Courses & Tasks tables for UVEC/GClassroom
-- Phase 2: UVEC Data Ingestion

-- Courses table
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  external_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('uvec', 'gclassroom')),
  color text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_courses_user_ext_source UNIQUE(user_id, external_id, source)
);

-- Tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  type text CHECK (type IN ('assignment', 'quiz', 'exam', 'event', 'announcement')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'dismissed')),
  external_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('uvec', 'gclassroom')),
  url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT uq_tasks_user_ext_source UNIQUE(user_id, external_id, source)
);

-- RLS policies
-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: users can access their own courses/tasks
CREATE POLICY "Courses: user can access own" ON courses
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Courses: user can insert own" ON courses
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Courses: user can update own" ON courses
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Courses: user can delete own" ON courses
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Tasks: user can access own" ON tasks
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Tasks: user can insert own" ON tasks
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Tasks: user can update own" ON tasks
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Tasks: user can delete own" ON tasks
  FOR DELETE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_course_id ON tasks(course_id);

-- Composite indexes for dashboard queries
CREATE INDEX idx_tasks_user_due ON tasks(user_id, due_date);
CREATE INDEX idx_tasks_user_status ON tasks(user_id, status);
CREATE INDEX idx_tasks_user_source ON tasks(user_id, source);

-- End of migration
