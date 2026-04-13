-- Migration 009: Tappers — invites, links, shared custom tasks, feed RPCs

-- 1. Profiles — notification + announcement flags
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tapper_notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS seen_tappers_announcement BOOLEAN NOT NULL DEFAULT false;

-- 2. tapper_invites
CREATE TABLE public.tapper_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  inviter_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  max_uses INT NOT NULL DEFAULT 10,
  used_count INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tapper_invites_inviter ON public.tapper_invites (inviter_id);
CREATE INDEX idx_tapper_invites_code ON public.tapper_invites (code) WHERE used_count < max_uses;

ALTER TABLE public.tapper_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_owner_all"
  ON public.tapper_invites
  FOR ALL
  USING (inviter_id = (SELECT auth.uid()))
  WITH CHECK (inviter_id = (SELECT auth.uid()));

-- 3. tapper_links
CREATE TABLE public.tapper_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tapper_links_order CHECK (user_a_id < user_b_id),
  CONSTRAINT tapper_links_pair_unique UNIQUE (user_a_id, user_b_id)
);

CREATE INDEX idx_tapper_links_user_a ON public.tapper_links (user_a_id);
CREATE INDEX idx_tapper_links_user_b ON public.tapper_links (user_b_id);

ALTER TABLE public.tapper_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "links_read_own"
  ON public.tapper_links
  FOR SELECT
  USING (
    user_a_id = (SELECT auth.uid())
    OR user_b_id = (SELECT auth.uid())
  );

CREATE POLICY "links_delete_own"
  ON public.tapper_links
  FOR DELETE
  USING (
    user_a_id = (SELECT auth.uid())
    OR user_b_id = (SELECT auth.uid())
  );

-- 4. tasks.shared_from_user_id
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS shared_from_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL;

-- 5. shared_tasks
CREATE TABLE public.shared_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  added_task_id UUID REFERENCES public.tasks (id) ON DELETE SET NULL,
  seen_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shared_tasks_task_recipient_unique UNIQUE (task_id, recipient_id)
);

CREATE INDEX idx_shared_tasks_recipient ON public.shared_tasks (recipient_id, created_at DESC);
CREATE INDEX idx_shared_tasks_owner ON public.shared_tasks (owner_id);
CREATE INDEX idx_shared_tasks_task ON public.shared_tasks (task_id);

ALTER TABLE public.shared_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shared_tasks_recipient_read"
  ON public.shared_tasks
  FOR SELECT
  USING (recipient_id = (SELECT auth.uid()));

CREATE POLICY "shared_tasks_recipient_update"
  ON public.shared_tasks
  FOR UPDATE
  USING (recipient_id = (SELECT auth.uid()))
  WITH CHECK (recipient_id = (SELECT auth.uid()));

CREATE POLICY "shared_tasks_owner_read"
  ON public.shared_tasks
  FOR SELECT
  USING (owner_id = (SELECT auth.uid()));

CREATE POLICY "shared_tasks_owner_delete"
  ON public.shared_tasks
  FOR DELETE
  USING (owner_id = (SELECT auth.uid()));

-- 6. accept_tapper_invite
CREATE OR REPLACE FUNCTION public.accept_tapper_invite (invite_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite public.tapper_invites%ROWTYPE;
  v_link_id UUID;
  v_a UUID;
  v_b UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT *
  INTO v_invite
  FROM public.tapper_invites
  WHERE code = invite_code
    AND expires_at > now()
    AND used_count < max_uses;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;

  IF v_invite.inviter_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot link with yourself';
  END IF;

  v_a := LEAST(v_invite.inviter_id, auth.uid());
  v_b := GREATEST(v_invite.inviter_id, auth.uid());

  INSERT INTO public.tapper_links (user_a_id, user_b_id)
  VALUES (v_a, v_b)
  ON CONFLICT (user_a_id, user_b_id)
  DO UPDATE SET created_at = public.tapper_links.created_at
  RETURNING id INTO v_link_id;

  UPDATE public.tapper_invites
  SET used_count = used_count + 1
  WHERE id = v_invite.id;

  RETURN v_link_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_tapper_invite (TEXT) TO authenticated;

-- 7. share_task
CREATE OR REPLACE FUNCTION public.share_task (p_task_id UUID, p_recipient_ids UUID[])
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_recipient UUID;
  v_shared_id UUID;
  v_owner UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT t.user_id
  INTO v_owner
  FROM public.tasks t
  WHERE t.id = p_task_id
    AND t.user_id = auth.uid()
    AND t.is_custom = true;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Task not found or not shareable';
  END IF;

  FOREACH v_recipient IN ARRAY p_recipient_ids
  LOOP
    v_shared_id := NULL;

    IF NOT EXISTS (
      SELECT 1
      FROM public.tapper_links tl
      WHERE tl.user_a_id = LEAST(auth.uid(), v_recipient)
        AND tl.user_b_id = GREATEST(auth.uid(), v_recipient)
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.shared_tasks (task_id, owner_id, recipient_id)
    VALUES (p_task_id, auth.uid(), v_recipient)
    ON CONFLICT (task_id, recipient_id) DO NOTHING
    RETURNING id INTO v_shared_id;

    IF v_shared_id IS NOT NULL THEN
      RETURN NEXT v_shared_id;
    END IF;
  END LOOP;

  RETURN;
END;
$$;

GRANT EXECUTE ON FUNCTION public.share_task (UUID, UUID[]) TO authenticated;

-- 8. get_tappers_feed
CREATE OR REPLACE FUNCTION public.get_tappers_feed ()
RETURNS TABLE (
  shared_task_id UUID,
  task_id UUID,
  owner_id UUID,
  owner_display_name TEXT,
  recipient_id UUID,
  added_task_id UUID,
  seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  type TEXT,
  course_name TEXT,
  course_color TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    st.id AS shared_task_id,
    st.task_id,
    st.owner_id,
    p.display_name AS owner_display_name,
    st.recipient_id,
    st.added_task_id,
    st.seen_at,
    st.created_at,
    t.title,
    t.description,
    t.due_date,
    t.type::TEXT,
    c.name AS course_name,
    c.color AS course_color
  FROM public.shared_tasks st
  INNER JOIN public.tasks t ON t.id = st.task_id
  LEFT JOIN public.courses c ON c.id = t.course_id
  INNER JOIN public.profiles p ON p.id = st.owner_id
  WHERE st.recipient_id = auth.uid()
    AND st.dismissed_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_tappers_feed () TO authenticated;

-- 9. get_my_tappers
CREATE OR REPLACE FUNCTION public.get_my_tappers ()
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  linked_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    tl.user_b_id,
    p.display_name,
    tl.created_at
  FROM public.tapper_links tl
  INNER JOIN public.profiles p ON p.id = tl.user_b_id
  WHERE tl.user_a_id = auth.uid()
  UNION ALL
  SELECT
    tl.user_a_id,
    p.display_name,
    tl.created_at
  FROM public.tapper_links tl
  INNER JOIN public.profiles p ON p.id = tl.user_a_id
  WHERE tl.user_b_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_tappers () TO authenticated;
