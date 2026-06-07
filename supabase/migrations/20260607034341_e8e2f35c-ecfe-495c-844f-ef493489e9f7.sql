
CREATE TYPE public.partner_type AS ENUM (
  'state_agency', 'disability_service_provider', 'employment_provider',
  'supported_employment', 'day_program', 'residential_support',
  'independent_living', 'transition_program', 'college_postsecondary',
  'technical_training', 'certificate_program', 'employer',
  'inclusive_employer_lead', 'social_enterprise', 'nonprofit',
  'for_profit_business', 'advocacy_family_support', 'transportation_support',
  'community_resource', 'workforce_development', 'youth_young_adult_program',
  'state_provider_directory', 'state_provider_list', 'vocational_rehabilitation',
  'student_transition_program', 'transition_internship_program'
);

CREATE TYPE public.partner_verification_status AS ENUM (
  'verified', 'potential', 'needs_review', 'pending_approval', 'featured', 'archived'
);

CREATE TYPE public.partner_outreach_status AS ENUM (
  'not_contacted', 'researching', 'outreach_needed', 'contacted',
  'in_conversation', 'approved', 'declined', 'follow_up', 'archived'
);

CREATE TYPE public.partner_opportunity_type AS ENUM (
  'internship', 'job_shadowing', 'volunteer_experience', 'supported_employment',
  'day_program', 'employment_exploration', 'employment_enrichment',
  'certificate_program', 'college_program', 'technical_training',
  'mentorship', 'independent_living_support', 'transportation_support',
  'family_support', 'agency_connection'
);

CREATE TABLE public.partner_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_name TEXT NOT NULL,
  partner_type public.partner_type NOT NULL DEFAULT 'community_resource',
  description TEXT,
  website_url TEXT,
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  county TEXT,
  state TEXT NOT NULL DEFAULT 'CT',
  service_area TEXT,
  audience_served TEXT[] NOT NULL DEFAULT '{}',
  age_range TEXT,
  disability_focus TEXT[] NOT NULL DEFAULT '{}',
  pathway_categories TEXT[] NOT NULL DEFAULT '{}',
  services_offered TEXT[] NOT NULL DEFAULT '{}',
  opportunity_types TEXT[] NOT NULL DEFAULT '{}',
  virtual_or_in_person TEXT,
  transportation_notes TEXT,
  eligibility_notes TEXT,
  referral_process TEXT,
  source_url TEXT,
  verification_status public.partner_verification_status NOT NULL DEFAULT 'needs_review',
  partnership_status TEXT NOT NULL DEFAULT 'potential',
  outreach_status public.partner_outreach_status NOT NULL DEFAULT 'not_contacted',
  outreach_notes TEXT,
  next_follow_up_date DATE,
  admin_notes TEXT,
  collection_tags TEXT[] NOT NULL DEFAULT '{}',
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_public BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  last_reviewed_at TIMESTAMPTZ,
  next_review_due_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_organizations TO authenticated;
GRANT ALL ON public.partner_organizations TO service_role;

ALTER TABLE public.partner_organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read partner directory"
  ON public.partner_organizations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins manage partners"
  ON public.partner_organizations FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER partner_orgs_updated_at
  BEFORE UPDATE ON public.partner_organizations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_partner_orgs_type ON public.partner_organizations(partner_type);
CREATE INDEX idx_partner_orgs_verification ON public.partner_organizations(verification_status);
CREATE INDEX idx_partner_orgs_county ON public.partner_organizations(county);
CREATE INDEX idx_partner_orgs_public ON public.partner_organizations(is_public) WHERE is_public = true;
CREATE INDEX idx_partner_orgs_collection_tags ON public.partner_organizations USING GIN(collection_tags);
CREATE INDEX idx_partner_orgs_pathway ON public.partner_organizations USING GIN(pathway_categories);

CREATE TABLE public.partner_network_opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  opportunity_title TEXT NOT NULL,
  opportunity_type public.partner_opportunity_type NOT NULL DEFAULT 'agency_connection',
  description TEXT,
  location TEXT,
  county TEXT,
  pathway_category TEXT,
  age_range TEXT,
  eligibility TEXT,
  support_level TEXT,
  schedule TEXT,
  cost_or_funding_notes TEXT,
  application_url TEXT,
  contact_email TEXT,
  next_step TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partner_network_opportunities TO authenticated;
