-- REVIEW ONLY: separate tenth draft. Existing values and rows are preserved.
-- This changes only two CHECK constraints, not RLS/grants/access or routines.
BEGIN;
SET LOCAL search_path=pg_catalog;SET LOCAL lock_timeout='5s';SET LOCAL statement_timeout='30s';
LOCK TABLE public.action_items IN ACCESS EXCLUSIVE MODE;
DO $baseline$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.action_items'::regclass AND conname='action_items_status_check' AND contype='c' AND convalidated
 AND pg_get_constraintdef(oid)=$expected$CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'complete'::text, 'blocked'::text])))$expected$)
 OR NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.action_items'::regclass AND conname='action_items_category_check' AND contype='c' AND convalidated
 AND pg_get_constraintdef(oid)=$expected$CHECK ((category = ANY (ARRAY['family'::text, 'student'::text, 'teacher'::text, 'school'::text, 'partner'::text])))$expected$)THEN
 RAISE EXCEPTION 'Exact existing action-item constraints are required; review current installation before proceeding.' USING ERRCODE='55000';END IF;
END;$baseline$;
ALTER TABLE public.action_items DROP CONSTRAINT action_items_status_check;
ALTER TABLE public.action_items ADD CONSTRAINT action_items_status_check CHECK(status IN('not_started','in_progress','complete','completed','blocked'));
ALTER TABLE public.action_items DROP CONSTRAINT action_items_category_check;
ALTER TABLE public.action_items ADD CONSTRAINT action_items_category_check CHECK(category IN('family','student','teacher','educator','team','school','partner'));
COMMIT;
