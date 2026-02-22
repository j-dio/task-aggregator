-- Migration: Courses & Tasks tables for UVEC/GClassroom
-- Phase 2: UVEC Data Ingestion

-- Courses table
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  external_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('UVEC', 'GClassroom')),
  color text,
  created_at timestamptz DEFAULT now()
);

-- Tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date timestamptz,
  type text CHECK (type IN ('assignment', 'quiz', 'exam', 'event')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'dismissed')),
  external_id text NOT NULL,
  source text NOT NULL CHECK (source IN ('UVEC', 'GClassroom')),
  created_at timestamptz DEFAULT now()
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
CREATE INDEX idx_courses_external_id_source ON courses(external_id, source);
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_course_id ON tasks(course_id);
CREATE INDEX idx_tasks_external_id_source ON tasks(external_id, source);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- End of migration
