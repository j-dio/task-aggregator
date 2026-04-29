-- Migration: Add in_progress to tasks status
-- Classroom DRAFT, RECLAIMED_BY_STUDENT, and RETURNED states sync to tasks.status.

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_status_check
CHECK (status IN ('pending', 'in_progress', 'done', 'dismissed'));