GRANT ALL ON public.partner_network_opportunities TO service_role;

ALTER TABLE public.partner_network_opportunities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read network opportunities"
  ON public.partner_network_opportunities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Platform admins manage network opportunities"
  ON public.partner_network_opportunities FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER partner_network_opps_updated_at
  BEFORE UPDATE ON public.partner_network_opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_partner_net_opps_partner ON public.partner_network_opportunities(partner_id);
CREATE INDEX idx_partner_net_opps_type ON public.partner_network_opportunities(opportunity_type);
CREATE INDEX idx_partner_net_opps_county ON public.partner_network_opportunities(county);

CREATE TABLE public.student_saved_partners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL,
  partner_id UUID REFERENCES public.partner_organizations(id) ON DELETE CASCADE,
  opportunity_id UUID REFERENCES public.partner_network_opportunities(id) ON DELETE CASCADE,
  saved_by_user_id UUID NOT NULL,
  notes TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (partner_id IS NOT NULL OR opportunity_id IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_saved_partners TO authenticated;
GRANT ALL ON public.student_saved_partners TO service_role;

ALTER TABLE public.student_saved_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View saved partners via student"
  ON public.student_saved_partners FOR SELECT TO authenticated
  USING (public.can_access_student(auth.uid(), student_id));

CREATE POLICY "Insert saved partners via student"
  ON public.student_saved_partners FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_student(auth.uid(), student_id) AND auth.uid() = saved_by_user_id);

CREATE POLICY "Update saved partners via student"
  ON public.student_saved_partners FOR UPDATE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE POLICY "Delete saved partners via student"
  ON public.student_saved_partners FOR DELETE TO authenticated
  USING (public.can_edit_student(auth.uid(), student_id));

CREATE TRIGGER student_saved_partners_updated_at
  BEFORE UPDATE ON public.student_saved_partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_saved_partners_student ON public.student_saved_partners(student_id);

-- ============================================================
-- SEED
-- ============================================================
INSERT INTO public.partner_organizations
  (organization_name, partner_type, description, website_url, verification_status, partnership_status, outreach_status, collection_tags, pathway_categories, tags, is_featured, source_url)
VALUES
('Connecticut Department of Developmental Services: Employment and Day Services', 'state_agency',
 'Connecticut state agency providing employment, day services, transportation, and job training for adults with intellectual and developmental disabilities.',
 'https://portal.ct.gov/dds', 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways'],
 ARRAY['employment','day_services','adult_services','transition'],
 ARRAY['employment','day services','adult services','DDS','transition','transportation','job training'],
 true, 'https://portal.ct.gov/dds'),
('DDS Find a Provider', 'state_provider_directory',
 'Searchable directory of DDS-qualified providers offering customized employment, day services, healthcare coordination, and behavioral support.',
 'https://portal.ct.gov/dds', 'verified', 'partner', 'approved',
 ARRAY['state_resources','dds_providers'], ARRAY['employment','day_services','adult_services'],
 ARRAY['DDS qualified providers','provider search','adult services','customized employment'], true, 'https://portal.ct.gov/dds'),
