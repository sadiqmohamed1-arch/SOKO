-- =============================================================================
-- PROPOSAL ONLY — Module 1B Registration & Identity Architecture
-- NOT a migration. Do NOT apply without separate staging approval.
-- Staging (if approved): iqzvlsgwphmjuornlbmj
-- PRODUCTION rzcsdilzpqvwjmzdxwyf STRICTLY PROHIBITED.
--
-- Client (this branch) already implements dual registration UX and maps onto:
--   auth.users + public.profiles          → individual identity
--   public.companies + create_company     → organization identity (own soko_id)
--   public.company_memberships + RPCs     → memberships (admin / member / pending)
--   company_taxonomy capability "OrgType:"→ org classification until dedicated kind
--   profiles.title                        → professional classification (interim)
-- =============================================================================

-- A) Expand company_kind OR add org_classification text/enum on companies
--    Product wants: Supplier/Manufacturer, Contractor/Subcontractor, Developer,
--    Consultant/Engineering, Service Provider, Other — today only supplier|contractor.

-- B) company_taxonomy kind 'company_type' (see prior proposal) for primary + secondary activities

-- C) profiles.professional_classification text (and optional username unique)
--    alter table public.profiles add column professional_classification text
--      check (char_length(professional_classification) <= 120);
--    alter table public.profiles add column username citext unique;

-- D) Explicit Company Owner vs Admin (today is_admin roles: supplier_admin / contractor_admin)
--    Optional: membership.is_primary_admin boolean + transfer_primary_admin RPC
--    Recovery RPC must require verified org authority (not email-domain alone).

-- E) LinkedIn OAuth via Supabase Auth provider (no custom JWT). Keep personal identity
--    separate; memberships attached after OAuth the same as email users.

-- F) claim_company_listing + license document upload (prior proposal)

-- G) Secure admin recovery when zero admins remain — platform_admins mediated workflow only.
;