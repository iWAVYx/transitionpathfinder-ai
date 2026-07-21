-- 1. Legal-hold enforcement on messages
CREATE OR REPLACE FUNCTION public.tg_channel_messages_enforce_legal_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_hold boolean;
BEGIN
  SELECT legal_hold INTO v_hold FROM public.channels
    WHERE id = COALESCE(NEW.channel_id, OLD.channel_id);
  IF v_hold IS TRUE THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'Channel is under legal hold: messages cannot be deleted'
        USING ERRCODE = '42501';
    END IF;
    IF TG_OP = 'UPDATE'
       AND NEW.deleted_at IS NOT NULL
       AND OLD.deleted_at IS NULL THEN
      RAISE EXCEPTION 'Channel is under legal hold: messages cannot be removed'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_channel_messages_legal_hold ON public.channel_messages;
CREATE TRIGGER trg_channel_messages_legal_hold
BEFORE DELETE OR UPDATE ON public.channel_messages
FOR EACH ROW EXECUTE FUNCTION public.tg_channel_messages_enforce_legal_hold();

-- 2. Legal-hold enforcement on the channel row itself
CREATE OR REPLACE FUNCTION public.tg_channels_enforce_legal_hold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.legal_hold IS TRUE THEN
      RAISE EXCEPTION 'Channel is under legal hold: channel cannot be deleted'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.legal_hold IS TRUE THEN
    IF NEW.retention_days < OLD.retention_days THEN
      RAISE EXCEPTION 'Cannot shorten retention while under legal hold'
        USING ERRCODE = '42501';
    END IF;
    IF NEW.archived_at IS NOT NULL AND OLD.archived_at IS NULL THEN
      RAISE EXCEPTION 'Cannot archive a channel under legal hold'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_channels_legal_hold ON public.channels;
CREATE TRIGGER trg_channels_legal_hold
BEFORE UPDATE OR DELETE ON public.channels
FOR EACH ROW EXECUTE FUNCTION public.tg_channels_enforce_legal_hold();

-- 3. Retention purge function
CREATE OR REPLACE FUNCTION public.channel_retention_purge()
RETURNS TABLE(channel_id uuid, purged bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_count bigint;
BEGIN
  FOR r IN
    SELECT c.id, c.retention_days
    FROM public.channels c
    WHERE c.legal_hold IS NOT TRUE
      AND c.retention_days IS NOT NULL
      AND c.retention_days > 0
  LOOP
    WITH deleted AS (
      DELETE FROM public.channel_messages m
      WHERE m.channel_id = r.id
        AND m.pinned IS NOT TRUE
        AND m.created_at < now() - make_interval(days => r.retention_days)
      RETURNING m.id
    )
    SELECT count(*) INTO v_count FROM deleted;

    IF v_count > 0 THEN
      INSERT INTO public.channel_audit_events (channel_id, event_type, payload)
      VALUES (
        r.id,
        'retention_purge',
        jsonb_build_object('purged', v_count, 'retention_days', r.retention_days)
      );
      channel_id := r.id;
      purged := v_count;
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.channel_retention_purge() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.channel_retention_purge() TO service_role;

-- 4. Schedule the purge daily at 03:15 UTC
SELECT cron.unschedule('channel-retention-purge')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'channel-retention-purge');

SELECT cron.schedule(
  'channel-retention-purge',
  '15 3 * * *',
  $cron$ SELECT public.channel_retention_purge(); $cron$
);