('DDS Reimagining Day Services Provider List', 'state_provider_list',
 'Official list of DDS providers participating in the Reimagining Day Services initiative, including Employment Exploration Option and Employment Enrichment Service.',
 'https://portal.ct.gov/dds', 'verified', 'partner', 'approved',
 ARRAY['state_resources','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['Employment Exploration Option','Employment Enrichment Service','day services','employment pathways'], false, 'https://portal.ct.gov/dds'),
('Connecticut Bureau of Rehabilitation Services', 'vocational_rehabilitation',
 'State vocational rehabilitation agency supporting employment, job placement, and work readiness for people with disabilities.',
 'https://portal.ct.gov/aging-and-disability/Content-Pages/Bureaus/Bureau-of-Rehabilitation-Services',
 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways','family_advocacy'], ARRAY['employment','vocational_rehabilitation'],
 ARRAY['employment','vocational rehabilitation','job placement','work readiness','disability services'], true, 'https://portal.ct.gov/aging-and-disability'),
('CT Level Up Program', 'student_transition_program',
 'Pre-employment transition program for students ages 16–22 with IEPs or 504 plans. Covers job exploration, work-based learning, self-advocacy, work readiness, and postsecondary counseling.',
 'https://portal.ct.gov/aging-and-disability', 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways','postsecondary'], ARRAY['employment','postsecondary','transition'],
 ARRAY['ages 16-22','IEP','504','job exploration','work-based learning','self-advocacy','postsecondary counseling'], true, 'https://portal.ct.gov/aging-and-disability'),
('CT Project SEARCH', 'transition_internship_program',
 'Intensive transition internship program for young adults with disabilities, in partnership with DDS, offering immersive employment training.',
 'https://www.projectsearch.us/', 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways'], ARRAY['employment','transition'],
 ARRAY['internship','employment training','DDS','transition-age youth','intensive employment skills'], true, 'https://www.projectsearch.us/'),
('The Kennedy Collective', 'disability_service_provider', 'Connecticut provider of employment services, day programs, and community supports for people with disabilities.',
 'https://thekennedycollective.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways'], ARRAY['employment','day_services','adult_services'],
 ARRAY['adult services','employment','day program','supported employment','community participation'], false, null),
('Oak Hill', 'disability_service_provider', 'Statewide CT provider of residential, day, employment, and family supports for people with disabilities.',
 'https://www.oakhillct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','residential','independent_living','day_services'],
 ARRAY['adult services','residential support','day program','independent living','IDD services'], false, null),
('Ability Beyond', 'disability_service_provider', 'Disability service provider offering employment, day, and residential supports across CT and NY.',
 'https://www.abilitybeyond.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways'], ARRAY['employment','residential','day_services'],
 ARRAY['supported employment','day program','residential support','adult services'], false, null),
('Abilis', 'disability_service_provider', 'Fairfield County provider of lifespan services for people with IDD and their families.',
 'https://www.abilis.us', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','family_support','independent_living'],
 ARRAY['IDD services','family support','life skills','adult services'], false, null),
('Vista Life Innovations', 'independent_living', 'Madison-based provider of life skills and independent living programs for adults with disabilities.',
 'https://www.vistalifeinnovations.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['independent_living','transition'],
 ARRAY['independent living','life skills','transition planning'], false, null),
('Dungarvin Connecticut', 'disability_service_provider', 'Provides residential and day services to adults with IDD in Connecticut.',
 'https://www.dungarvin.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['residential','day_services'],
 ARRAY['residential support','day program','IDD services'], false, null),
('Abilities Without Boundaries', 'employment_provider', 'CT provider of supported employment, day services, and community participation.',
 'https://abilitieswb.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program','community participation'], false, null),
('Benhaven', 'disability_service_provider', 'CT organization serving children and adults on the autism spectrum across education, day, and residential programs.',
 'https://benhaven.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','family_advocacy'], ARRAY['day_services','residential','family_support'],
 ARRAY['autism support','adult services','family support'], false, null),
('Autism Services & Resources Connecticut', 'advocacy_family_support', 'Statewide CT autism resource and advocacy organization for individuals and families.',
 'https://www.asrc.us', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','family_advocacy'], ARRAY['family_support','advocacy'],
 ARRAY['autism support','family support','advocacy','resource navigation'], false, null),
('St. Vincent''s Special Needs Services', 'disability_service_provider', 'Provides specialized day and therapy services for children and adults with significant disabilities.',
 'https://www.stvincentsspecialneeds.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['day_services','family_support'],
 ARRAY['day program','IDD services','family support'], false, null),
('Aspire Living & Learning', 'disability_service_provider', 'Multi-state provider including CT, offering residential, day, and employment supports.',
 'https://www.aspirelivingandlearning.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','residential','day_services'],
 ARRAY['residential support','supported employment','day program'], false, null),
