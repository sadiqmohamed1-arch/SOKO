-- Rollback for migration 03 — companies and memberships.
-- DESTROYS every company, membership, invitation and verification.
drop function if exists public.review_verification(uuid, boolean, text);
drop function if exists public.submit_verification(uuid, text, text, date, uuid);
drop function if exists public.remove_member(uuid);
drop function if exists public.change_member_role(uuid, text);
drop function if exists public.decline_join_request(uuid);
drop function if exists public.approve_join_request(uuid, text);
drop function if exists public.request_to_join(uuid);
drop function if exists public.accept_invitation(text);
drop function if exists public.revoke_invitation(uuid);
drop function if exists public.invite_member(uuid, text, text);
drop function if exists public.create_company(public.company_kind, text, text, text, text, text);

drop policy if exists profiles_select_teammates on public.profiles;

drop table if exists public.company_verifications cascade;
drop table if exists public.company_invitations cascade;
drop table if exists public.company_memberships cascade;
drop table if exists public.company_public_contacts cascade;
drop table if exists public.company_certifications cascade;
drop table if exists public.company_taxonomy cascade;
drop table if exists public.companies cascade;

drop function if exists private.guard_last_admin();
drop function if exists private.shares_company_with(uuid);
drop function if exists private.is_company_admin(uuid);
drop function if exists private.has_permission(uuid, text);
drop function if exists private.is_member(uuid);
drop function if exists private.my_company_ids();
drop function if exists private.guard_company_kind();
