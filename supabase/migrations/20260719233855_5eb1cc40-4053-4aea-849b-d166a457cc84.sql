
-- Slice D3: seed shadow-channel rules version + IDEA/CSDE knowledge sources.
-- Idempotent via ON CONFLICT on natural unique keys (version / slug).

INSERT INTO public.pathway_rules_versions
  (version, effective_at, engine_channel, description, checksum, ruleset)
VALUES (
  'rules@2026.07.19-shadow',
  now(),
  'shadow',
  'Initial dormant ruleset: age-band bucketing (MS/EHS/LHS/Post-18), minimum evidence gate (profile + student_voice), refusal path when signals sparse. Consumed by RecommendationV1 gate; no writer wired yet.',
  'sha256:d2-seed-2026-07-19',
  jsonb_build_object(
    'schema', 'pathway.rules.v1',
    'age_bands', jsonb_build_array(
      jsonb_build_object('id','middle_school','min_age',11,'max_age',14),
      jsonb_build_object('id','early_high_school','min_age',14,'max_age',16),
      jsonb_build_object('id','late_high_school','min_age',16,'max_age',18),
      jsonb_build_object('id','post_18','min_age',18,'max_age',22)
    ),
    'min_evidence_for_pillar', jsonb_build_array('profile','student_voice'),
    'pillars', jsonb_build_array(
      'postsecondary_education','employment','independent_living','community_participation'
    ),
    'refusal_pillar', 'assessment',
    'timeframes', jsonb_build_array('30_day','90_day','6_month','1_year'),
    'confidence_levels', jsonb_build_array('low','medium','high')
  )
)
ON CONFLICT (version) DO NOTHING;

INSERT INTO public.pathway_knowledge_sources
  (slug, title, publisher, source_url, jurisdiction, kind, version, checksum, fetched_at, metadata)
VALUES
  (
    'idea-2004-part-b-secondary-transition',
    'IDEA 2004 — Part B, Secondary Transition (34 CFR 300.43, 300.320(b))',
    'U.S. Department of Education, Office of Special Education Programs',
    'https://sites.ed.gov/idea/regs/b/a/300.43',
    'US-Federal',
    'regulation',
    '2004',
    'sha256:idea-2004-part-b-transition',
    now(),
    jsonb_build_object(
      'covers', jsonb_build_array(
        'transition services definition',
        'measurable postsecondary goals',
        'transition assessments',
        'coordinated set of activities'
      ),
      'age_of_applicability', '16+ (or younger if determined by IEP team)',
      'notes','Primary federal grounding for postsecondary/employment/independent-living recommendations.'
    )
  ),
  (
    'csde-secondary-transition-guide-2024',
    'CSDE Secondary Transition Resource Manual',
    'Connecticut State Department of Education, Bureau of Special Education',
    'https://portal.ct.gov/-/media/SDE/Special-Education/Transition/Secondary_Transition_Resource_Manual.pdf',
    'US-CT',
    'guidance',
    '2024',
    'sha256:csde-transition-manual-2024',
    now(),
    jsonb_build_object(
      'covers', jsonb_build_array(
        'CT-specific transition planning timeline',
        'adult service agency linkages (BRS, DDS, DMHAS)',
        'age-of-majority and rights transfer',
        'Summary of Performance (SOP)'
      ),
      'notes','Primary state grounding; used to localize federal IDEA guidance for CT students.'
    )
  ),
  (
    'ct-rights-transfer-age-18',
    'CT Rights Transfer at Age 18 — Parent/Student Notice',
    'Connecticut State Department of Education',
    'https://portal.ct.gov/SDE/Special-Education/Bureau-of-Special-Education/Transition',
    'US-CT',
    'guidance',
    '2023',
    'sha256:ct-rights-transfer-2023',
    now(),
    jsonb_build_object(
      'covers', jsonb_build_array('age of majority','educational decision-making','supported decision-making'),
      'notes','Required notice at least one year before student turns 18.'
    )
  ),
  (
    'wioa-pre-ets-2014',
    'WIOA Pre-Employment Transition Services (Pre-ETS)',
    'U.S. Department of Labor / Rehabilitation Services Administration',
    'https://www.dol.gov/agencies/odep/program-areas/individuals/youth/transition',
    'US-Federal',
    'regulation',
    '2014',
    'sha256:wioa-pre-ets-2014',
    now(),
    jsonb_build_object(
      'covers', jsonb_build_array(
        'job exploration counseling',
        'work-based learning',
        'counseling on postsecondary options',
        'workplace readiness training',
        'self-advocacy instruction'
      ),
      'notes','Grounding for employment-pillar recommendations for students ages 14-21.'
    )
  )
ON CONFLICT (slug) DO NOTHING;