('Chapel Haven Schleifer Center', 'transition_program', 'New Haven program teaching social, life, and vocational skills to adults with developmental and social disabilities.',
 'https://www.chapelhaven.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','dds_reimagining','postsecondary'], ARRAY['independent_living','transition','employment'],
 ARRAY['independent living','life skills','transition planning','social skills'], true, null),
('Easterseals Capital Region & Eastern CT', 'disability_service_provider', 'Disability services across central and eastern CT including workforce, day, and family supports.',
 'https://www.eastersealsct.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services','family_support'],
 ARRAY['supported employment','day program','family support'], false, null),
('Easterseals Greater Waterbury', 'disability_service_provider', 'Disability services in the Greater Waterbury area: rehab, employment, and family programs.',
 'https://www.eastersealsgw.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program'], false, null),
('Goodwill of Western and Northern Connecticut', 'employment_provider', 'Workforce development, job training, and employment support across western and northern CT.',
 'https://www.goodwillwct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','workforce'],
 ARRAY['supported employment','job placement','workforce readiness'], true, null),
('HARC', 'disability_service_provider', 'Hartford-area provider of lifespan services for people with IDD including employment, day, and residential.',
 'https://www.harc-ct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services','residential'],
 ARRAY['IDD services','supported employment','day program','residential support'], false, null),
('FAVARH (The Arc Farmington Valley)', 'disability_service_provider', 'Farmington Valley Arc affiliate providing employment, day, residential, and family supports.',
 'https://favarh.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services','residential','family_support'],
 ARRAY['supported employment','day program','IDD services','family support'], false, null),
('STAR Inc., Lighting the Way', 'disability_service_provider', 'Fairfield County provider of lifespan IDD services including employment and day programs.',
 'https://starct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program','IDD services'], false, null),
('UCP of Eastern Connecticut', 'disability_service_provider', 'Eastern CT provider of disability services including employment and day programs.',
 'https://www.ucpect.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program'], false, null),
('Opportunity Works CT', 'employment_provider', 'CT employment-focused provider offering supported and competitive employment.',
 'https://opportunityworksct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment'],
 ARRAY['supported employment','competitive employment','employment placement'], false, null),
('Viability', 'employment_provider', 'Multi-state nonprofit including CT offering employment, day, and behavioral health services.',
 'https://www.viability.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','dds_reimagining'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program','behavioral health'], false, null),
('Kuhn Employment Opportunities', 'employment_provider', 'CT supported employment agency focused on competitive integrated employment.',
 'https://www.kuhnemployment.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways'], ARRAY['employment'],
 ARRAY['supported employment','job coaching','competitive employment'], false, null),
('Team Woofgang & Co.', 'social_enterprise', 'CT social enterprise dog-treat bakery employing young adults with disabilities.',
 'https://www.teamwoofgang.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','employment_pathways','social_enterprises'], ARRAY['employment'],
 ARRAY['social enterprise','employment placement','young adults'], true, null),
('SARAH Inc.', 'disability_service_provider', 'Shoreline CT provider of IDD services including employment and day programs.',
 'https://sarah-inc.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','day_services'],
 ARRAY['supported employment','day program','IDD services'], false, null),
('Marrakech Inc.', 'disability_service_provider', 'Statewide CT provider of disability, behavioral health, and housing services.',
 'https://www.marrakechinc.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','residential','independent_living'],
 ARRAY['residential support','supported employment','community participation'], false, null),
('Journey Found', 'disability_service_provider', 'Tolland-County-based provider of residential, day, and employment supports.',
 'https://journeyfound.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','day_services','residential'],
 ARRAY['residential support','day program','supported employment'], false, null),
('ARI of Connecticut', 'disability_service_provider', 'Stamford-based provider of residential, day, and employment supports for adults with IDD.',
 'https://www.ariofct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers'], ARRAY['employment','day_services','residential'],
 ARRAY['IDD services','residential support','day program'], false, null),
('The Arc Connecticut', 'advocacy_family_support', 'Statewide advocacy organization for people with IDD and their families. Coordinates local Arc chapters.',
 'https://www.thearcct.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['ct_disability_providers','family_advocacy'], ARRAY['advocacy','family_support'],
 ARRAY['advocacy','family support','disability rights'], true, null),
