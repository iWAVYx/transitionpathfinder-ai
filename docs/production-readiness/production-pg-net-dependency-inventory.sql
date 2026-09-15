-- SELECT-ONLY production pg_net dependency inventory.
--
-- Run only after visually confirming the Lovable production project maps to
-- Supabase ref lrqcntqyekucamifpffs. These statements read PostgreSQL catalog
-- identities, ownership, and dependency edges only. They do not read function
-- bodies, cron commands, application rows, files, users, credentials, or
-- secrets. The final statement fails closed unless zero pg_net member objects
-- are in the public schema.

SELECT
  current_database() AS database_name,
  current_user AS database_user,
  now() AT TIME ZONE 'utc' AS observed_at_utc,
  extension_row.extname AS extension_name,
  extension_row.extversion AS installed_version,
  namespace_row.nspname AS metadata_schema,
  pg_catalog.pg_get_userbyid(extension_row.extowner) AS extension_owner,
  available_row.relocatable,
  available_row.schema AS required_schema,
  available_row.requires
FROM pg_catalog.pg_extension extension_row
JOIN pg_catalog.pg_namespace namespace_row
  ON namespace_row.oid = extension_row.extnamespace
LEFT JOIN pg_catalog.pg_available_extension_versions available_row
  ON available_row.name = extension_row.extname
 AND available_row.version = extension_row.extversion
WHERE extension_row.extname = 'pg_net';

WITH extension_target AS (
  SELECT oid
  FROM pg_catalog.pg_extension
  WHERE extname = 'pg_net'
), extension_members AS (
  SELECT dependency_row.classid,
         dependency_row.objid,
         dependency_row.objsubid,
         dependency_row.deptype
  FROM pg_catalog.pg_depend dependency_row
  JOIN extension_target
    ON dependency_row.refclassid = 'pg_catalog.pg_extension'::regclass
   AND dependency_row.refobjid = extension_target.oid
  WHERE dependency_row.deptype = 'e'
)
SELECT
  identified.type AS object_type,
  identified.schema AS object_schema,
  identified.name AS object_name,
  identified.identity AS object_identity,
  CASE
    WHEN member_row.classid = 'pg_catalog.pg_proc'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.proowner)
       FROM pg_catalog.pg_proc object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_class'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.relowner)
       FROM pg_catalog.pg_class object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_type'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.typowner)
       FROM pg_catalog.pg_type object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_namespace'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.nspowner)
       FROM pg_catalog.pg_namespace object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_operator'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.oprowner)
       FROM pg_catalog.pg_operator object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_collation'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.collowner)
       FROM pg_catalog.pg_collation object_row
       WHERE object_row.oid = member_row.objid)
    WHEN member_row.classid = 'pg_catalog.pg_conversion'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.conowner)
       FROM pg_catalog.pg_conversion object_row
       WHERE object_row.oid = member_row.objid)
    ELSE NULL
  END AS object_owner,
  'member_of_pg_net_extension' AS relationship
FROM extension_members member_row
CROSS JOIN LATERAL pg_catalog.pg_identify_object(
  member_row.classid,
  member_row.objid,
  member_row.objsubid
) identified
ORDER BY identified.type, identified.schema, identified.name, identified.identity;

