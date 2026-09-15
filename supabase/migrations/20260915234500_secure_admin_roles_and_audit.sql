DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_valid' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_valid
      CHECK (role IN ('PLAYER','ADMIN','SUPPORT','MANAGER','AFFILIATE'));
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'role_change_not_allowed';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_role() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_role ON public.profiles;
CREATE TRIGGER trg_protect_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_update ON public.profiles;
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_admin
ON public.profiles FOR UPDATE TO authenticated
USING ((id = (SELECT auth.uid())) OR (SELECT public.is_admin()))
WITH CHECK ((id = (SELECT auth.uid())) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS audit_admin_read ON public.audit_logs;
CREATE POLICY audit_admin_read
ON public.audit_logs FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.audit_admin_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_resource_id uuid;
  v_metadata jsonb;
BEGIN
  IF v_uid IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
  IF v_role <> 'ADMIN' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    v_resource_id := OLD.id;
    v_metadata := jsonb_build_object('before', to_jsonb(OLD));
  ELSIF TG_OP = 'INSERT' THEN
    v_resource_id := NEW.id;
    v_metadata := jsonb_build_object('after', to_jsonb(NEW));
  ELSE
    v_resource_id := NEW.id;
    v_metadata := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
  END IF;

  INSERT INTO public.audit_logs(user_id, actor_role, action, resource_type, resource_id, metadata)
  VALUES (v_uid, v_role, 'ADMIN_' || TG_OP, TG_TABLE_NAME, v_resource_id, v_metadata);

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.audit_admin_mutation() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles','providers','game_categories','games','banners','promotions']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_admin_mutation ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_audit_admin_mutation AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.audit_admin_mutation()', t);
  END LOOP;
END $$;

DROP POLICY IF EXISTS banners_read_anon ON public.banners;
DROP POLICY IF EXISTS banners_read_authenticated ON public.banners;
CREATE POLICY banners_read_anon ON public.banners FOR SELECT TO anon
USING (active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));
CREATE POLICY banners_read_authenticated ON public.banners FOR SELECT TO authenticated
USING ((active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now())) OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS promotions_read_anon ON public.promotions;
DROP POLICY IF EXISTS promotions_read_authenticated ON public.promotions;
CREATE POLICY promotions_read_anon ON public.promotions FOR SELECT TO anon
USING (active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now()));
CREATE POLICY promotions_read_authenticated ON public.promotions FOR SELECT TO authenticated
USING ((active = true AND (start_at IS NULL OR start_at <= now()) AND (end_at IS NULL OR end_at >= now())) OR (SELECT public.is_admin()));