('ACORD', 'day_program', 'CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('ALLIED Community Resources', 'day_program', 'CT provider participating in DDS Reimagining Day Services.',
 'https://www.alliedgroup.org', 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('Alternatives', 'day_program', 'CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('BARC', 'day_program', 'CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('DACS Foundation', 'day_program', 'CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('Easter Seals CREC', 'day_program', 'CREC/Easter Seals CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('EdAdvance', 'day_program', 'Northwest CT regional educational service center providing transition supports and DDS Reimagining services.',
 'https://www.edadvance.org', 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment','transition'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('Horizons Programs, Inc.', 'day_program', 'CT provider participating in DDS Reimagining Day Services.', null, 'needs_review', 'potential', 'researching',
 ARRAY['dds_reimagining'], ARRAY['day_services','employment'],
 ARRAY['Employment Exploration Option','Needs Review'], false, null),
('Best Buddies Jobs Program (Connecticut)', 'employment_provider', 'Supported employment for young adults with IDD through the Best Buddies Jobs program.',
 'https://www.bestbuddies.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['employment_pathways'], ARRAY['employment'],
 ARRAY['supported employment','job coaching','young adults'], false, null),
('Local American Job Centers (Connecticut)', 'workforce_development', 'Statewide network of American Job Centers offering workforce development services.',
 'https://www.ctdol.state.ct.us', 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways','family_advocacy'], ARRAY['employment','workforce'],
 ARRAY['workforce readiness','job placement','employment support'], false, null),
('Connecticut Workforce Development Boards', 'workforce_development', 'Regional workforce development boards across CT.',
 'https://www.ctdol.state.ct.us', 'verified', 'partner', 'approved',
 ARRAY['state_resources','employment_pathways'], ARRAY['employment','workforce'],
 ARRAY['workforce readiness','employment support','employer partnerships'], false, null),
('Travelers', 'inclusive_employer_lead', 'Hartford-headquartered insurance employer; potential inclusive employer lead.',
 'https://www.travelers.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','employer','corporate'], false, null),
('New Canaan YMCA', 'inclusive_employer_lead', 'Community YMCA; potential inclusive employer lead and volunteer placement.',
 'https://newcanaanymca.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment','community'],
 ARRAY['Potential Opportunity Lead','community center','volunteer'], false, null),
('Amazon Connecticut Facilities', 'inclusive_employer_lead', 'Amazon warehouse and operations facilities in CT; potential inclusive employer lead.',
 'https://www.amazon.jobs', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','warehouse','logistics'], false, null),
('CVS Health', 'inclusive_employer_lead', 'CVS Health with significant CT footprint; potential inclusive employer lead.',
 'https://jobs.cvshealth.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','retail','healthcare'], false, null),
('Walgreens', 'inclusive_employer_lead', 'National pharmacy retailer with CT locations; potential inclusive employer lead.',
 'https://jobs.walgreens.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','retail'], false, null),
('Home Depot', 'inclusive_employer_lead', 'Home improvement retailer with multiple CT stores; potential inclusive employer lead.',
 'https://careers.homedepot.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','retail'], false, null),
('AMC Theatres', 'inclusive_employer_lead', 'Movie theatre chain with CT locations; potential inclusive employer lead.',
 'https://careers.amctheatres.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','hospitality'], false, null),
('Hilton & Hospitality Employers (CT)', 'inclusive_employer_lead', 'Hilton-branded and other CT hospitality employers; potential inclusive employer leads.',
 'https://jobs.hilton.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','hospitality','hotel'], false, null),
('Hartford HealthCare', 'inclusive_employer_lead', 'Statewide CT health system; potential inclusive employer lead.',
 'https://hartfordhealthcare.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','healthcare'], false, null),
('Yale New Haven Health', 'inclusive_employer_lead', 'Major CT health system; potential inclusive employer lead.',
 'https://www.ynhhs.org', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','healthcare'], false, null),
('Walmart (CT Stores)', 'inclusive_employer_lead', 'National retailer with CT stores; potential inclusive employer lead.',
 'https://careers.walmart.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','retail'], false, null),