WITH extension_target AS (
  SELECT oid
  FROM pg_catalog.pg_extension
  WHERE extname = 'pg_net'
), members AS (
  SELECT dependency_row.classid,
         dependency_row.objid,
         dependency_row.objsubid
  FROM pg_catalog.pg_depend dependency_row
  JOIN extension_target
    ON dependency_row.refclassid = 'pg_catalog.pg_extension'::regclass
   AND dependency_row.refobjid = extension_target.oid
  WHERE dependency_row.deptype = 'e'
), inbound AS (
  SELECT dependency_row.*
  FROM pg_catalog.pg_depend dependency_row
  JOIN members target
    ON target.classid = dependency_row.refclassid
   AND target.objid = dependency_row.refobjid
   AND target.objsubid = dependency_row.refobjsubid
  LEFT JOIN members source
    ON source.classid = dependency_row.classid
   AND source.objid = dependency_row.objid
   AND source.objsubid = dependency_row.objsubid
  WHERE source.objid IS NULL
)
SELECT
  source_identity.type AS dependent_type,
  source_identity.schema AS dependent_schema,
  source_identity.name AS dependent_name,
  source_identity.identity AS dependent_identity,
  CASE
    WHEN inbound_row.classid = 'pg_catalog.pg_proc'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.proowner)
       FROM pg_catalog.pg_proc object_row
       WHERE object_row.oid = inbound_row.objid)
    WHEN inbound_row.classid = 'pg_catalog.pg_class'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.relowner)
       FROM pg_catalog.pg_class object_row
       WHERE object_row.oid = inbound_row.objid)
    WHEN inbound_row.classid = 'pg_catalog.pg_type'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.typowner)
       FROM pg_catalog.pg_type object_row
       WHERE object_row.oid = inbound_row.objid)
    WHEN inbound_row.classid = 'pg_catalog.pg_namespace'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.nspowner)
       FROM pg_catalog.pg_namespace object_row
       WHERE object_row.oid = inbound_row.objid)
    WHEN inbound_row.classid = 'pg_catalog.pg_rewrite'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(relation_row.relowner)
       FROM pg_catalog.pg_rewrite rewrite_row
       JOIN pg_catalog.pg_class relation_row
         ON relation_row.oid = rewrite_row.ev_class
       WHERE rewrite_row.oid = inbound_row.objid)
    WHEN inbound_row.classid = 'pg_catalog.pg_trigger'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(relation_row.relowner)
       FROM pg_catalog.pg_trigger trigger_row
       JOIN pg_catalog.pg_class relation_row
         ON relation_row.oid = trigger_row.tgrelid
       WHERE trigger_row.oid = inbound_row.objid)
    ELSE NULL
  END AS dependent_owner,
  CASE inbound_row.deptype
    WHEN 'n' THEN 'normal'
    WHEN 'a' THEN 'automatic'
    WHEN 'i' THEN 'internal'
    WHEN 'P' THEN 'partition_primary'
    WHEN 'S' THEN 'partition_secondary'
    ELSE inbound_row.deptype::text
  END AS dependency_type,
  target_identity.type AS pg_net_member_type,
  target_identity.schema AS pg_net_member_schema,
  target_identity.name AS pg_net_member_name,
  target_identity.identity AS pg_net_member_identity
FROM inbound inbound_row
CROSS JOIN LATERAL pg_catalog.pg_identify_object(
  inbound_row.classid,
  inbound_row.objid,
  inbound_row.objsubid
) source_identity
CROSS JOIN LATERAL pg_catalog.pg_identify_object(
  inbound_row.refclassid,
  inbound_row.refobjid,
  inbound_row.refobjsubid
) target_identity
ORDER BY
  source_identity.type,
  source_identity.schema,
  source_identity.name,
  target_identity.identity;

WITH extension_target AS (
  SELECT oid
  FROM pg_catalog.pg_extension
  WHERE extname = 'pg_net'
), members AS (
  SELECT dependency_row.classid,
         dependency_row.objid,
         dependency_row.objsubid
  FROM pg_catalog.pg_depend dependency_row
  JOIN extension_target
    ON dependency_row.refclassid = 'pg_catalog.pg_extension'::regclass
   AND dependency_row.refobjid = extension_target.oid
  WHERE dependency_row.deptype = 'e'
), outbound AS (
  SELECT dependency_row.*
  FROM pg_catalog.pg_depend dependency_row
  JOIN members source
    ON source.classid = dependency_row.classid
   AND source.objid = dependency_row.objid
   AND source.objsubid = dependency_row.objsubid
  LEFT JOIN members target
    ON target.classid = dependency_row.refclassid
   AND target.objid = dependency_row.refobjid
   AND target.objsubid = dependency_row.refobjsubid
  CROSS JOIN extension_target
  WHERE target.objid IS NULL
    AND NOT (
      dependency_row.refclassid = 'pg_catalog.pg_extension'::regclass
      AND dependency_row.refobjid = extension_target.oid
      AND dependency_row.deptype = 'e'
    )
)
SELECT
  source_identity.type AS pg_net_member_type,
  source_identity.schema AS pg_net_member_schema,
  source_identity.name AS pg_net_member_name,
  source_identity.identity AS pg_net_member_identity,
  CASE outbound_row.deptype
    WHEN 'n' THEN 'normal'
    WHEN 'a' THEN 'automatic'
    WHEN 'i' THEN 'internal'
    WHEN 'P' THEN 'partition_primary'
    WHEN 'S' THEN 'partition_secondary'
    ELSE outbound_row.deptype::text
  END AS dependency_type,
  target_identity.type AS required_type,
  target_identity.schema AS required_schema,
  target_identity.name AS required_name,
  target_identity.identity AS required_identity,
  CASE
    WHEN outbound_row.refclassid = 'pg_catalog.pg_proc'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.proowner)
       FROM pg_catalog.pg_proc object_row
       WHERE object_row.oid = outbound_row.refobjid)
    WHEN outbound_row.refclassid = 'pg_catalog.pg_class'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.relowner)
       FROM pg_catalog.pg_class object_row
       WHERE object_row.oid = outbound_row.refobjid)
    WHEN outbound_row.refclassid = 'pg_catalog.pg_type'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.typowner)
       FROM pg_catalog.pg_type object_row
       WHERE object_row.oid = outbound_row.refobjid)
    WHEN outbound_row.refclassid = 'pg_catalog.pg_namespace'::regclass THEN
      (SELECT pg_catalog.pg_get_userbyid(object_row.nspowner)
       FROM pg_catalog.pg_namespace object_row
       WHERE object_row.oid = outbound_row.refobjid)
    ELSE NULL
  END AS required_owner
