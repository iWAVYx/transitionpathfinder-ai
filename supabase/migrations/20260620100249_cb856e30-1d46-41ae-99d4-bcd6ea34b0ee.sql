UPDATE public.site_settings 
SET setting_value = '"hello@transitionforwardct.com"'::jsonb 
WHERE setting_key = 'contact_email';