('Stop & Shop / Grocery Employers (CT)', 'inclusive_employer_lead', 'Regional grocery employers including Stop & Shop; potential inclusive employer leads.',
 'https://stopandshop.com', 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','grocery','retail'], false, null),
('Local Restaurants & Cafes (CT)', 'inclusive_employer_lead', 'Locally owned restaurants and cafes across CT; potential inclusive employer leads via partner outreach.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','food service','local'], false, null),
('Local Libraries (CT)', 'inclusive_employer_lead', 'Municipal libraries across CT; potential placement and volunteer leads.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads','community_resources'], ARRAY['employment','community'],
 ARRAY['Potential Opportunity Lead','library','community','volunteer'], false, null),
('Parks & Recreation Departments (CT)', 'inclusive_employer_lead', 'Municipal parks and recreation departments across CT.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads','community_resources'], ARRAY['employment','community'],
 ARRAY['Potential Opportunity Lead','parks','recreation','seasonal'], false, null),
('Animal Shelters & Pet Businesses (CT)', 'inclusive_employer_lead', 'Local animal shelters and pet care businesses across CT.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment','volunteer'],
 ARRAY['Potential Opportunity Lead','animals','volunteer'], false, null),
('Senior & Community Centers (CT)', 'inclusive_employer_lead', 'Senior and community centers across CT; potential placement and volunteer leads.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads','community_resources'], ARRAY['employment','community'],
 ARRAY['Potential Opportunity Lead','senior services','community'], false, null),
('Manufacturing Employers (CT)', 'inclusive_employer_lead', 'CT manufacturing employers; potential inclusive employer leads.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','manufacturing','trades'], false, null),
('Healthcare Support Employers (CT)', 'inclusive_employer_lead', 'Healthcare support roles across CT clinics, dental practices, and long-term care.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','healthcare','support'], false, null),
('Retail Employers (CT)', 'inclusive_employer_lead', 'General retail employer leads across CT.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','retail'], false, null),
('Facilities & Maintenance Employers (CT)', 'inclusive_employer_lead', 'CT facilities, custodial, and maintenance employers.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','facilities','trades'], false, null),
('Digital Media & Creative Businesses (CT)', 'inclusive_employer_lead', 'CT digital media, design, and creative businesses; potential inclusive employer leads.',
 null, 'potential', 'potential', 'outreach_needed',
 ARRAY['inclusive_employer_leads'], ARRAY['employment'],
 ARRAY['Potential Opportunity Lead','creative','digital media'], false, null),
('Connecticut State Community College (CT State)', 'college_postsecondary', 'Unified CT community college system with campuses statewide.',
 'https://www.ctstate.edu', 'verified', 'partner', 'approved',
 ARRAY['postsecondary','state_resources'], ARRAY['postsecondary','employment'],
 ARRAY['college readiness','postsecondary education','disability services','adult education'], true, null),
('Gateway Community College', 'college_postsecondary', 'Community college campus in New Haven; part of CT State.',
 'https://www.gatewayct.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services','accommodations'], false, null),
('Housatonic Community College', 'college_postsecondary', 'Community college campus in Bridgeport; part of CT State.',
 'https://www.housatonic.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services'], false, null),
('Manchester Community College', 'college_postsecondary', 'Community college campus in Manchester; part of CT State.',
 'https://www.manchestercc.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services'], false, null),
('Naugatuck Valley Community College', 'college_postsecondary', 'Community college campus in Waterbury; part of CT State.',
 'https://www.nv.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services','technical training'], false, null),
('Middlesex Community College', 'college_postsecondary', 'Community college campus in Middletown; part of CT State.',
 'https://www.mxcc.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services'], false, null),
('Three Rivers Community College', 'college_postsecondary', 'Community college campus in Norwich; part of CT State.',
 'https://www.threerivers.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','disability services'], false, null),
('Goodwin University', 'college_postsecondary', 'East Hartford private university with strong career-focused and disability-services programs.',
 'https://www.goodwin.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary','employment'],
 ARRAY['college readiness','technical training','career training'], false, null),
