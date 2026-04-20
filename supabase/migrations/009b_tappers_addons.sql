-- Add-on for 009 tappers: RPC to read origin task fields when adopting a shared task.
-- Recipients cannot SELECT the owner's task row under RLS; SECURITY DEFINER bridges that gap.

CREATE OR REPLACE FUNCTION public.get_shared_task_detail (p_shared_task_id UUID)
RETURNS TABLE (
  owner_user_id UUID,
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  type TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    t.user_id AS owner_user_id,
    t.title,
    t.description,
    t.due_date,
    t.type::TEXT
  FROM public.shared_tasks st
  INNER JOIN public.tasks t ON t.id = st.task_id
  WHERE st.id = p_shared_task_id
    AND st.recipient_id = auth.uid()
    AND st.added_task_id IS NULL
    AND st.dismissed_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_shared_task_detail (UUID) TO authenticated;
