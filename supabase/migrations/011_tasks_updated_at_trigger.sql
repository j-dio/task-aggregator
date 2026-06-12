-- Ensure tasks.updated_at exists (may be missing if the column was never applied in prod)
-- then add a BEFORE UPDATE trigger so re-sync upserts refresh updated_at.
-- Without this, updated_at stays at insert time, causing the done-window check in
-- computeActionBoardBuckets to silently drop re-synced completed tasks.

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE TRIGGER on_tasks_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