('Albertus Magnus College', 'college_postsecondary', 'Private liberal arts college in New Haven offering adult education programs.',
 'https://www.albertus.edu', 'potential', 'potential', 'outreach_needed',
 ARRAY['postsecondary'], ARRAY['postsecondary'],
 ARRAY['college readiness','adult education'], false, null),
('Connecticut Technical Education and Career System', 'technical_training', 'Statewide technical high school and adult education system.',
 'https://www.cttech.org', 'verified', 'partner', 'approved',
 ARRAY['postsecondary','state_resources'], ARRAY['postsecondary','employment','technical_training'],
 ARRAY['technical training','certificate program','workforce pathway'], true, null),
('Adult Education Programs (CT)', 'certificate_program', 'Connecticut local adult education programs offering high school completion, ESL, and career pathways.',
 'https://portal.ct.gov/sde', 'verified', 'partner', 'approved',
 ARRAY['postsecondary','state_resources'], ARRAY['postsecondary','adult_education'],
 ARRAY['adult education','high school completion','career training'], false, null),
('Apprenticeship Programs (CT DOL)', 'workforce_development', 'CT registered apprenticeship programs across trades and growing industries.',
 'https://www.ctdol.state.ct.us/progsupt/appren/index.htm', 'verified', 'partner', 'approved',
 ARRAY['postsecondary','state_resources'], ARRAY['employment','workforce'],
 ARRAY['apprenticeship','career training','workforce pathway'], false, null),
('Manufacturing Training Programs (CT)', 'technical_training', 'Manufacturing-focused training pathways across CT community colleges and providers.',
 null, 'needs_review', 'potential', 'researching',
 ARRAY['postsecondary'], ARRAY['employment','technical_training'],
 ARRAY['manufacturing','technical training'], false, null),
('Healthcare Certificate Programs (CT)', 'certificate_program', 'Healthcare certificate pathways (CNA, medical assistant, etc.) across CT providers.',
 null, 'needs_review', 'potential', 'researching',
 ARRAY['postsecondary'], ARRAY['employment','technical_training'],
 ARRAY['healthcare','certificate program'], false, null),
('Culinary and Hospitality Training (CT)', 'certificate_program', 'Culinary and hospitality training programs across CT.',
 null, 'needs_review', 'potential', 'researching',
 ARRAY['postsecondary'], ARRAY['employment','technical_training'],
 ARRAY['culinary','hospitality','certificate program'], false, null),
('Digital Media & Creative Training (CT)', 'certificate_program', 'Digital media and creative training programs across CT.',
 null, 'needs_review', 'potential', 'researching',
 ARRAY['postsecondary'], ARRAY['employment','technical_training'],
 ARRAY['digital media','creative','certificate program'], false, null),
('College Disability Services Offices (CT)', 'community_resource', 'Disability services offices at CT colleges and universities providing accommodations support.',
 null, 'verified', 'partner', 'approved',
 ARRAY['postsecondary','family_advocacy'], ARRAY['postsecondary'],
 ARRAY['disability services','accommodations','college readiness'], false, null),
('Connecticut Parent Advocacy Center (CPAC)', 'advocacy_family_support', 'CT''s Parent Training and Information Center supporting families of children with disabilities.',
 'https://www.cpacinc.org', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy','state_resources'], ARRAY['family_support','advocacy'],
 ARRAY['family support','special education navigation','advocacy','parent support'], true, null),
('211 Connecticut', 'community_resource', 'Statewide information and referral service for health and human services.',
 'https://www.211ct.org', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy','community_resources','state_resources'], ARRAY['family_support'],
 ARRAY['resource navigation','family support','benefits'], false, null),
('DDS Regional Offices', 'state_agency', 'Connecticut DDS regional offices serving local service areas.',
 'https://portal.ct.gov/dds', 'verified', 'partner', 'approved',
 ARRAY['state_resources','family_advocacy'], ARRAY['adult_services'],
 ARRAY['DDS','adult services','resource navigation'], false, null),