FROM outbound outbound_row
CROSS JOIN LATERAL pg_catalog.pg_identify_object(
  outbound_row.classid,
  outbound_row.objid,
  outbound_row.objsubid
) source_identity
CROSS JOIN LATERAL pg_catalog.pg_identify_object(
  outbound_row.refclassid,
  outbound_row.refobjid,
  outbound_row.refobjsubid
) target_identity
ORDER BY
  source_identity.type,
  source_identity.schema,
  source_identity.name,
  target_identity.type,
  target_identity.identity;

WITH extension_target AS (
  SELECT extension_row.oid,
         extension_row.extname,
         namespace_row.nspname AS metadata_schema,
         pg_catalog.pg_get_userbyid(extension_row.extowner) AS extension_owner,
         available_row.relocatable
  FROM pg_catalog.pg_extension extension_row
  JOIN pg_catalog.pg_namespace namespace_row
    ON namespace_row.oid = extension_row.extnamespace
  LEFT JOIN pg_catalog.pg_available_extension_versions available_row
    ON available_row.name = extension_row.extname
   AND available_row.version = extension_row.extversion
  WHERE extension_row.extname = 'pg_net'
), member_keys AS (
  SELECT dependency_row.classid,
         dependency_row.objid,
         dependency_row.objsubid
  FROM pg_catalog.pg_depend dependency_row
  JOIN extension_target
    ON dependency_row.refclassid = 'pg_catalog.pg_extension'::regclass
   AND dependency_row.refobjid = extension_target.oid
  WHERE dependency_row.deptype = 'e'
), members AS (
  SELECT
    identified.schema AS object_schema,
    CASE
      WHEN member_row.classid = 'pg_catalog.pg_proc'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.proowner)
         FROM pg_catalog.pg_proc object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_class'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.relowner)
         FROM pg_catalog.pg_class object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_type'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.typowner)
         FROM pg_catalog.pg_type object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_namespace'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.nspowner)
         FROM pg_catalog.pg_namespace object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_operator'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.oprowner)
         FROM pg_catalog.pg_operator object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_collation'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.collowner)
         FROM pg_catalog.pg_collation object_row
         WHERE object_row.oid = member_row.objid)
      WHEN member_row.classid = 'pg_catalog.pg_conversion'::regclass THEN
        (SELECT pg_catalog.pg_get_userbyid(object_row.conowner)
         FROM pg_catalog.pg_conversion object_row
         WHERE object_row.oid = member_row.objid)
      ELSE NULL
    END AS object_owner
  FROM member_keys member_row
  CROSS JOIN LATERAL pg_catalog.pg_identify_object(
    member_row.classid,
    member_row.objid,
    member_row.objsubid
  ) identified
), boundary AS (
  SELECT
    (SELECT count(*) FROM extension_target) AS extension_count,
    (SELECT count(*) FROM members) AS member_count,
    (SELECT count(*) FROM members WHERE object_schema = 'public')
      AS public_member_count,
    (SELECT count(*) FROM members
     WHERE object_owner IS DISTINCT FROM 'supabase_admin')
      AS non_platform_owned_member_count,
    (SELECT count(*) FROM extension_target
     WHERE metadata_schema = 'public') AS public_metadata_namespace_count,
    (SELECT count(*) FROM extension_target
     WHERE extension_owner = 'supabase_admin') AS platform_owned_extension_count,
    (SELECT count(*) FROM extension_target
     WHERE relocatable IS FALSE) AS non_relocatable_extension_count
)
SELECT
  extension_count,
  member_count,
  public_member_count,
  non_platform_owned_member_count,
  public_metadata_namespace_count,
  platform_owned_extension_count,
  non_relocatable_extension_count,
  (
    extension_count = 1
    AND member_count > 0
    AND public_member_count = 0
    AND non_platform_owned_member_count = 0
    AND public_metadata_namespace_count = 1
    AND platform_owned_extension_count = 1
    AND non_relocatable_extension_count = 1
  ) AS boundary_ok,
  1 / CASE
    WHEN extension_count = 1
      AND member_count > 0
      AND public_member_count = 0
      AND non_platform_owned_member_count = 0
      AND public_metadata_namespace_count = 1
      AND platform_owned_extension_count = 1
      AND non_relocatable_extension_count = 1
    THEN 1
    ELSE 0
  END AS boundary_guard
FROM boundary;
