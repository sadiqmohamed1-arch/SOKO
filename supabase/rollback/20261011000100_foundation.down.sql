-- Rollback for migration 01 — foundation. Run last.
drop table if exists public.plans cascade;
drop table if exists public.role_document_access cascade;
drop table if exists public.role_permissions cascade;
drop table if exists public.roles cascade;
drop table if exists public.permissions cascade;

drop type if exists public.subscription_status;
drop type if exists public.response_availability;
drop type if exists public.campaign_event_type;
drop type if exists public.campaign_status;
drop type if exists public.campaign_kind;
drop type if exists public.interest_status;
drop type if exists public.urgency;
drop type if exists public.opportunity_group;
drop type if exists public.opportunity_type;
drop type if exists public.connection_status;
drop type if exists public.vendor_doc_status;
drop type if exists public.vendor_approval_status;
drop type if exists public.task_status;
drop type if exists public.visit_status;
drop type if exists public.product_status;
drop type if exists public.doc_access_level;
drop type if exists public.verification_status;
drop type if exists public.membership_status;
drop type if exists public.company_kind;

-- Migration 01 does not alter default privileges, so none are restored here.
-- The function registry and its helpers go with the SOKO-owned schema.
drop schema if exists private cascade;