('BRS Regional Offices', 'state_agency', 'Bureau of Rehabilitation Services regional offices for vocational rehabilitation in CT.',
 'https://portal.ct.gov/aging-and-disability', 'verified', 'partner', 'approved',
 ARRAY['state_resources','family_advocacy','employment_pathways'], ARRAY['employment'],
 ARRAY['BRS','vocational rehabilitation','employment'], false, null),
('Disability Rights Connecticut', 'advocacy_family_support', 'CT''s protection and advocacy agency for people with disabilities.',
 'https://www.disrightsct.org', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy'], ARRAY['advocacy','family_support'],
 ARRAY['disability rights','advocacy','legal support'], false, null),
('Local SEPTA Groups (CT)', 'advocacy_family_support', 'Local Special Education PTA chapters across CT school districts.',
 null, 'potential', 'potential', 'researching',
 ARRAY['family_advocacy'], ARRAY['family_support','advocacy','school_collaboration'],
 ARRAY['parent support','school collaboration','special education navigation'], false, null),
('Higher Heights Youth Empowerment Programs', 'youth_young_adult_program', 'CT-based youth empowerment and college access program.',
 'https://higherheightsyouth.org', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy','postsecondary'], ARRAY['postsecondary','transition'],
 ARRAY['college access','youth empowerment','community'], true, null),
('RISE Network', 'youth_young_adult_program', 'CT network supporting public high schools to improve postsecondary outcomes for students.',
 'https://risenetwork.org', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy','postsecondary'], ARRAY['postsecondary','transition'],
 ARRAY['high school','postsecondary','college access'], true, null),
('Dalio Education', 'nonprofit', 'Connecticut philanthropic initiative supporting opportunity youth and education.',
 'https://www.dalio.com/education', 'verified', 'partner', 'approved',
 ARRAY['family_advocacy','postsecondary'], ARRAY['postsecondary','transition'],
 ARRAY['opportunity youth','education','community'], false, null);

INSERT INTO public.partner_network_opportunities (partner_id, opportunity_title, opportunity_type, description, county, pathway_category, age_range, eligibility, next_step, status)
SELECT id, 'Pre-Employment Transition Services (Pre-ETS)', 'employment_exploration',
  'Job exploration counseling, work-based learning, counseling on postsecondary options, workplace readiness training, and self-advocacy.',
  'Statewide', 'employment', '16-22',
  'Students ages 16-22 with an IEP or 504 plan',
  'Contact your local BRS office or ask your school transition coordinator', 'open'
FROM public.partner_organizations WHERE organization_name = 'CT Level Up Program';

INSERT INTO public.partner_network_opportunities (partner_id, opportunity_title, opportunity_type, description, county, pathway_category, age_range, eligibility, next_step, status)
SELECT id, 'Project SEARCH Internship', 'internship',
  'Year-long classroom + internship rotations at host businesses for transition-age young adults.',
  'Statewide', 'employment', '18-24',
  'Transition-age youth and young adults with IDD; DDS eligibility helpful',
  'Apply through your DDS case manager or school transition team', 'open'
FROM public.partner_organizations WHERE organization_name = 'CT Project SEARCH';

INSERT INTO public.partner_network_opportunities (partner_id, opportunity_title, opportunity_type, description, county, pathway_category, age_range, next_step, status)
SELECT id, 'Vocational Rehabilitation Intake', 'agency_connection',
  'Connect with a BRS counselor to open a VR case for employment supports.',
  'Statewide', 'employment', '14+',
  'Apply via the BRS Regional Office serving your area', 'open'
FROM public.partner_organizations WHERE organization_name = 'Connecticut Bureau of Rehabilitation Services';

INSERT INTO public.partner_network_opportunities (partner_id, opportunity_title, opportunity_type, description, county, pathway_category, age_range, next_step, status)
SELECT id, 'Find a DDS-Qualified Provider', 'agency_connection',
  'Search the DDS provider directory for adult services in your area.',
  'Statewide', 'adult_services', '18+',
  'Visit the DDS Find a Provider directory and filter by service type and region', 'open'
FROM public.partner_organizations WHERE organization_name = 'DDS Find a Provider';
