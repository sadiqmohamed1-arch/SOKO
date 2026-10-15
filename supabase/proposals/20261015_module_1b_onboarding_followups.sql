-- =============================================================================
-- PROPOSAL ONLY — Module 1B onboarding follow-ups
-- NOT a migration. Do NOT apply without separate staging approval.
-- PRODUCTION (rzcsdilzpqvwjmzdxwyf) STRICTLY PROHIBITED.
-- Staging ref if approved later: iqzvlsgwphmjuornlbmj
--
-- Current Module 1B client work maps onto EXISTING objects:
--   create_company, request_to_join, submit_verification, profiles UPDATE,
--   companies UPDATE (granted columns), company_taxonomy kinds:
--   category | subcategory | brand | capability | region | market
--
-- Supplier types / contractor classifications are stored as capability tags
-- prefixed with "Type: " (existing client convention) until a dedicated kind exists.
-- =============================================================================

-- 1) Optional taxonomy kind for explicit company "type" / classification
--    (avoids packing types into capability). Requires CHECK constraint change:
--
-- alter table public.company_taxonomy drop constraint company_taxonomy_kind_check;
-- alter table public.company_taxonomy add constraint company_taxonomy_kind_check
--   check (kind in ('category','subcategory','brand','capability','region','market','company_type'));

-- 2) Secure license document upload for submit_verification(p_license_document)
--    Storage + documents pipeline already sketched in 20261011000700_documents_storage.sql.
--    Client still needs an upload helper that returns a document uuid.

-- 3) Claim unclaimed public listing RPC (UI currently blocks with a clear message)
--    create or replace function public.claim_company_listing(...) ...

-- 4) Optional profiles.username (AuthModal collects a preview username today;
--    it is NOT persisted — no username column on public.profiles).

-- 5) Join-request note / preferred role: request_to_join always creates viewer.
--    Preferred role is chosen on approve_join_request — no schema change required
--    unless product wants the requester's preferred role stored on the membership.
;