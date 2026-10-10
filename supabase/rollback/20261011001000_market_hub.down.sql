-- Rollback for migration 10 — Market Hub. DESTROYS opportunities and campaigns.
-- Credit ledger rows that reference campaigns (ref_id) are kept; balances stay correct.
drop function if exists private.activate_due_campaigns();
drop function if exists public.get_campaign_responses(uuid);
drop function if exists public.get_campaign_stats(uuid);
drop function if exists public.record_campaign_event(uuid, public.campaign_event_type, boolean, text);
drop function if exists public.set_campaign_status(uuid, public.campaign_status);
drop function if exists public.review_campaign(uuid, boolean, text);
drop function if exists public.submit_campaign(uuid);
drop function if exists public.set_interest_status(uuid, public.interest_status);
drop function if exists public.my_opportunity_ids();
drop function if exists public.get_opportunity_details(uuid);

drop table if exists public.supplier_mutes cascade;
drop table if exists public.buyer_preferences cascade;
drop table if exists public.campaign_events cascade;
drop table if exists public.campaign_responses cascade;
drop table if exists public.campaign_recipients cascade;
drop table if exists public.campaigns cascade;
drop table if exists public.saved_opportunities cascade;
drop table if exists public.opportunity_interests cascade;
drop table if exists public.opportunities cascade;

drop function if exists private.interest_created_notify();
drop function if exists private.opportunity_owner_defaults();
drop function if exists private.campaign_company(uuid);
drop function if exists private.is_campaign_recipient(uuid);
drop function if exists private.can_express_interest(uuid, uuid);
drop function if exists private.is_opportunity_manager(uuid);
drop function if exists private.is_opportunity_member(uuid);
drop function if exists private.notify_platform_admins(text, jsonb);

-- Restore the migration-09 definition of is_counterparty (without Market Hub).
create or replace function private.is_counterparty(p_company uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
      select 1 from public.visits v
      where (v.host_company_id = p_company and private.is_member(v.supplier_company_id))
         or (v.supplier_company_id = p_company and private.is_member(v.host_company_id)))
    or exists (
      select 1 from public.document_shares s
      where s.revoked_at is null
        and ((s.owner_company_id = p_company and private.is_member(s.recipient_company_id))
          or (s.recipient_company_id = p_company and private.is_member(s.owner_company_id))))
    or exists (
      select 1 from public.vendor_records vr
      where (vr.supplier_company_id = p_company and private.is_member(vr.contractor_company_id))
         or (vr.contractor_company_id = p_company and private.is_member(vr.supplier_company_id)));
$$;
