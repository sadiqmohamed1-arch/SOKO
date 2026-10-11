-- =============================================================================
-- SOKO security tests — unauthorized access attempts
--
-- Runs entirely inside one transaction and ends with ROLLBACK, so the fixture
-- users, companies and records below never persist. Run it as the database
-- owner (postgres) against a NON-production database, after all migrations.
--
-- Each check records PASS/FAIL into soko_test.results; the final SELECT lists
-- them and the closing DO block raises if anything failed.
-- Fixture emails use the reserved .test TLD and cannot receive mail.
-- =============================================================================
begin;

create schema soko_test;
create table soko_test.results (n serial primary key, label text not null, passed boolean not null, detail text);
create table soko_test.ids (key text primary key, id uuid not null);
create table soko_test.secrets (key text primary key, value text not null);
grant usage on schema soko_test to anon, authenticated, service_role;
grant all on all tables in schema soko_test to anon, authenticated, service_role;
grant all on all sequences in schema soko_test to anon, authenticated, service_role;

create function soko_test.id(p_key text) returns uuid language sql stable as
  $$ select id from soko_test.ids where key = p_key $$;

create function soko_test.as_user(p_key text) returns void language sql as $$
  select set_config('request.jwt.claims',
           json_build_object('sub', soko_test.id(p_key), 'role', 'authenticated')::text, true),
         set_config('request.jwt.claim.sub', soko_test.id(p_key)::text, true);
$$;

create function soko_test.as_anon() returns void language sql as $$
  select set_config('request.jwt.claims', '{"role":"anon"}', true),
         set_config('request.jwt.claim.sub', '', true);
$$;

-- Passes when the statement raises, or when it silently affects zero rows
-- (RLS filtering an UPDATE/DELETE produces no error, just no rows).
create function soko_test.expect_denied(p_label text, p_sql text) returns void language plpgsql as $$
declare v_rows bigint;
begin
  begin
    execute p_sql;
    get diagnostics v_rows = row_count;
    insert into soko_test.results (label, passed, detail) values (p_label, v_rows = 0, 'affected ' || v_rows || ' row(s)');
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, true, 'denied: ' || sqlerrm);
  end;
end $$;

create function soko_test.expect_ok(p_label text, p_sql text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_test.results (label, passed, detail) values (p_label, true, 'ok');
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, false, 'unexpected error: ' || sqlerrm);
  end;
end $$;

-- p_sql must return a single count.
create function soko_test.expect_count(p_label text, p_sql text, p_expected bigint) returns void language plpgsql as $$
declare v_n bigint;
begin
  begin
    execute p_sql into v_n;
    insert into soko_test.results (label, passed, detail)
    values (p_label, v_n = p_expected, 'expected ' || p_expected || ', got ' || v_n);
  exception when others then
    insert into soko_test.results (label, passed, detail) values (p_label, p_expected = 0, 'error: ' || sqlerrm);
  end;
end $$;

grant execute on all functions in schema soko_test to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Fixtures (as owner)
-- -----------------------------------------------------------------------------
insert into soko_test.ids (key, id) values
  ('sup_admin',  '00000000-0000-4000-8000-000000000001'),
  ('sup_viewer', '00000000-0000-4000-8000-000000000002'),
  ('con_admin',  '00000000-0000-4000-8000-000000000003'),
  ('outsider',   '00000000-0000-4000-8000-000000000004'),
  ('padmin',     '00000000-0000-4000-8000-000000000005'),
  ('con_member', '00000000-0000-4000-8000-000000000006'),
  ('sup_tech',   '00000000-0000-4000-8000-000000000007'),
  ('unconfirmed','00000000-0000-4000-8000-000000000008'),
  ('noemail',    '00000000-0000-4000-8000-000000000009'),
  ('expired_user','00000000-0000-4000-8000-00000000000a'),
  ('lead',        '00000000-0000-4000-8000-00000000000b'),
  ('lead_invitee','00000000-0000-4000-8000-00000000000c'),
  ('lead_admin_inv','00000000-0000-4000-8000-00000000000d'),
  ('rejoiner',    '00000000-0000-4000-8000-00000000000e'),
  ('pending_user','00000000-0000-4000-8000-00000000000f'),
  ('removed_user','00000000-0000-4000-8000-000000000010'),
  ('revoked_user','00000000-0000-4000-8000-000000000011'),
  ('susp_admin',  '00000000-0000-4000-8000-000000000012'),
  ('susp_member', '00000000-0000-4000-8000-000000000013'),
  ('susp_invitee','00000000-0000-4000-8000-000000000014'),
  ('susp_joiner', '00000000-0000-4000-8000-000000000015');

insert into auth.users (id, email, aud, role, raw_user_meta_data, email_confirmed_at)
select i.id, i.key || '@soko-security.test', 'authenticated', 'authenticated',
       jsonb_build_object('full_name', 'Test ' || i.key),
       case when i.key = 'unconfirmed' then null else now() end
from soko_test.ids i;
update auth.users set email = null where id = soko_test.id('noemail');

insert into public.platform_admins (user_id, note) values (soko_test.id('padmin'), 'security test fixture');

-- Supplier admin creates a supplier company and makes it public.
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.ids values ('supplier', public.create_company('supplier', 'Security Test Supplier LLC'));
update public.companies set is_public = true where id = soko_test.id('supplier');
insert into soko_test.secrets values ('viewer_token',
  public.invite_member(soko_test.id('supplier'), 'sup_viewer@soko-security.test', 'viewer'));
insert into soko_test.secrets values ('outsider_token',
  public.invite_member(soko_test.id('supplier'), 'someone-else@soko-security.test', 'viewer'));
reset role;

-- Viewer accepts the invitation.
select soko_test.as_user('sup_viewer');
set local role authenticated;
select public.accept_invitation((select value from soko_test.secrets where key = 'viewer_token'));
reset role;

-- Contractor admin creates a contractor company with a vendor record and contact.
select soko_test.as_user('con_admin');
set local role authenticated;
insert into soko_test.ids values ('contractor', public.create_company('contractor', 'Security Test Contractor LLC'));
insert into public.vendor_records (contractor_company_id, supplier_company_id, trade_category)
values (soko_test.id('contractor'), soko_test.id('supplier'), 'MEP');
insert into public.company_contacts (company_id, full_name, email)
values (soko_test.id('contractor'), 'Private Contact', 'private@soko-security.test');
reset role;

insert into soko_test.ids
select 'vendor_record', id from public.vendor_records where contractor_company_id = soko_test.id('contractor');
insert into soko_test.ids
select 'viewer_membership', id from public.company_memberships
where company_id = soko_test.id('supplier') and user_id = soko_test.id('sup_viewer');
insert into soko_test.ids
select 'admin_membership', id from public.company_memberships
where company_id = soko_test.id('supplier') and user_id = soko_test.id('sup_admin');

-- Supplier admin: a draft product, a published product, an admin-only document
-- with an uploaded version, and a promotion campaign draft.
insert into storage.objects (bucket_id, name, metadata)
values ('company-documents', soko_test.id('supplier')::text || '/placeholder', '{"size": 1}');
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into public.products (company_id, name, status) values (soko_test.id('supplier'), 'Draft Valve', 'draft');
insert into public.products (company_id, name, status) values (soko_test.id('supplier'), 'Published Valve', 'published');
insert into public.documents (company_id, name, access_level) values (soko_test.id('supplier'), 'Admin Only Licence', 'admins');
insert into public.campaigns (owner_company_id, kind, promo_type, title, body, budget_credits)
values (soko_test.id('supplier'), 'promotion', 'special_offer', 'Test Promotion', 'Body', 10);
reset role;
insert into soko_test.ids select 'document', id from public.documents where company_id = soko_test.id('supplier');
insert into soko_test.ids select 'campaign', id from public.campaigns where owner_company_id = soko_test.id('supplier');
insert into storage.objects (bucket_id, name, metadata)
values ('company-documents',
        soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf',
        '{"size": 2048, "mimetype": "application/pdf"}');
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.ids values ('document_version', public.finalize_document_version(
  soko_test.id('document'),
  soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf',
  'licence.pdf'));
-- Supplier requests a visit with the contractor and leaves a private note.
insert into soko_test.ids values ('visit', public.request_visit(
  soko_test.id('supplier'), soko_test.id('contractor'), now() + interval '2 days'));
insert into public.visit_notes (visit_id, company_id, body)
values (soko_test.id('visit'), soko_test.id('supplier'), 'Supplier-only note');
reset role;

-- Contractor posts a confidential opportunity.
select soko_test.as_user('con_admin');
set local role authenticated;
insert into public.opportunities (owner_company_id, type, opp_group, title, description, identity,
                                  contact_name, contact_email)
values (soko_test.id('contractor'), 'material', 'requirements', 'Need 500 valves', 'Details',
        'confidential', 'Hidden Buyer', 'hidden@soko-security.test');
reset role;
insert into soko_test.ids select 'opportunity', id from public.opportunities where owner_company_id = soko_test.id('contractor');

-- =============================================================================
-- 1. Membership and role escalation
-- =============================================================================
select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_denied('viewer cannot update own membership role directly',
  $$update public.company_memberships set role_key = 'supplier_admin' where user_id = auth.uid()$$);
select soko_test.expect_denied('viewer cannot promote self via RPC',
  format($$select public.change_member_role(%L, 'supplier_admin')$$, soko_test.id('viewer_membership')));
select soko_test.expect_denied('viewer cannot insert a membership into another company',
  format($$insert into public.company_memberships (company_id, company_kind, user_id, role_key)
           values (%L, 'contractor', auth.uid(), 'contractor_admin')$$, soko_test.id('contractor')));
select soko_test.expect_denied('viewer cannot invite members',
  format($$select public.invite_member(%L, 'x@soko-security.test', 'supplier_admin')$$, soko_test.id('supplier')));
select soko_test.expect_denied('viewer cannot edit the company profile',
  format($$update public.companies set description = 'hacked' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('viewer cannot read the admin-only document',
  format($$select 1 from public.documents where id = %L$$, soko_test.id('document')));
select soko_test.expect_count('viewer can read team memberships (positive control)',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('supplier')), 2);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('admin cannot change own role',
  format($$select public.change_member_role(%L, 'viewer')$$, soko_test.id('admin_membership')));
select soko_test.expect_denied('last admin cannot leave the company',
  format($$select public.remove_member(%L)$$, soko_test.id('admin_membership')));
reset role;

select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_denied('invitation cannot be accepted by a different email',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'outsider_token'))$$);
select soko_test.expect_denied('reused invitation token is rejected',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'viewer_token'))$$);
select soko_test.expect_count('outsider cannot list supplier memberships',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('supplier')), 0);
select soko_test.expect_denied('outsider cannot read invitation token hashes',
  $$select token_hash from public.company_invitations$$);
reset role;

-- =============================================================================
-- 2. Verification and entitlements
-- =============================================================================
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('admin cannot set verification_status directly',
  format($$update public.companies set verification_status = 'verified' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot unsuspend or change kind directly',
  format($$update public.companies set is_suspended = false, kind = 'contractor' where id = %L$$, soko_test.id('supplier')));
select soko_test.expect_ok('admin can submit verification (positive control)',
  format($$select public.submit_verification(%L, 'LIC-1', 'DED', current_date + 365)$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot approve own verification',
  $$select public.review_verification((select id from public.company_verifications limit 1), true)$$);
select soko_test.expect_denied('admin cannot change the subscription plan directly',
  format($$update public.company_subscriptions set plan_id = 'enterprise' where company_id = %L$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot call admin_set_subscription',
  format($$select public.admin_set_subscription(%L, 'enterprise')$$, soko_test.id('supplier')));
select soko_test.expect_denied('admin cannot mint credits',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, 1000, 'purchase')$$, soko_test.id('supplier')));
select soko_test.expect_denied('free plan cannot submit a promotion campaign',
  format($$select public.submit_campaign(%L)$$, soko_test.id('campaign')));
select soko_test.expect_denied('campaign status cannot be set directly',
  format($$update public.campaigns set status = 'active' where id = %L$$, soko_test.id('campaign')));
reset role;

select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_ok('platform admin can approve verification (positive control)',
  $$select public.review_verification((select id from public.company_verifications where status = 'pending' limit 1), true)$$);
reset role;
select soko_test.expect_count('company is verified after platform review',
  format($$select count(*) from public.companies where id = %L and verification_status = 'verified'$$, soko_test.id('supplier')), 1);

-- =============================================================================
-- 3. Company-private data
-- =============================================================================
select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_count('outsider cannot read vendor records',
  $$select count(*) from public.vendor_records$$, 0);
select soko_test.expect_count('outsider cannot read company contacts',
  $$select count(*) from public.company_contacts$$, 0);
select soko_test.expect_count('outsider cannot read audit log',
  $$select count(*) from public.audit_log$$, 0);
select soko_test.expect_count('outsider cannot read another user''s notifications',
  $$select count(*) from public.notifications$$, 0);
select soko_test.expect_denied('outsider cannot insert notifications',
  format($$insert into public.notifications (user_id, type) values (%L, 'spoof')$$, soko_test.id('sup_admin')));
select soko_test.expect_count('outsider cannot see the visit',
  $$select count(*) from public.visits$$, 0);
select soko_test.expect_denied('outsider cannot read private document version',
  format($$select 1 from public.document_versions where id = %L$$, soko_test.id('document_version')));
select soko_test.expect_count('outsider cannot read the stored file',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
select soko_test.expect_denied('outsider cannot upload into the supplier''s folder',
  format($$insert into storage.objects (bucket_id, name, metadata) values ('company-documents', %L, '{"size":1}')$$,
         soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v2/x.pdf'));
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('supplier cannot read the contractor''s vendor record about them',
  $$select count(*) from public.vendor_records$$, 0);
select soko_test.expect_count('supplier cannot read the contractor''s contacts',
  $$select count(*) from public.company_contacts$$, 0);
select soko_test.expect_denied('supplier cannot approve itself as a vendor',
  format($$select public.set_vendor_approval(%L, 'approved')$$, soko_test.id('vendor_record')));
select soko_test.expect_denied('supplier cannot confirm its own visit request',
  format($$select public.set_visit_status(%L, %L, 'scheduled')$$, soko_test.id('visit'), soko_test.id('supplier')));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor cannot read the supplier''s private visit note',
  $$select count(*) from public.visit_notes$$, 0);
select soko_test.expect_count('contractor sees the shared visit (positive control)',
  $$select count(*) from public.visits$$, 1);
select soko_test.expect_ok('contractor can confirm the visit (positive control)',
  format($$select public.set_visit_status(%L, %L, 'scheduled')$$, soko_test.id('visit'), soko_test.id('contractor')));
select soko_test.expect_count('contractor cannot read unshared supplier document',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 0);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('supplier cannot check in a visit (host-only transition)',
  format($$select public.set_visit_status(%L, %L, 'checked-in')$$, soko_test.id('visit'), soko_test.id('supplier')));
insert into soko_test.ids values ('share', public.share_document(soko_test.id('document'), soko_test.id('contractor')));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor reads document after share (positive control)',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 1);
select soko_test.expect_count('F5: share recipient cannot read the file directly from Storage',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
select soko_test.expect_ok('F5: share recipient is authorised by record_document_download (positive control)',
  format($$select public.record_document_download(%L)$$, soko_test.id('document_version')));
select soko_test.expect_denied('recipient cannot revoke or re-share the owner''s document',
  format($$select public.revoke_document_share(%L)$$, soko_test.id('share')));
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select public.revoke_document_share(soko_test.id('share'));
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('contractor loses access after revocation',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 0);
select soko_test.expect_count('contractor loses file access after revocation',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
select soko_test.expect_denied('F5: revoked recipient cannot obtain a download',
  format($$select public.record_document_download(%L)$$, soko_test.id('document_version')));
reset role;

-- =============================================================================
-- 4. Public data and anonymous access
-- =============================================================================
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('anon sees only published products of public companies',
  $$select count(*) from public.products$$, 1);
select soko_test.expect_denied('anon cannot read profiles',
  $$select 1 from public.profiles$$);
select soko_test.expect_denied('anon cannot call create_company',
  $$select public.create_company('supplier', 'Anon Co')$$);
select soko_test.expect_denied('anon cannot read opportunities',
  $$select 1 from public.opportunities$$);
reset role;

-- =============================================================================
-- 5. Market Hub confidentiality
-- =============================================================================
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('open opportunity is listed (positive control)',
  $$select count(*) from public.opportunities$$, 1);
select soko_test.expect_denied('contact columns are not selectable',
  $$select contact_email from public.opportunities$$);
select soko_test.expect_denied('owner columns are not selectable',
  $$select owner_company_id from public.opportunities$$);
select soko_test.expect_count('confidential publisher and contact stay hidden before connection',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d ->> 'publisher_display' = 'Confidential publisher' and d -> 'contact' = 'null'::jsonb$$,
         soko_test.id('opportunity')), 1);
insert into public.opportunity_interests (opportunity_id, responder_company_id, message)
values (soko_test.id('opportunity'), soko_test.id('supplier'), 'We can supply');
select soko_test.expect_denied('responder cannot mark own interest as connected',
  $$select public.set_interest_status((select id from public.opportunity_interests limit 1), 'connected')$$);
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_denied('owner cannot express interest in own opportunity',
  format($$insert into public.opportunity_interests (opportunity_id, responder_company_id) values (%L, %L)$$,
         soko_test.id('opportunity'), soko_test.id('contractor')));
select soko_test.expect_ok('owner can connect with the responder (positive control)',
  $$select public.set_interest_status((select id from public.opportunity_interests limit 1), 'connected')$$);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('contact is revealed after connection',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d -> 'contact' ->> 'email' = 'hidden@soko-security.test'$$, soko_test.id('opportunity')), 1);
reset role;

-- =============================================================================
-- 6. Append-only records
-- =============================================================================
select soko_test.expect_denied('audit log cannot be modified, even by the owner',
  $$update public.audit_log set action = 'tampered'$$);
select soko_test.expect_denied('document versions are immutable, even for the owner',
  $$update public.document_versions set file_name = 'tampered.pdf'$$);

-- =============================================================================
-- 7. Step 10D regressions (F1–F7)
-- =============================================================================

-- F1 fixtures: invitations for the technical manager, an unconfirmed user and an expiring one.
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('tech_token',
  public.invite_member(soko_test.id('supplier'), 'sup_tech@soko-security.test', 'technical_manager'));
insert into soko_test.secrets values ('unconfirmed_token',
  public.invite_member(soko_test.id('supplier'), 'unconfirmed@soko-security.test', 'viewer'));
insert into soko_test.secrets values ('expired_token',
  public.invite_member(soko_test.id('supplier'), 'expired_user@soko-security.test', 'viewer'));
reset role;
update public.company_invitations set expires_at = now() - interval '1 minute'
where lower(email) = 'expired_user@soko-security.test';

select soko_test.as_user('unconfirmed');
set local role authenticated;
select soko_test.expect_denied('F1: unconfirmed email cannot accept a matching invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'unconfirmed_token'))$$);
reset role;

select soko_test.as_user('noemail');
set local role authenticated;
select soko_test.expect_denied('F1: user without an email cannot accept any invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'outsider_token'))$$);
reset role;

select soko_test.as_user('expired_user');
set local role authenticated;
select soko_test.expect_denied('F1: expired invitation is rejected',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'expired_token'))$$);
reset role;

select soko_test.as_user('sup_tech');
set local role authenticated;
select soko_test.expect_ok('F1: confirmed matching email accepts (positive control)',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'tech_token'))$$);
reset role;

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_denied('F1: an accepted token cannot be reused by anyone',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'tech_token'))$$);
reset role;

-- F2: company privacy.
select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_denied('F2: licence number is not selectable on companies',
  $$select license_no from public.companies$$);
select soko_test.expect_denied('F2: created_by is not selectable on companies',
  $$select created_by from public.companies$$);
select soko_test.expect_denied('F2: non-member cannot call get_company_private',
  format($$select * from public.get_company_private(%L)$$, soko_test.id('supplier')));
select soko_test.expect_count('F2: public columns remain readable (positive control)',
  format($$select count(*) from (select id, legal_name from public.companies where id = %L) x$$, soko_test.id('supplier')), 1);
reset role;

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_count('F2: member reads private details (positive control)',
  format($$select count(*) from public.get_company_private(%L) where license_no = 'LIC-1'$$, soko_test.id('supplier')), 1);
reset role;

select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_count('F2: platform admin reads private details (positive control)',
  format($$select count(*) from public.get_company_private(%L)$$, soko_test.id('supplier')), 1);
reset role;

-- F3: licence squatting. The supplier is verified with LIC-1 / DED (section 2).
select soko_test.as_user('outsider');
set local role authenticated;
insert into soko_test.ids values ('private_supplier',
  public.create_company('supplier', 'Private Squatter LLC', null, 'LIC-1', 'DED'));
select soko_test.expect_ok('F3: an unverified company may register a shared licence (positive control)',
  format($$select public.submit_verification(%L, 'lic-1', 'ded', current_date + 365)$$, soko_test.id('private_supplier')));
reset role;

select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_denied('F3: a second company cannot be verified on a verified licence',
  format($$select public.review_verification((select id from public.company_verifications
           where company_id = %L and status = 'pending'))$$, soko_test.id('private_supplier')));
reset role;
select soko_test.expect_denied('F3: the unique index blocks a second verified holder even for the owner',
  format($$update public.companies set verification_status = 'verified' where id = %L$$, soko_test.id('private_supplier')));

-- F4: document access levels. technical_manager has documents.manage but not 'admins'.
select soko_test.as_user('sup_tech');
set local role authenticated;
select soko_test.expect_count('F4: technical manager cannot read the admin-only document',
  format($$select count(*) from public.documents where id = %L$$, soko_test.id('document')), 0);
select soko_test.expect_count('F4: technical manager cannot read the admin-only file',
  $$select count(*) from storage.objects where bucket_id = 'company-documents' and name like '%/v1/licence.pdf'$$, 0);
select soko_test.expect_denied('F4: technical manager cannot download the admin-only version',
  format($$select public.record_document_download(%L)$$, soko_test.id('document_version')));
select soko_test.expect_denied('F4: technical manager cannot create an admins-level document',
  format($$insert into public.documents (company_id, name, access_level) values (%L, 'Sneaky', 'admins')$$,
         soko_test.id('supplier')));
select soko_test.expect_denied('F4: technical manager cannot upload into the admin-only document folder',
  format($$insert into storage.objects (bucket_id, name, metadata) values ('company-documents', %L, '{"size":1}')$$,
         soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v9/x.pdf'));
select soko_test.expect_denied('F4: technical manager cannot finalize a version of the admin-only document',
  format($$select public.finalize_document_version(%L, %L, 'licence.pdf')$$, soko_test.id('document'),
         soko_test.id('supplier')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf'));
insert into public.documents (company_id, name, access_level) values (soko_test.id('supplier'), 'Team Datasheet', 'team');
select soko_test.expect_count('F4: technical manager manages team-level documents (positive control)',
  $$select count(*) from public.documents where name = 'Team Datasheet'$$, 1);
select soko_test.expect_denied('F4: technical manager cannot raise a document to admins level',
  $$update public.documents set access_level = 'admins' where name = 'Team Datasheet'$$);
reset role;

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_count('F4: viewer reads team-level documents (positive control)',
  $$select count(*) from public.documents where name = 'Team Datasheet'$$, 1);
reset role;

-- F6: no relationships with arbitrary private companies.
select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_denied('F6: contractor cannot link a private supplier as a vendor',
  format($$insert into public.vendor_records (contractor_company_id, supplier_company_id, trade_category)
           values (%L, %L, 'MEP')$$, soko_test.id('contractor'), soko_test.id('private_supplier')));
select soko_test.expect_denied('F6: contractor cannot request a visit with a private non-counterparty',
  format($$select public.request_visit(%L, %L, now() + interval '3 days')$$,
         soko_test.id('contractor'), soko_test.id('private_supplier')));
select soko_test.expect_count('F6: private supplier stays invisible to the contractor',
  format($$select count(*) from public.companies where id = %L$$, soko_test.id('private_supplier')), 0);
select soko_test.expect_ok('F6: contractor can add an external vendor without a link (positive control)',
  format($$insert into public.vendor_records (contractor_company_id, external_name, trade_category)
           values (%L, 'Offline Vendor', 'Civil')$$, soko_test.id('contractor')));
reset role;

-- F7: campaign recipients and confidential contacts.
insert into public.campaign_recipients (campaign_id, user_id, company_id)
values (soko_test.id('campaign'), soko_test.id('outsider'), null);

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('F7: campaign owner cannot list recipient user ids',
  $$select count(*) from public.campaign_recipients$$, 0);
reset role;

select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_count('F7: recipient sees own delivery (positive control)',
  $$select count(*) from public.campaign_recipients$$, 1);
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
insert into public.opportunities (owner_company_id, type, opp_group, title, description, identity,
                                  contact_visibility, contact_name, contact_email)
values (soko_test.id('contractor'), 'material', 'requirements', 'Confidential members-visible', 'Details',
        'confidential', 'members', 'Secret Buyer', 'secret@soko-security.test'),
       (soko_test.id('contractor'), 'material', 'requirements', 'Public members-visible', 'Details',
        'public', 'members', 'Open Buyer', 'open@soko-security.test');
reset role;
insert into soko_test.ids select 'opp_conf_members', id from public.opportunities where title = 'Confidential members-visible';
insert into soko_test.ids select 'opp_public_members', id from public.opportunities where title = 'Public members-visible';

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_count('F7: confidential publisher contact hidden even when members-visible',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d -> 'contact' = 'null'::jsonb$$, soko_test.id('opp_conf_members')), 1);
select soko_test.expect_count('F7: public members-visible contact is shown (positive control)',
  format($$select count(*) from (select public.get_opportunity_details(%L) d) x
           where d -> 'contact' ->> 'email' = 'open@soko-security.test'$$, soko_test.id('opp_public_members')), 1);
reset role;

-- -----------------------------------------------------------------------------
-- Step 10E: least-privilege function execution
-- -----------------------------------------------------------------------------
-- SOKO-managed functions only. Functions owned by Supabase, extensions or other
-- integrations are excluded and checked separately below.
create temporary view soko_fn as
  select p.oid, n.nspname as schema, p.proname as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join private.managed_functions m on m.fn_oid = p.oid;

select soko_test.expect_count('10F: every private-schema function is SOKO-managed',
  $$select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
      and not exists (select 1 from private.managed_functions m where m.fn_oid = p.oid)$$, 0);
select soko_test.expect_count('10F: function scope is closed after the last migration',
  $$select (select count(*) from private.function_scope_state) + (select count(*) from private.function_scope)$$, 0);
select soko_test.expect_count('10F: every allowlist entry targets a SOKO-managed function',
  $$select count(*) from private.function_grants g
    where not exists (select 1 from private.managed_functions m where m.fn_oid = g.fn_oid)$$, 0);

select soko_test.expect_count('10E: no public/private function is executable by PUBLIC',
  $$select count(*) from soko_fn where has_function_privilege('public', oid, 'execute')$$, 0);
select soko_test.expect_count('10E: anon can execute no public-schema RPC',
  $$select count(*) from soko_fn where schema = 'public' and has_function_privilege('anon', oid, 'execute')$$, 0);
select soko_test.expect_count('10E: service_role can execute no public-schema RPC',
  $$select count(*) from soko_fn where schema = 'public' and has_function_privilege('service_role', oid, 'execute')$$, 0);
select soko_test.expect_count('10E: authenticated can execute exactly the 42 approved public RPCs',
  $$select count(*) from soko_fn where schema = 'public' and has_function_privilege('authenticated', oid, 'execute')$$, 42);
select soko_test.expect_count('10E: every authenticated grant is on the allowlist',
  $$select count(*) from soko_fn f
    where has_function_privilege('authenticated', f.oid, 'execute')
      and not exists (select 1 from private.function_grants g
                      where g.grantee = 'authenticated' and g.fn_oid = f.oid)$$, 0);
select soko_test.expect_count('10E: anon executes only the 4 public-read policy helpers',
  $$select count(*) from soko_fn where has_function_privilege('anon', oid, 'execute')
      and name in ('try_uuid', 'storage_company', 'can_read_document', 'can_read_company_media')$$, 4);
select soko_test.expect_count('10E: anon executes nothing else',
  $$select count(*) from soko_fn where has_function_privilege('anon', oid, 'execute')$$, 4);
select soko_test.expect_count('10E: ledger, notification and admin helpers are owner-only',
  $$select count(*) from soko_fn
    where name in ('spend_credits', 'add_credits', 'notify', 'notify_permission_holders',
                   'notify_platform_admins', 'attach_audit', 'reset_table_grants',
                   'allow_execute', 'apply_function_grants', 'begin_function_scope',
                   'require_platform_admin', 'handle_new_user')
      and (has_function_privilege('anon', oid, 'execute')
           or has_function_privilege('authenticated', oid, 'execute')
           or has_function_privilege('service_role', oid, 'execute'))$$, 0);
select soko_test.expect_count('10E: scheduled jobs are executable by service_role only',
  $$select count(*) from soko_fn
    where name in ('grant_monthly_credits', 'queue_document_expiry_reminders',
                   'activate_due_campaigns', 'refresh_supplier_metrics')
      and has_function_privilege('service_role', oid, 'execute')
      and not has_function_privilege('authenticated', oid, 'execute')
      and not has_function_privilege('anon', oid, 'execute')$$, 4);

-- Foreign functions: the harness creates public.other_integration_ping() before
-- migration 01 and public.midway_integration_ping() between migrations 06 and 07,
-- both with Supabase's default grants. SOKO must leave them exactly as they were.
select soko_test.expect_count('10F: functions of other integrations are not SOKO-managed',
  $$select count(*) from private.managed_functions
    where fn_oid in (to_regprocedure('public.other_integration_ping()'),
                     to_regprocedure('public.midway_integration_ping()'))$$, 0);
select soko_test.expect_count('10F: other integrations keep PUBLIC/anon/authenticated/service_role EXECUTE',
  $$select count(*) from unnest(array['public.other_integration_ping()', 'public.midway_integration_ping()']) s
    where has_function_privilege('public', to_regprocedure(s), 'execute')
      and has_function_privilege('anon', to_regprocedure(s), 'execute')
      and has_function_privilege('authenticated', to_regprocedure(s), 'execute')
      and has_function_privilege('service_role', to_regprocedure(s), 'execute')$$, 2);
select soko_test.expect_count('10F: SOKO does not alter the owner''s default function privileges',
  $$select count(*) from pg_default_acl d
    join pg_namespace n on n.oid = d.defaclnamespace
    where d.defaclobjtype = 'f' and n.nspname = 'public'
      and array_to_string(d.defaclacl, ',') like '%anon=X%'
      and array_to_string(d.defaclacl, ',') like '%authenticated=X%'
      and array_to_string(d.defaclacl, ',') like '%service_role=X%'$$, 1);

-- A function created outside any SOKO scope is left alone, even by a later apply.
create function public.soko_test_foreign_probe() returns int language sql as $$ select 1 $$;
select private.begin_function_scope();
create function public.soko_test_managed_probe() returns int language sql as $$ select 1 $$;
create function private.soko_test_managed_probe() returns int language sql as $$ select 1 $$;
select private.apply_function_grants();
select soko_test.expect_count('10F: functions created inside a SOKO scope are locked down',
  $$select count(*) from soko_fn where name = 'soko_test_managed_probe'
      and not (has_function_privilege('public', oid, 'execute')
               or has_function_privilege('anon', oid, 'execute')
               or has_function_privilege('authenticated', oid, 'execute')
               or has_function_privilege('service_role', oid, 'execute'))$$, 2);
select soko_test.expect_count('10F: a later apply leaves a foreign function untouched',
  $$select count(*) from pg_proc where oid = to_regprocedure('public.soko_test_foreign_probe()')
      and has_function_privilege('anon', oid, 'execute')
      and not exists (select 1 from private.managed_functions m where m.fn_oid = oid)$$, 1);
select soko_test.expect_denied('10F: apply_function_grants without an open scope fails',
  $$select private.apply_function_grants()$$);
select soko_test.expect_denied('10F: a second begin_function_scope while one is open fails',
  $$select private.begin_function_scope(); select private.begin_function_scope()$$);
select soko_test.expect_denied('10F: allowlisting a foreign function is refused',
  $$select private.begin_function_scope();
    select private.allow_execute(array['authenticated'], array['public.other_integration_ping()']);
    select private.apply_function_grants()$$);
select soko_test.expect_denied('10E: allow_execute rejects an unknown signature',
  $$select private.allow_execute(array['authenticated'], array['public.does_not_exist(uuid)'])$$);
select soko_test.expect_denied('10E: allow_execute rejects an unsupported grantee',
  $$select private.allow_execute(array['postgres'], array['public.get_credit_balance(uuid)'])$$);

select soko_test.as_anon();
set local role anon;
select soko_test.expect_denied('10E: anon cannot call an approved RPC',
  $$select public.get_credit_balance(gen_random_uuid())$$);
select soko_test.expect_denied('10E: anon cannot call a private ledger helper',
  $$select private.add_credits(gen_random_uuid(), 100, 'x', null)$$);
reset role;

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('10E: authenticated cannot call spend_credits directly',
  format($$select private.spend_credits(%L, 1, 'x', null)$$, soko_test.id('supplier')));
select soko_test.expect_denied('10E: authenticated cannot call add_credits directly',
  format($$select private.add_credits(%L, 1000, 'x', null)$$, soko_test.id('supplier')));
select soko_test.expect_denied('10E: authenticated cannot call apply_function_grants',
  $$select private.apply_function_grants()$$);
select soko_test.expect_ok('10E: authenticated member can still call an approved RPC',
  format($$select public.get_credit_balance(%L)$$, soko_test.id('supplier')));
reset role;

-- =============================================================================
-- 9. Migration 03 invitation hardening
-- =============================================================================

-- Role escalation: an invitation can never change an existing active member's role.
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('INV: cannot invite someone who is already an active member',
  format($$select public.invite_member(%L, 'sup_viewer@soko-security.test', 'supplier_admin')$$,
         soko_test.id('supplier')));
reset role;

-- Simulate a pre-existing open admin invitation for the active viewer (as owner).
insert into soko_test.secrets values ('escalate_token', 'escalate-' || gen_random_uuid()::text);
insert into public.company_invitations (company_id, company_kind, email, role_key, token_hash, expires_at, invited_by)
select soko_test.id('supplier'), 'supplier', 'sup_viewer@soko-security.test', 'supplier_admin',
       encode(sha256(convert_to(s.value, 'UTF8')), 'hex'), now() + interval '1 day', soko_test.id('sup_admin')
from soko_test.secrets s where s.key = 'escalate_token';

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_denied('INV: active member cannot accept an admin invitation to escalate',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'escalate_token'))$$);
reset role;
select soko_test.expect_count('INV: active member role is unchanged after the attempt',
  format($$select count(*) from public.company_memberships
           where company_id = %L and user_id = %L and role_key = 'viewer' and status = 'active'$$,
         soko_test.id('supplier'), soko_test.id('sup_viewer')), 1);

-- Admin invitations from a real admin still work (positive control).
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('lead_token',
  public.invite_member(soko_test.id('supplier'), 'lead@soko-security.test', 'supplier_admin'));
reset role;
select soko_test.as_user('lead');
set local role authenticated;
select soko_test.expect_ok('INV: admin invitation issued by an admin is accepted',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'lead_token'))$$);
insert into soko_test.secrets values ('lead_member_token',
  public.invite_member(soko_test.id('supplier'), 'lead_invitee@soko-security.test', 'viewer'));
insert into soko_test.secrets values ('lead_admin_token',
  public.invite_member(soko_test.id('supplier'), 'lead_admin_inv@soko-security.test', 'supplier_admin'));
reset role;

-- The inviter loses authority before the invitations are accepted.
select soko_test.as_user('sup_admin');
set local role authenticated;
select public.change_member_role(
  (select id from public.company_memberships
   where company_id = soko_test.id('supplier') and user_id = soko_test.id('lead')), 'viewer');
reset role;

select soko_test.as_user('lead_invitee');
set local role authenticated;
select soko_test.expect_denied('INV: invitation is void once the inviter loses team.manage',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'lead_member_token'))$$);
reset role;
select soko_test.as_user('lead_admin_inv');
set local role authenticated;
select soko_test.expect_denied('INV: admin invitation is void once the inviter is no longer admin',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'lead_admin_token'))$$);
reset role;
select soko_test.expect_count('INV: no membership was created from the void invitations',
  format($$select count(*) from public.company_memberships where company_id = %L and user_id in (%L, %L)$$,
         soko_test.id('supplier'), soko_test.id('lead_invitee'), soko_test.id('lead_admin_inv')), 0);

-- Pending join request + invitation from an authorised admin activates it.
select soko_test.as_user('pending_user');
set local role authenticated;
select public.request_to_join(soko_test.id('supplier'));
reset role;
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('pending_token',
  public.invite_member(soko_test.id('supplier'), 'pending_user@soko-security.test', 'technical_manager'));
reset role;
select soko_test.as_user('pending_user');
set local role authenticated;
select soko_test.expect_ok('INV: pending requester accepts an authorised invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'pending_token'))$$);
reset role;
select soko_test.expect_count('INV: pending requester is active with the invited role',
  format($$select count(*) from public.company_memberships where company_id = %L and user_id = %L
           and status = 'active' and role_key = 'technical_manager'$$,
         soko_test.id('supplier'), soko_test.id('pending_user')), 1);

-- Stale invitation: issued while pending, then the request is declined.
select soko_test.as_user('rejoiner');
set local role authenticated;
select public.request_to_join(soko_test.id('supplier'));
reset role;
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('stale_token',
  public.invite_member(soko_test.id('supplier'), 'rejoiner@soko-security.test', 'viewer'));
select public.decline_join_request(
  (select id from public.company_memberships
   where company_id = soko_test.id('supplier') and user_id = soko_test.id('rejoiner')));
reset role;
select soko_test.as_user('rejoiner');
set local role authenticated;
select soko_test.expect_denied('INV: pre-removal invitation cannot reactivate a removed member',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'stale_token'))$$);
select public.request_to_join(soko_test.id('supplier'));
select soko_test.expect_denied('INV: re-requesting to join does not revive a pre-removal invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'stale_token'))$$);
reset role;
select soko_test.expect_count('INV: rejoiner is still pending, not active',
  format($$select count(*) from public.company_memberships where company_id = %L and user_id = %L
           and status = 'pending_approval'$$, soko_test.id('supplier'), soko_test.id('rejoiner')), 1);

-- A fresh invitation issued after removal is a deliberate re-invite and works.
select soko_test.as_user('sup_admin');
set local role authenticated;
select public.revoke_invitation(
  (select id from public.company_invitations
   where lower(email) = 'rejoiner@soko-security.test' and accepted_at is null and revoked_at is null));
insert into soko_test.secrets values ('fresh_token',
  public.invite_member(soko_test.id('supplier'), 'rejoiner@soko-security.test', 'viewer'));
reset role;
select soko_test.as_user('rejoiner');
set local role authenticated;
select soko_test.expect_ok('INV: post-removal invitation from an admin is accepted',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'fresh_token'))$$);
reset role;

-- Removing a member revokes their open invitations.
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('removed_token',
  public.invite_member(soko_test.id('supplier'), 'removed_user@soko-security.test', 'viewer'));
reset role;
select soko_test.as_user('removed_user');
set local role authenticated;
select public.accept_invitation((select value from soko_test.secrets where key = 'removed_token'));
reset role;
insert into soko_test.secrets values ('removed_open_token', 'open-' || gen_random_uuid()::text);
insert into public.company_invitations (company_id, company_kind, email, role_key, token_hash, expires_at, invited_by)
select soko_test.id('supplier'), 'supplier', 'removed_user@soko-security.test', 'supplier_admin',
       encode(sha256(convert_to(s.value, 'UTF8')), 'hex'), now() + interval '1 day', soko_test.id('sup_admin')
from soko_test.secrets s where s.key = 'removed_open_token';
select soko_test.as_user('sup_admin');
set local role authenticated;
select public.remove_member(
  (select id from public.company_memberships
   where company_id = soko_test.id('supplier') and user_id = soko_test.id('removed_user')));
reset role;
select soko_test.expect_count('INV: removal revokes the member''s open invitations',
  $$select count(*) from public.company_invitations
    where lower(email) = 'removed_user@soko-security.test' and accepted_at is null and revoked_at is null$$, 0);
select soko_test.as_user('removed_user');
set local role authenticated;
select soko_test.expect_denied('INV: removed member cannot rejoin as admin with an older invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'removed_open_token'))$$);
reset role;

-- Explicitly revoked invitation cannot be accepted.
select soko_test.as_user('sup_admin');
set local role authenticated;
insert into soko_test.secrets values ('revoked_token',
  public.invite_member(soko_test.id('supplier'), 'revoked_user@soko-security.test', 'viewer'));
select public.revoke_invitation(
  (select id from public.company_invitations
   where lower(email) = 'revoked_user@soko-security.test' and revoked_at is null));
reset role;
select soko_test.as_user('revoked_user');
set local role authenticated;
select soko_test.expect_denied('INV: revoked invitation cannot be accepted',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'revoked_token'))$$);
reset role;

-- The re-authorisation helper is not callable by clients.
select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_denied('INV: clients cannot call private.user_can_assign_role',
  format($$select private.user_can_assign_role(%L, %L, 'supplier_admin')$$,
         soko_test.id('supplier'), soko_test.id('sup_admin')));
reset role;

-- -----------------------------------------------------------------------------
-- 9. Suspended-company authorisation
-- -----------------------------------------------------------------------------
-- Setup while the company is active.
select soko_test.as_user('susp_admin');
set local role authenticated;
insert into soko_test.ids values ('susp_co', public.create_company('supplier', 'Suspension Test Supplier LLC'));
update public.companies set is_public = true where id = soko_test.id('susp_co');
insert into soko_test.secrets values ('susp_member_token',
  public.invite_member(soko_test.id('susp_co'), 'susp_member@soko-security.test', 'viewer'));
insert into soko_test.secrets values ('susp_pre_token',
  public.invite_member(soko_test.id('susp_co'), 'susp_invitee@soko-security.test', 'viewer'));
select public.submit_verification(soko_test.id('susp_co'), 'LIC-SUSP-1', 'DED', current_date + 365);
reset role;

select soko_test.as_user('susp_member');
set local role authenticated;
select public.accept_invitation((select value from soko_test.secrets where key = 'susp_member_token'));
reset role;

select soko_test.as_user('susp_joiner');
set local role authenticated;
insert into soko_test.ids values ('susp_join_req', public.request_to_join(soko_test.id('susp_co')));
reset role;

insert into soko_test.ids
select 'susp_member_m', id from public.company_memberships
where company_id = soko_test.id('susp_co') and user_id = soko_test.id('susp_member');
insert into soko_test.ids
select 'susp_verification', id from public.company_verifications
where company_id = soko_test.id('susp_co') and status = 'pending';

-- Platform admin suspends the company.
select soko_test.as_user('padmin');
set local role authenticated;
select public.admin_set_company_suspension(soko_test.id('susp_co'), true, 'security test');
reset role;

select soko_test.expect_count('SUSP: suspension revokes every open invitation',
  format($$select count(*) from public.company_invitations
           where company_id = %L and accepted_at is null and revoked_at is null$$, soko_test.id('susp_co')), 0);

-- Privileged operations are denied to the suspended company's admin.
select soko_test.as_user('susp_admin');
set local role authenticated;
select soko_test.expect_count('SUSP: is_company_admin is false while suspended',
  format($$select count(*) from (select 1 where private.is_company_admin(%L)) x$$, soko_test.id('susp_co')), 0);
select soko_test.expect_denied('SUSP: cannot submit verification',
  format($$select public.submit_verification(%L, 'LIC-SUSP-2', 'DED', current_date + 365)$$, soko_test.id('susp_co')));
select soko_test.expect_denied('SUSP: cannot invite a member',
  format($$select public.invite_member(%L, 'susp_new@soko-security.test', 'viewer')$$, soko_test.id('susp_co')));
select soko_test.expect_denied('SUSP: cannot invite an admin',
  format($$select public.invite_member(%L, 'susp_new_admin@soko-security.test', 'supplier_admin')$$, soko_test.id('susp_co')));
select soko_test.expect_denied('SUSP: cannot revoke invitations',
  format($$select public.revoke_invitation((select id from public.company_invitations where company_id = %L limit 1))$$,
         soko_test.id('susp_co')));
select soko_test.expect_denied('SUSP: cannot approve a join request',
  format($$select public.approve_join_request(%L, 'viewer')$$, soko_test.id('susp_join_req')));
select soko_test.expect_denied('SUSP: cannot decline a join request',
  format($$select public.decline_join_request(%L)$$, soko_test.id('susp_join_req')));
select soko_test.expect_denied('SUSP: cannot change a member role (escalation)',
  format($$select public.change_member_role(%L, 'supplier_admin')$$, soko_test.id('susp_member_m')));
select soko_test.expect_denied('SUSP: cannot remove another member',
  format($$select public.remove_member(%L)$$, soko_test.id('susp_member_m')));
select soko_test.expect_denied('SUSP: cannot edit the company profile',
  format($$update public.companies set description = 'x' where id = %L$$, soko_test.id('susp_co')));
select soko_test.expect_denied('SUSP: cannot upload a verification licence',
  format($$insert into storage.objects (bucket_id, name, metadata) values ('verification', %L, '{"size":1}')$$,
         soko_test.id('susp_co')::text || '/licence.pdf'));

-- Read-only access is preserved.
select soko_test.expect_count('SUSP: admin can still read own company row',
  format($$select count(*) from public.companies where id = %L$$, soko_test.id('susp_co')), 1);
select soko_test.expect_count('SUSP: admin can still read memberships',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('susp_co')), 3);
select soko_test.expect_ok('SUSP: admin can still read private company details',
  format($$select public.get_company_private(%L)$$, soko_test.id('susp_co')));
select soko_test.expect_count('SUSP: admin can still read verification history',
  format($$select count(*) from public.company_verifications where company_id = %L$$, soko_test.id('susp_co')), 1);
select soko_test.expect_count('SUSP: admin role still recognised for read-only licence access',
  format($$select count(*) from (select 1 where private.holds_admin_role(%L)) x$$, soko_test.id('susp_co')), 1);
reset role;

-- The public cannot see a suspended company.
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('SUSP: suspended company hidden from the public directory',
  format($$select count(*) from public.companies where id = %L$$, soko_test.id('susp_co')), 0);
reset role;

-- Pre-suspension invitation is dead.
select soko_test.as_user('susp_invitee');
set local role authenticated;
select soko_test.expect_denied('SUSP: pre-suspension invitation cannot be accepted while suspended',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'susp_pre_token'))$$);
reset role;

-- Platform-admin recovery still works while suspended.
select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_ok('SUSP: platform admin can review verification of a suspended company',
  format($$select public.review_verification(%L, true, 'reviewed during suspension')$$, soko_test.id('susp_verification')));
select soko_test.expect_ok('SUSP: platform admin can reinstate the company',
  format($$select public.admin_set_company_suspension(%L, false, 'reinstated')$$, soko_test.id('susp_co')));
reset role;

-- After reinstatement: authority returns, but stale invitations stay dead.
select soko_test.as_user('susp_invitee');
set local role authenticated;
select soko_test.expect_denied('SUSP: pre-suspension invitation stays invalid after reinstatement',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'susp_pre_token'))$$);
reset role;

select soko_test.as_user('susp_admin');
set local role authenticated;
select soko_test.expect_count('SUSP: admin authority restored after reinstatement',
  format($$select count(*) from (select 1 where private.is_company_admin(%L)) x$$, soko_test.id('susp_co')), 1);
select soko_test.expect_ok('SUSP: join request can be approved after reinstatement (positive control)',
  format($$select public.approve_join_request(%L, 'viewer')$$, soko_test.id('susp_join_req')));
reset role;

-- Invitation reactivation safeguards are intact after suspension cycles.
select soko_test.as_user('susp_member');
set local role authenticated;
select soko_test.expect_ok('SUSP: member may leave the company (positive control)',
  format($$select public.remove_member(%L)$$, soko_test.id('susp_member_m')));
reset role;
select soko_test.as_user('susp_admin');
set local role authenticated;
insert into soko_test.secrets values ('susp_rejoin_token',
  public.invite_member(soko_test.id('susp_co'), 'susp_member@soko-security.test', 'viewer'));
reset role;
select soko_test.as_user('susp_member');
set local role authenticated;
select soko_test.expect_denied('SUSP: old accepted token cannot reactivate a removed member',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'susp_member_token'))$$);
select soko_test.expect_ok('SUSP: fresh post-removal invitation reactivates (positive control)',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'susp_rejoin_token'))$$);
select soko_test.expect_count('SUSP: reactivated member keeps the invited role, no escalation',
  format($$select count(*) from public.company_memberships
           where company_id = %L and user_id = auth.uid() and status = 'active' and role_key = 'viewer'$$,
         soko_test.id('susp_co')), 1);
select soko_test.expect_denied('SUSP: active member cannot re-accept an invitation',
  $$select public.accept_invitation((select value from soko_test.secrets where key = 'susp_rejoin_token'))$$);
reset role;

-- =============================================================================
-- Last-admin invariant (private.guard_last_admin)
-- Sequential cases only: PGlite has a single connection. True concurrent races
-- are verified separately against a multi-connection PostgreSQL server.
-- =============================================================================
insert into soko_test.ids (key, id) values
  ('la_admin1', '00000000-0000-4000-8000-000000000016'),
  ('la_admin2', '00000000-0000-4000-8000-000000000017'),
  ('la_viewer', '00000000-0000-4000-8000-000000000018'),
  ('la_co',     '00000000-0000-4000-8000-0000000000a1'),
  ('la_m1',     '00000000-0000-4000-8000-0000000000a2'),
  ('la_m2',     '00000000-0000-4000-8000-0000000000a3'),
  ('la_mv',     '00000000-0000-4000-8000-0000000000a4');
insert into auth.users (id, email, aud, role, email_confirmed_at)
select id, key || '@soko-security.test', 'authenticated', 'authenticated', now()
from soko_test.ids where key in ('la_admin1', 'la_admin2', 'la_viewer');
insert into public.companies (id, kind, legal_name) values (soko_test.id('la_co'), 'supplier', 'Last Admin Test Co');
insert into public.company_memberships (id, company_id, company_kind, user_id, role_key) values
  (soko_test.id('la_m1'), soko_test.id('la_co'), 'supplier', soko_test.id('la_admin1'), 'supplier_admin'),
  (soko_test.id('la_mv'), soko_test.id('la_co'), 'supplier', soko_test.id('la_viewer'), 'viewer');

select soko_test.expect_denied('LA: deleting the only active admin is rejected',
  format($$delete from public.company_memberships where id = %L$$, soko_test.id('la_m1')));
select soko_test.expect_denied('LA: demoting the only active admin is rejected',
  format($$update public.company_memberships set role_key = 'viewer' where id = %L$$, soko_test.id('la_m1')));
select soko_test.expect_denied('LA: marking the only active admin removed is rejected',
  format($$update public.company_memberships set status = 'removed', removed_at = now() where id = %L$$, soko_test.id('la_m1')));
select soko_test.expect_denied('LA: deleting the only admin''s auth account is blocked by the cascade',
  format($$delete from auth.users where id = %L$$, soko_test.id('la_admin1')));
select soko_test.expect_ok('LA: removing a non-admin member is allowed',
  format($$delete from public.company_memberships where id = %L$$, soko_test.id('la_mv')));

insert into public.company_memberships (id, company_id, company_kind, user_id, role_key) values
  (soko_test.id('la_m2'), soko_test.id('la_co'), 'supplier', soko_test.id('la_admin2'), 'supplier_admin');
select soko_test.expect_denied('LA: one statement removing every admin is rejected',
  format($$delete from public.company_memberships where company_id = %L$$, soko_test.id('la_co')));
select soko_test.expect_count('LA: rejected multi-row delete left both admins in place',
  format($$select count(*) from public.company_memberships where company_id = %L and status = 'active'$$, soko_test.id('la_co')), 2);
select soko_test.expect_ok('LA: demoting an admin succeeds while another admin remains',
  format($$update public.company_memberships set role_key = 'viewer' where id = %L$$, soko_test.id('la_m2')));
select soko_test.expect_denied('LA: the remaining admin then cannot be removed',
  format($$delete from public.company_memberships where id = %L$$, soko_test.id('la_m1')));

select soko_test.as_user('la_admin1');
set local role authenticated;
select soko_test.expect_denied('LA: clients cannot read the admin guard table',
  $$select count(*) from private.company_admin_guard$$);
select soko_test.expect_denied('LA: remove_member RPC refuses to remove the last admin',
  format($$select public.remove_member(%L)$$, soko_test.id('la_m1')));
reset role;

select soko_test.expect_ok('LA: deleting the company cascades past the guard',
  format($$delete from public.companies where id = %L$$, soko_test.id('la_co')));
select soko_test.expect_count('LA: cascade removed every membership of the deleted company',
  format($$select count(*) from public.company_memberships where company_id = %L$$, soko_test.id('la_co')), 0);
select soko_test.expect_count('LA: cascade cleared the company''s guard row',
  format($$select count(*) from private.company_admin_guard where company_id = %L$$, soko_test.id('la_co')), 0);

-- =============================================================================
-- 11. Migration 04 — audit redaction, entity identification, notification isolation
-- =============================================================================
reset role;
select soko_test.as_user('sup_admin');

update public.companies
set license_no = 'LIC-AUDIT-SECRET-77', issuing_authority = 'AUTH-SECRET-DED',
    address = '1 Audit Secret Street', general_email = 'ceo@audit-secret.test',
    phone = '+971500007777', trading_name = 'Audit Visible Trading'
where id = soko_test.id('supplier');

update public.vendor_records
set contact_name = 'Vendor Secret Person', contact_email = 'vendor@audit-secret.test',
    contact_phone = '+971509990000', approval_note = 'private approval reasoning'
where id = soko_test.id('vendor_record');

-- Redaction -------------------------------------------------------------------
select soko_test.expect_count('AU: company audit holds no licence, address, email or phone values',
  $$select count(*) from public.audit_log where entity = 'companies'
    and diff::text ~ '(LIC-AUDIT-SECRET|AUTH-SECRET|Audit Secret Street|audit-secret\.test|500007777)'$$, 0);
select soko_test.expect_count('AU: company audit names each redacted licence/contact field',
  format($$select count(*) from public.audit_log where entity = 'companies' and entity_id = %L and action = 'update'
    and diff -> 'redacted' ?& array['license_no','issuing_authority','address','general_email','phone']$$,
    soko_test.id('supplier')), 1);
select soko_test.expect_count('AU: allowlisted company change keeps its before/after value',
  format($$select count(*) from public.audit_log where entity = 'companies' and entity_id = %L
    and diff -> 'changed' -> 'trading_name' ->> 'to' = 'Audit Visible Trading'$$, soko_test.id('supplier')), 1);
select soko_test.expect_count('AU: vendor contact details and approval note are redacted',
  $$select count(*) from public.audit_log where entity = 'vendor_records'
    and diff::text ~ '(Vendor Secret Person|audit-secret\.test|509990000|private approval reasoning)'$$, 0);
select soko_test.expect_count('AU: vendor audit records which private fields changed, for the contractor only',
  format($$select count(*) from public.audit_log where entity = 'vendor_records' and entity_id = %L and company_id = %L
    and diff -> 'redacted' ?& array['contact_name','contact_email','contact_phone','approval_note']$$,
    soko_test.id('vendor_record'), soko_test.id('contractor')), 1);
select soko_test.expect_count('AU: invitation audits contain no invitee email',
  $$select count(*) from public.audit_log where entity = 'company_invitations' and diff::text like '%soko-security.test%'$$, 0);
select soko_test.expect_count('AU: invitation audits flag the email as redacted',
  $$select (count(*) > 0)::int from public.audit_log where entity = 'company_invitations' and diff -> 'redacted' ? 'email'$$, 1);
select soko_test.expect_count('AU: token hashes are never named or stored in audit diffs',
  $$select count(*) from public.audit_log where diff::text like '%token_hash%'$$, 0);
select soko_test.expect_count('AU: no audit diff contains a document storage path',
  $$select count(*) from public.audit_log a join public.document_versions v on position(v.storage_path in a.diff::text) > 0$$, 0);
select soko_test.expect_count('AU: document version audit flags storage path and file name as redacted',
  format($$select count(*) from public.audit_log where entity = 'document_versions' and entity_id = %L and action = 'insert'
    and diff -> 'redacted' ?& array['storage_path','file_name']$$, soko_test.id('document_version')), 1);
select soko_test.expect_count('AU: platform admin note is redacted',
  format($$select count(*) from public.audit_log where entity = 'platform_admins' and entity_id = %L
    and diff -> 'redacted' ? 'note' and diff::text not like '%%security test fixture%%'$$, soko_test.id('padmin')), 1);

-- Entity identification -------------------------------------------------------
select soko_test.expect_count('AU: subscription audit is identified by its company_id primary key',
  format($$select (count(*) > 0)::int from public.audit_log where entity = 'company_subscriptions'
    and entity_id = %L and entity_key = jsonb_build_object('company_id', %L::uuid)$$,
    soko_test.id('supplier'), soko_test.id('supplier')), 1);
select soko_test.expect_count('AU: platform admin audit is identified by user_id and has no company',
  format($$select count(*) from public.audit_log where entity = 'platform_admins' and entity_id = %L
    and entity_key ->> 'user_id' = %L and company_id is null$$, soko_test.id('padmin'), soko_test.id('padmin')), 1);
select soko_test.expect_count('AU: no audit row is missing its entity id',
  $$select count(*) from public.audit_log a
    where a.entity in (select table_name from private.audit_config) and a.entity_id is null$$, 0);
select soko_test.expect_count('AU: every company-owned audit row names its company',
  $$select count(*) from public.audit_log where entity <> 'platform_admins' and company_id is null$$, 0);
select soko_test.expect_count('AU: a visit is audited once for each party',
  format($$select count(distinct company_id) from public.audit_log
    where entity = 'visits' and entity_id = %L and action = 'insert'$$, soko_test.id('visit')), 2);

create table soko_test.audit_pair (
  region text, seq int, label text, secret text, touched_at timestamptz,
  primary key (seq, region)
);
select private.attach_audit('soko_test.audit_pair', '{}', array['region','seq','label'], array['touched_at']);
insert into soko_test.audit_pair values ('ae', 7, 'visible', 'hidden-value', now());
update soko_test.audit_pair set touched_at = now() + interval '1 hour';
update soko_test.audit_pair set secret = 'hidden-value-2';
delete from soko_test.audit_pair;

select soko_test.expect_count('AU: composite key is joined in primary-key order',
  $$select count(*) from public.audit_log where entity = 'audit_pair' and entity_id = '7/ae'
    and entity_key = '{"seq": 7, "region": "ae"}'::jsonb$$, 3);
select soko_test.expect_count('AU: composite-key insert logs allowlisted values and redacts the rest',
  $$select count(*) from public.audit_log where entity = 'audit_pair' and action = 'insert'
    and diff = '{"values": {"seq": 7, "label": "visible", "region": "ae"}, "redacted": ["secret"]}'::jsonb$$, 1);
select soko_test.expect_count('AU: an update touching only omitted columns writes no audit row',
  $$select count(*) from public.audit_log where entity = 'audit_pair' and action = 'update'$$, 1);
select soko_test.expect_count('AU: a redacted-only update is still recorded, without values',
  $$select count(*) from public.audit_log where entity = 'audit_pair' and action = 'update'
    and diff = '{"changed": {}, "redacted": ["secret"]}'::jsonb$$, 1);
select soko_test.expect_count('AU: no composite-table audit contains the secret value',
  $$select count(*) from public.audit_log where entity = 'audit_pair' and diff::text like '%hidden-value%'$$, 0);

create table soko_test.audit_nopk (a int);
create table soko_test.audit_noconf (id int primary key, secret text);
create trigger audit_row after insert on soko_test.audit_noconf
  for each row execute function private.audit_row();
insert into soko_test.audit_noconf values (1, 'leak-me');

select soko_test.expect_denied('AU: attach_audit rejects an unknown column',
  $$select private.attach_audit('soko_test.audit_pair', '{}', array['region','no_such_column'])$$);
select soko_test.expect_denied('AU: attach_audit rejects a table without a primary key',
  $$select private.attach_audit('soko_test.audit_nopk', '{}', array['a'])$$);
select soko_test.expect_denied('AU: attach_audit rejects a column both logged and omitted',
  $$select private.attach_audit('soko_test.audit_pair', '{}', array['label'], array['label'])$$);
select soko_test.expect_count('AU: an unregistered audit trigger records nothing but the event',
  $$select count(*) from public.audit_log where entity = 'audit_noconf' and diff = '{"unconfigured": true}'::jsonb
    and diff::text not like '%leak-me%'$$, 1);

-- Audit visibility and integrity ---------------------------------------------
select soko_test.expect_denied('AU: even the table owner cannot delete audit rows',
  $$delete from public.audit_log where entity = 'audit_pair'$$);

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('AU: contractor admin sees its own vendor audit trail',
  $$select (count(*) > 0)::int from public.audit_log where entity = 'vendor_records'$$, 1);
select soko_test.expect_count('AU: contractor admin sees no supplier audit rows',
  format($$select count(*) from public.audit_log where company_id = %L$$, soko_test.id('supplier')), 0);
select soko_test.expect_count('AU: each visit party reads only its own copy of the visit audit',
  format($$select count(*) from public.audit_log where entity = 'visits' and entity_id = %L and action = 'insert'$$,
    soko_test.id('visit')), 1);
select soko_test.expect_denied('AU: clients cannot read the audit registry',
  $$select count(*) from private.audit_config$$);
select soko_test.expect_denied('AU: clients cannot register audit tables',
  $$select private.attach_audit('public.notifications', '{}', array['id'])$$);
reset role;

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_count('AU: a member without team.manage sees no audit rows',
  $$select count(*) from public.audit_log$$, 0);
reset role;

-- Notification isolation -----------------------------------------------------
select private.notify_permission_holders(soko_test.id('supplier'), 'team.manage', 'audit_test.ping',
  jsonb_build_object('k', 'v'));
select private.notify(null, soko_test.id('supplier'), 'audit_test.null');

select soko_test.expect_count('NT: permission notifications reach only that company''s permission holders',
  format($$select count(*) from public.notifications n where n.type = 'audit_test.ping'
    and not exists (select 1 from public.company_memberships m
      join public.role_permissions rp on rp.company_kind = m.company_kind and rp.role_key = m.role_key
      where m.company_id = %L and m.user_id = n.user_id and m.status = 'active' and rp.permission = 'team.manage')$$,
    soko_test.id('supplier')), 0);
select soko_test.expect_count('NT: a notification with no recipient is dropped',
  $$select count(*) from public.notifications where type = 'audit_test.null'$$, 0);
select soko_test.expect_count('NT: no notification payload carries tokens, storage paths or licence numbers',
  $$select count(*) from public.notifications n
    where n.payload::text ~ '(token_hash|storage_path|license_no|LIC-AUDIT-SECRET)'
       or exists (select 1 from public.document_versions v where position(v.storage_path in n.payload::text) > 0)$$, 0);

select soko_test.as_user('sup_admin');
set local role authenticated;
select soko_test.expect_count('NT: the recipient sees its notification',
  $$select count(*) from public.notifications where type = 'audit_test.ping'$$, 1);
select soko_test.expect_denied('NT: recipient cannot rewrite the payload',
  $$update public.notifications set payload = '{"forged": true}' where type = 'audit_test.ping'$$);
select soko_test.expect_denied('NT: recipient cannot move a notification to another company',
  format($$update public.notifications set company_id = %L where type = 'audit_test.ping'$$, soko_test.id('contractor')));
select soko_test.expect_denied('NT: recipient cannot hand a notification to another user',
  format($$update public.notifications set user_id = %L where type = 'audit_test.ping'$$, soko_test.id('con_admin')));
select soko_test.expect_ok('NT: recipient can mark its notification read',
  $$update public.notifications set read_at = now() where type = 'audit_test.ping'$$);
reset role;

select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('NT: another company''s admin cannot see the notification',
  $$select count(*) from public.notifications where type = 'audit_test.ping'$$, 0);
select soko_test.expect_denied('NT: another company''s admin cannot mark it read',
  $$update public.notifications set read_at = null where type = 'audit_test.ping'$$);
select soko_test.expect_denied('NT: another company''s admin cannot delete it',
  $$delete from public.notifications where type = 'audit_test.ping'$$);
reset role;

select soko_test.as_user('sup_viewer');
set local role authenticated;
select soko_test.expect_count('NT: a same-company member without the permission does not receive it',
  $$select count(*) from public.notifications where type = 'audit_test.ping'$$, 0);
reset role;

-- =============================================================================
-- 12. Migration 04 — audit lifecycle integrity
-- Exact INSERT/UPDATE/DELETE records, company deletion cascades, redaction of
-- deleted rows, append-only enforcement and per-user notification isolation.
-- =============================================================================
reset role;
insert into soko_test.ids (key, id) values
  ('ai_admin',  '00000000-0000-4000-8000-000000000019'),
  ('ai_member', '00000000-0000-4000-8000-00000000001a'),
  ('ai_temp',   '00000000-0000-4000-8000-00000000001b'),
  ('ai_co',     '00000000-0000-4000-8000-0000000000b1'),
  ('ai_m_admin','00000000-0000-4000-8000-0000000000b2'),
  ('ai_m_member','00000000-0000-4000-8000-0000000000b3'),
  ('ai_m_temp', '00000000-0000-4000-8000-0000000000b4');
insert into auth.users (id, email, aud, role, email_confirmed_at)
select id, key || '@soko-security.test', 'authenticated', 'authenticated', now()
from soko_test.ids where key in ('ai_admin', 'ai_member', 'ai_temp');

select soko_test.as_user('ai_admin');
insert into public.companies (id, kind, legal_name, license_no, issuing_authority, address, general_email, phone)
values (soko_test.id('ai_co'), 'supplier', 'Audit Lifecycle Co', 'LIC-DEL-SECRET-91', 'AUTH-DEL-SECRET',
        '9 Deleted Secret Road', 'owner@audit-del.test', '+971500009191');
insert into public.company_memberships (id, company_id, company_kind, user_id, role_key) values
  (soko_test.id('ai_m_admin'),  soko_test.id('ai_co'), 'supplier', soko_test.id('ai_admin'),  'supplier_admin'),
  (soko_test.id('ai_m_member'), soko_test.id('ai_co'), 'supplier', soko_test.id('ai_member'), 'viewer'),
  (soko_test.id('ai_m_temp'),   soko_test.id('ai_co'), 'supplier', soko_test.id('ai_temp'),   'viewer');
update public.company_memberships set role_key = 'supplier_admin' where id = soko_test.id('ai_m_member');
delete from public.company_memberships where id = soko_test.id('ai_m_temp');

-- INSERT / UPDATE / DELETE records ------------------------------------------
select soko_test.expect_count('AI: membership INSERT has action, entity id, actor and exact allowlisted values',
  format($$select count(*) from public.audit_log
    where entity = 'company_memberships' and action = 'insert' and entity_id = %1$L
      and entity_key = jsonb_build_object('id', %1$L::uuid) and company_id = %2$L and actor_id = %3$L
      and diff = jsonb_build_object('values', jsonb_build_object(
        'id', %1$L::uuid, 'company_id', %2$L::uuid, 'company_kind', 'supplier',
        'user_id', %4$L::uuid, 'role_key', 'viewer', 'status', 'active'))$$,
    soko_test.id('ai_m_member'), soko_test.id('ai_co'), soko_test.id('ai_admin'), soko_test.id('ai_member')), 1);
select soko_test.expect_count('AI: membership UPDATE records only the changed field, without timestamps',
  format($$select count(*) from public.audit_log
    where entity = 'company_memberships' and action = 'update' and entity_id = %L and company_id = %L
      and diff = '{"changed": {"role_key": {"from": "viewer", "to": "supplier_admin"}}}'::jsonb$$,
    soko_test.id('ai_m_member'), soko_test.id('ai_co')), 1);
select soko_test.expect_count('AI: membership DELETE records the removed row''s allowlisted values',
  format($$select count(*) from public.audit_log
    where entity = 'company_memberships' and action = 'delete' and entity_id = %1$L and company_id = %2$L
      and diff = jsonb_build_object('values', jsonb_build_object(
        'id', %1$L::uuid, 'company_id', %2$L::uuid, 'company_kind', 'supplier',
        'user_id', %3$L::uuid, 'role_key', 'viewer', 'status', 'active'))$$,
    soko_test.id('ai_m_temp'), soko_test.id('ai_co'), soko_test.id('ai_temp')), 1);
select soko_test.expect_count('AI: company INSERT logs safe values and only names the sensitive fields',
  format($$select count(*) from public.audit_log
    where entity = 'companies' and action = 'insert' and entity_id = %1$L and company_id = %1$L
      and diff -> 'values' ->> 'legal_name' = 'Audit Lifecycle Co'
      and diff -> 'redacted' ?& array['license_no','issuing_authority','address','general_email','phone']
      and not (diff -> 'values' ?| array['license_no','issuing_authority','address','general_email','phone',
                                          'created_at','updated_at'])$$,
    soko_test.id('ai_co')), 1);

-- Pending invitation that the company deletion will cascade away.
select soko_test.as_user('ai_admin');
set local role authenticated;
insert into soko_test.secrets values ('ai_invite_token',
  public.invite_member(soko_test.id('ai_co'), 'cascade-invitee@audit-del.test', 'viewer'));
reset role;

-- Member-scoped notification created by the role change.
select soko_test.as_user('ai_member');
set local role authenticated;
select soko_test.expect_count('AI: the promoted member sees its own role-change notification',
  format($$select count(*) from public.notifications where type = 'membership.role_changed' and company_id = %L$$,
    soko_test.id('ai_co')), 1);
reset role;
select soko_test.as_user('ai_admin');
set local role authenticated;
select soko_test.expect_count('AI: a same-company admin cannot see another member''s notification',
  format($$select count(*) from public.notifications where type = 'membership.role_changed' and company_id = %L$$,
    soko_test.id('ai_co')), 0);
select soko_test.expect_denied('AI: a client cannot forge a notification for itself',
  format($$insert into public.notifications (user_id, company_id, type) values (%L, %L, 'forged')$$,
    soko_test.id('ai_admin'), soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot forge a notification for another user',
  format($$insert into public.notifications (user_id, company_id, type) values (%L, %L, 'forged')$$,
    soko_test.id('ai_member'), soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot call the internal notify function',
  format($$select private.notify(%L, %L, 'forged')$$, soko_test.id('ai_member'), soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot broadcast to permission holders',
  format($$select private.notify_permission_holders(%L, 'team.manage', 'forged')$$, soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot insert audit entries',
  format($$insert into public.audit_log (company_id, action, entity) values (%L, 'insert', 'forged')$$,
    soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot rewrite audit entries',
  format($$update public.audit_log set diff = '{}' where company_id = %L$$, soko_test.id('ai_co')));
select soko_test.expect_denied('AI: a client cannot delete audit entries',
  format($$delete from public.audit_log where company_id = %L$$, soko_test.id('ai_co')));
reset role;

-- Company deletion and cascades ---------------------------------------------
create table soko_test.ai_before as
  select id from public.audit_log where company_id = soko_test.id('ai_co');

select soko_test.as_user('padmin');
select soko_test.expect_ok('AI: deleting the company cascades through memberships and invitations',
  format($$delete from public.companies where id = %L$$, soko_test.id('ai_co')));

select soko_test.expect_count('AI: every pre-deletion audit row survives the company deletion',
  $$select count(*) from soko_test.ai_before b where not exists (select 1 from public.audit_log a where a.id = b.id)$$, 0);
select soko_test.expect_count('AI: pre-deletion audit rows keep the original company id',
  format($$select count(*) from public.audit_log a join soko_test.ai_before b using (id)
    where a.company_id is distinct from %L$$, soko_test.id('ai_co')), 0);
select soko_test.expect_count('AI: company DELETE is audited under the deleted company id, with actor',
  format($$select count(*) from public.audit_log
    where entity = 'companies' and action = 'delete' and entity_id = %1$L and company_id = %1$L
      and entity_key = jsonb_build_object('id', %1$L::uuid) and actor_id = %2$L$$,
    soko_test.id('ai_co'), soko_test.id('padmin')), 1);
select soko_test.expect_count('AI: cascaded membership DELETEs are each audited under the original company id',
  format($$select count(*) from public.audit_log
    where entity = 'company_memberships' and action = 'delete' and company_id = %L
      and entity_id in (%L, %L) and not (id in (select id from soko_test.ai_before))$$,
    soko_test.id('ai_co'), soko_test.id('ai_m_admin'), soko_test.id('ai_m_member')), 2);
select soko_test.expect_count('AI: cascaded invitation DELETE is audited under the original company id',
  format($$select count(*) from public.audit_log
    where entity = 'company_invitations' and action = 'delete' and company_id = %L$$, soko_test.id('ai_co')), 1);
select soko_test.expect_count('AI: no audit row for the deleted company is left without a company id',
  format($$select count(*) from public.audit_log
    where company_id is null and entity in ('companies','company_memberships','company_invitations')
      and (entity_id in (%L, %L, %L) or entity_key ->> 'company_id' = %L)$$,
    soko_test.id('ai_co'), soko_test.id('ai_m_admin'), soko_test.id('ai_m_member'), soko_test.id('ai_co')), 0);

-- Deleted rows stay redacted -------------------------------------------------
select soko_test.expect_count('AI: company DELETE keeps safe values and names redacted fields only',
  format($$select count(*) from public.audit_log
    where entity = 'companies' and action = 'delete' and entity_id = %L
      and diff -> 'values' ->> 'legal_name' = 'Audit Lifecycle Co'
      and diff -> 'redacted' ?& array['license_no','issuing_authority','address','general_email','phone']
      and not (diff -> 'values' ?| array['license_no','issuing_authority','address','general_email','phone'])$$,
    soko_test.id('ai_co')), 1);
select soko_test.expect_count('AI: no audit row ever holds the deleted company''s licence or contact values',
  $$select count(*) from public.audit_log
    where diff::text ~ '(LIC-DEL-SECRET|AUTH-DEL-SECRET|Deleted Secret Road|audit-del\.test|500009191)'$$, 0);
select soko_test.expect_count('AI: cascaded invitation DELETE redacts the email and drops the token hash',
  format($$select count(*) from public.audit_log
    where entity = 'company_invitations' and action = 'delete' and company_id = %L
      and diff -> 'redacted' ? 'email' and not (diff -> 'values' ? 'email')
      and diff::text not like '%%token_hash%%' and diff::text not like '%%cascade-invitee%%'$$,
    soko_test.id('ai_co')), 1);
select soko_test.expect_count('AI: the deleted company''s notifications are removed with it',
  format($$select count(*) from public.notifications where company_id = %L$$, soko_test.id('ai_co')), 0);

-- Post-deletion visibility --------------------------------------------------
select soko_test.as_user('ai_admin');
set local role authenticated;
select soko_test.expect_count('AI: the former admin can no longer read the deleted company''s audit trail',
  format($$select count(*) from public.audit_log where company_id = %L$$, soko_test.id('ai_co')), 0);
reset role;
select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_count('AI: a platform admin can still read the deleted company''s audit trail',
  format($$select (count(*) >= 8)::int from public.audit_log where company_id = %L$$, soko_test.id('ai_co')), 1);
reset role;

-- Append-only enforcement ---------------------------------------------------
select soko_test.expect_denied('AI: the table owner cannot update audit rows',
  format($$update public.audit_log set diff = '{}' where company_id = %L$$, soko_test.id('ai_co')));
select soko_test.expect_denied('AI: the table owner cannot delete audit rows',
  format($$delete from public.audit_log where company_id = %L$$, soko_test.id('ai_co')));
select soko_test.expect_denied('AI: the table owner cannot truncate the audit log',
  $$truncate public.audit_log$$);
set local role service_role;
select soko_test.expect_ok('AI: the service role can read the audit log',
  $$select count(*) from public.audit_log$$);
select soko_test.expect_denied('AI: the service role cannot insert audit entries',
  $$insert into public.audit_log (action, entity) values ('insert', 'forged')$$);
select soko_test.expect_denied('AI: the service role cannot update audit entries',
  $$update public.audit_log set diff = '{}'$$);
select soko_test.expect_denied('AI: the service role cannot delete audit entries',
  $$delete from public.audit_log$$);
select soko_test.expect_denied('AI: the service role cannot truncate the audit log',
  $$truncate public.audit_log$$);
reset role;
select soko_test.expect_count('AI: audit rows are intact after every mutation attempt',
  $$select count(*) from soko_test.ai_before b where not exists (select 1 from public.audit_log a where a.id = b.id)$$, 0);

-- =============================================================================
-- 13. Migration 05 — credit ledger hardening
-- Append-only and TRUNCATE protection, write privileges, explicit locking,
-- no-negative-balance rule, adjustment-note confidentiality, plan-kind rules,
-- tenant isolation, monthly-grant idempotency and company deletion.
-- Concurrent spending needs several sessions: see credit_concurrency_tests.mjs.
-- =============================================================================
reset role;
create function soko_test.expect_sqlstate(p_label text, p_sql text, p_state text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
    insert into soko_test.results (label, passed, detail) values (p_label, false, 'statement succeeded');
  exception when others then
    insert into soko_test.results (label, passed, detail)
    values (p_label, sqlstate = p_state, sqlstate || ': ' || sqlerrm);
  end;
end $$;
grant execute on function soko_test.expect_sqlstate(text, text, text) to anon, authenticated, service_role;

insert into soko_test.ids (key, id) values
  ('cr_admin',  '00000000-0000-4000-8000-00000000001c'),
  ('cr_viewer', '00000000-0000-4000-8000-00000000001d'),
  ('cr_co',     '00000000-0000-4000-8000-0000000000c5'),
  ('cr_nosub',  '00000000-0000-4000-8000-0000000000c6'),
  ('cr_other',  '00000000-0000-4000-8000-0000000000c7');
insert into auth.users (id, email, aud, role, email_confirmed_at)
select id, key || '@soko-security.test', 'authenticated', 'authenticated', now()
from soko_test.ids where key in ('cr_admin', 'cr_viewer');

select soko_test.as_user('cr_admin');
insert into public.companies (id, kind, legal_name) values
  (soko_test.id('cr_co'),    'supplier', 'Credit Ledger Co'),
  (soko_test.id('cr_nosub'), 'supplier', 'No Subscription Co'),
  (soko_test.id('cr_other'), 'supplier', 'Other Credit Co');
insert into public.company_memberships (company_id, company_kind, user_id, role_key) values
  (soko_test.id('cr_co'), 'supplier', soko_test.id('cr_admin'),  'supplier_admin'),
  (soko_test.id('cr_co'), 'supplier', soko_test.id('cr_viewer'), 'viewer');
delete from public.company_subscriptions where company_id = soko_test.id('cr_nosub');
insert into public.credit_ledger (company_id, delta, reason) values
  (soko_test.id('cr_co'), 100, 'purchase'),
  (soko_test.id('cr_other'), 50, 'purchase');

-- Structural protections -----------------------------------------------------
select soko_test.expect_count('CR: credit ledger and notes have TRUNCATE guards',
  $$select count(*) from pg_trigger where not tgisinternal
    and tgname in ('credit_ledger_no_truncate', 'credit_adjustment_notes_no_truncate')$$, 2);
select soko_test.expect_count('CR: anon, authenticated and service_role hold no ledger or note write privilege',
  $$select count(*) from unnest(array['anon','authenticated','service_role']) r,
         unnest(array['public.credit_ledger','public.credit_adjustment_notes']) t,
         unnest(array['INSERT','UPDATE','DELETE','TRUNCATE']) p
    where has_table_privilege(r, t, p)$$, 0);
select soko_test.expect_count('CR: no client role can touch the credit guard',
  $$select count(*) from unnest(array['anon','authenticated','service_role']) r,
         unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE']) p
    where has_table_privilege(r, 'private.credit_guard', p)$$, 0);

-- Unauthorized ledger modifications -----------------------------------------
select soko_test.expect_denied('CR: the table owner cannot truncate the credit ledger',
  $$truncate public.credit_ledger$$);
-- CASCADE passes the foreign-key check, so this proves the TRUNCATE guard itself.
select soko_test.expect_sqlstate('CR: the table owner cannot truncate the ledger even with CASCADE',
  $$truncate public.credit_ledger cascade$$, '42501');
select soko_test.expect_sqlstate('CR: the table owner cannot truncate adjustment notes',
  $$truncate public.credit_adjustment_notes$$, '42501');
select soko_test.expect_sqlstate('CR: the table owner cannot rewrite ledger entries',
  format($$update public.credit_ledger set delta = 999 where company_id = %L$$, soko_test.id('cr_co')), '42501');
select soko_test.expect_sqlstate('CR: the table owner cannot delete ledger entries of a live company',
  format($$delete from public.credit_ledger where company_id = %L$$, soko_test.id('cr_co')), '42501');

set local role service_role;
select soko_test.expect_ok('CR: the service role can read the ledger',
  $$select count(*) from public.credit_ledger$$);
select soko_test.expect_sqlstate('CR: the service role cannot insert ledger entries',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, 1000, 'purchase')$$,
         soko_test.id('cr_co')), '42501');
select soko_test.expect_sqlstate('CR: the service role cannot update ledger entries',
  $$update public.credit_ledger set delta = 999$$, '42501');
select soko_test.expect_sqlstate('CR: the service role cannot delete ledger entries',
  $$delete from public.credit_ledger$$, '42501');
select soko_test.expect_sqlstate('CR: the service role cannot truncate the ledger',
  $$truncate public.credit_ledger$$, '42501');
select soko_test.expect_sqlstate('CR: the service role cannot write adjustment notes',
  $$insert into public.credit_adjustment_notes (ledger_id, company_id, note) values (1, gen_random_uuid(), 'x')$$, '42501');
reset role;

select soko_test.as_user('cr_admin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: a company admin cannot insert ledger entries',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, 1000, 'purchase')$$,
         soko_test.id('cr_co')), '42501');
select soko_test.expect_sqlstate('CR: a company admin cannot update ledger entries',
  $$update public.credit_ledger set delta = 999$$, '42501');
select soko_test.expect_sqlstate('CR: a company admin cannot delete ledger entries',
  $$delete from public.credit_ledger$$, '42501');
select soko_test.expect_sqlstate('CR: a company admin cannot truncate the ledger',
  $$truncate public.credit_ledger$$, '42501');
select soko_test.expect_sqlstate('CR: a company admin cannot call spend_credits',
  format($$select private.spend_credits(%L, 1, 'campaign_launch', null)$$, soko_test.id('cr_co')), '42501');
reset role;

select soko_test.as_anon();
set local role anon;
select soko_test.expect_sqlstate('CR: anon cannot insert ledger entries',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, 1000, 'purchase')$$,
         soko_test.id('cr_co')), '42501');
select soko_test.expect_sqlstate('CR: anon cannot read the ledger',
  $$select count(*) from public.credit_ledger$$, '42501');
reset role;
select soko_test.expect_count('CR: the ledger is intact after every modification attempt',
  format($$select count(*) from public.credit_ledger where company_id = %L and delta = 100$$, soko_test.id('cr_co')), 1);

-- spend_credits / add_credits ----------------------------------------------
select soko_test.as_user('cr_admin');
select soko_test.expect_sqlstate('CR: spending for a missing company is rejected',
  $$select private.spend_credits(gen_random_uuid(), 1, 'campaign_launch', null)$$, 'P0002');
select soko_test.expect_sqlstate('CR: spending for a null company is rejected',
  $$select private.spend_credits(null, 1, 'campaign_launch', null)$$, 'P0002');
select soko_test.expect_sqlstate('CR: spending for a company without a subscription is rejected',
  format($$select private.spend_credits(%L, 1, 'campaign_launch', null)$$, soko_test.id('cr_nosub')), 'P0002');
select soko_test.expect_sqlstate('CR: spending a non-positive amount is rejected',
  format($$select private.spend_credits(%L, 0, 'campaign_launch', null)$$, soko_test.id('cr_co')), '22023');
select soko_test.expect_sqlstate('CR: spending with a credit reason is rejected',
  format($$select private.spend_credits(%L, 1, 'purchase', null)$$, soko_test.id('cr_co')), '22023');
select soko_test.expect_sqlstate('CR: spending more than the balance is rejected',
  format($$select private.spend_credits(%L, 101, 'campaign_launch', null)$$, soko_test.id('cr_co')), '53400');
select soko_test.expect_ok('CR: spending within the balance succeeds',
  format($$select private.spend_credits(%L, 60, 'campaign_launch', null)$$, soko_test.id('cr_co')));
select soko_test.expect_sqlstate('CR: spending one credit past the remaining balance is rejected',
  format($$select private.spend_credits(%L, 41, 'campaign_launch', null)$$, soko_test.id('cr_co')), '53400');
select soko_test.expect_ok('CR: spending the exact remaining balance succeeds',
  format($$select private.spend_credits(%L, 40, 'campaign_launch', null)$$, soko_test.id('cr_co')));
select soko_test.expect_sqlstate('CR: spending from a zero balance is rejected',
  format($$select private.spend_credits(%L, 1, 'campaign_launch', null)$$, soko_test.id('cr_co')), '53400');
select soko_test.expect_count('CR: the balance is exactly zero after spending',
  format($$select private.credit_balance(%L)$$, soko_test.id('cr_co')), 0);
select soko_test.expect_count('CR: spending writes the company''s guard row',
  format($$select count(*) from private.credit_guard where company_id = %L and version >= 1$$, soko_test.id('cr_co')), 1);
select soko_test.expect_sqlstate('CR: even the table owner cannot insert a debit that overdraws',
  format($$insert into public.credit_ledger (company_id, delta, reason) values (%L, -1, 'campaign_launch')$$,
         soko_test.id('cr_co')), '53400');
select soko_test.expect_sqlstate('CR: add_credits rejects a reason outside refunds and purchases',
  format($$select private.add_credits(%L, 10, 'monthly_grant', null)$$, soko_test.id('cr_co')), '22023');
select soko_test.expect_sqlstate('CR: add_credits rejects a missing company',
  $$select private.add_credits(gen_random_uuid(), 10, 'purchase', null)$$, 'P0002');
select soko_test.expect_ok('CR: a refund restores credits',
  format($$select private.add_credits(%L, 30, 'campaign_refund', null)$$, soko_test.id('cr_co')));
select soko_test.expect_count('CR: another company''s balance is untouched',
  format($$select private.credit_balance(%L)$$, soko_test.id('cr_other')), 50);

-- Platform-admin adjustments --------------------------------------------------
select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: an adjustment that would go negative is rejected',
  format($$select public.admin_adjust_credits(%L, -31, 'too much')$$, soko_test.id('cr_co')), '53400');
select soko_test.expect_sqlstate('CR: a zero adjustment is rejected',
  format($$select public.admin_adjust_credits(%L, 0, null)$$, soko_test.id('cr_co')), '22023');
select soko_test.expect_sqlstate('CR: an oversized adjustment is rejected',
  format($$select public.admin_adjust_credits(%L, 100001, null)$$, soko_test.id('cr_co')), '22023');
select soko_test.expect_sqlstate('CR: an adjustment for a missing company is rejected',
  $$select public.admin_adjust_credits(gen_random_uuid(), 5, null)$$, 'P0002');
select soko_test.expect_ok('CR: an adjustment down to exactly zero succeeds',
  format($$select public.admin_adjust_credits(%L, -30, 'SECRET-NOTE chargeback for licence LIC-CR-777')$$,
         soko_test.id('cr_co')));
select soko_test.expect_ok('CR: a positive adjustment without a note succeeds',
  format($$select public.admin_adjust_credits(%L, 25, '   ')$$, soko_test.id('cr_co')));
select soko_test.expect_count('CR: a platform admin can read the adjustment note',
  format($$select count(*) from public.credit_adjustment_notes where company_id = %L$$, soko_test.id('cr_co')), 1);
reset role;

select soko_test.as_user('cr_admin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: a company admin cannot adjust credits',
  format($$select public.admin_adjust_credits(%L, 1000, null)$$, soko_test.id('cr_co')), '42501');
select soko_test.expect_count('CR: the company admin sees both adjustment audit entries',
  format($$select count(*) from public.audit_log where company_id = %L and action = 'credit_adjustment'$$,
         soko_test.id('cr_co')), 2);
select soko_test.expect_count('CR: the company admin cannot read adjustment notes',
  $$select count(*) from public.credit_adjustment_notes$$, 0);
select soko_test.expect_count('CR: no audit entry the company can read contains the note text',
  $$select count(*) from public.audit_log where diff::text like '%SECRET-NOTE%' or diff::text like '%LIC-CR-777%'$$, 0);
reset role;

select soko_test.expect_count('CR: the debit adjustment audit identifies the ledger row and records only amounts',
  format($$select count(*) from public.audit_log a join public.credit_ledger l on l.id::text = a.entity_id
    where a.company_id = %1$L and a.action = 'credit_adjustment' and a.entity = 'credit_ledger'
      and a.actor_id = %2$L and l.delta = -30 and l.reason = 'admin_adjustment'
      and a.entity_key = jsonb_build_object('id', l.id)
      and a.diff = '{"delta": -30, "balance_before": 30, "balance_after": 0, "has_note": true}'::jsonb$$,
    soko_test.id('cr_co'), soko_test.id('padmin')), 1);
select soko_test.expect_count('CR: a blank note is stored as no note',
  format($$select count(*) from public.audit_log where company_id = %L and action = 'credit_adjustment'
    and diff = '{"delta": 25, "balance_before": 0, "balance_after": 25, "has_note": false}'::jsonb$$,
    soko_test.id('cr_co')), 1);
select soko_test.expect_count('CR: the note is stored against the matching ledger row',
  format($$select count(*) from public.credit_adjustment_notes n join public.credit_ledger l on l.id = n.ledger_id
    where n.company_id = %L and l.delta = -30 and n.note like 'SECRET-NOTE%%'$$, soko_test.id('cr_co')), 1);
select soko_test.expect_count('CR: rejected adjustments left no ledger rows',
  format($$select count(*) from public.credit_ledger where company_id = %L and reason = 'admin_adjustment'$$,
         soko_test.id('cr_co')), 2);
select soko_test.expect_count('CR: the balance after adjustments is 25',
  format($$select private.credit_balance(%L)$$, soko_test.id('cr_co')), 25);

-- Subscriptions and plan-kind compatibility ---------------------------------
select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: a contractor plan cannot be assigned to a supplier',
  format($$select public.admin_set_subscription(%L, 'free_contractor')$$, soko_test.id('cr_co')), '23514');
select soko_test.expect_sqlstate('CR: an unknown plan is rejected',
  format($$select public.admin_set_subscription(%L, 'no_such_plan')$$, soko_test.id('cr_co')), 'P0002');
select soko_test.expect_sqlstate('CR: a subscription for a missing company is rejected',
  $$select public.admin_set_subscription(gen_random_uuid(), 'supplier_pro')$$, 'P0002');
select soko_test.expect_ok('CR: a plan open to both kinds can be assigned',
  format($$select public.admin_set_subscription(%L, 'enterprise')$$, soko_test.id('cr_co')));
select soko_test.expect_ok('CR: a supplier plan can be assigned to a supplier',
  format($$select public.admin_set_subscription(%L, 'supplier_pro')$$, soko_test.id('cr_co')));
reset role;
select soko_test.expect_sqlstate('CR: even the table owner cannot attach a mismatched plan',
  format($$update public.company_subscriptions set plan_id = 'contractor_premium' where company_id = %L$$,
         soko_test.id('cr_co')), '23514');

select soko_test.as_user('cr_admin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: a company admin cannot change its own plan',
  format($$select public.admin_set_subscription(%L, 'enterprise')$$, soko_test.id('cr_co')), '42501');
select soko_test.expect_denied('CR: a company admin cannot update its subscription row',
  format($$update public.company_subscriptions set plan_id = 'enterprise' where company_id = %L$$, soko_test.id('cr_co')));
select soko_test.expect_sqlstate('CR: a company admin cannot read another company''s balance',
  format($$select public.get_credit_balance(%L)$$, soko_test.id('cr_other')), '42501');
select soko_test.expect_count('CR: a company admin sees only its own ledger',
  $$select count(distinct company_id) from public.credit_ledger$$, 1);
reset role;

-- Tenant isolation ------------------------------------------------------------
select soko_test.as_user('cr_viewer');
set local role authenticated;
select soko_test.expect_count('CR: a member can read its company''s balance',
  format($$select public.get_credit_balance(%L)$$, soko_test.id('cr_co')), 25);
reset role;
select soko_test.as_user('outsider');
set local role authenticated;
select soko_test.expect_sqlstate('CR: an outsider cannot read the company''s balance',
  format($$select public.get_credit_balance(%L)$$, soko_test.id('cr_co')), '42501');
select soko_test.expect_count('CR: an outsider sees none of the company''s ledger rows',
  format($$select count(*) from public.credit_ledger where company_id = %L$$, soko_test.id('cr_co')), 0);
select soko_test.expect_count('CR: an outsider sees none of the company''s subscription',
  format($$select count(*) from public.company_subscriptions where company_id = %L$$, soko_test.id('cr_co')), 0);
reset role;
select soko_test.as_user('con_admin');
set local role authenticated;
select soko_test.expect_count('CR: another company''s admin sees none of the ledger rows',
  format($$select count(*) from public.credit_ledger where company_id = %L$$, soko_test.id('cr_co')), 0);
select soko_test.expect_sqlstate('CR: another company''s admin cannot read the balance',
  format($$select public.get_credit_balance(%L)$$, soko_test.id('cr_co')), '42501');
reset role;

-- Monthly-grant idempotency ---------------------------------------------------
select soko_test.expect_ok('CR: a monthly grant runs for a mid-month date',
  $$select private.grant_monthly_credits('2031-03-15')$$);
select soko_test.expect_ok('CR: a second run later in the same month is a no-op',
  $$select private.grant_monthly_credits('2031-03-28')$$);
select soko_test.expect_count('CR: one grant per company per month, stored against the first of the month',
  format($$select count(*) from public.credit_ledger where company_id = %L and reason = 'monthly_grant'
    and period = '2031-03-01' and delta = 100$$, soko_test.id('cr_co')), 1);
select soko_test.expect_count('CR: no grant was stored against a mid-month date',
  $$select count(*) from public.credit_ledger where reason = 'monthly_grant' and period <> date_trunc('month', period)::date$$, 0);
select soko_test.expect_count('CR: a zero-credit plan receives no grant',
  format($$select count(*) from public.credit_ledger where company_id = %L and reason = 'monthly_grant'$$,
         soko_test.id('cr_other')), 0);
select soko_test.expect_sqlstate('CR: a null grant period is rejected',
  $$select private.grant_monthly_credits(null)$$, '22023');
set local role service_role;
select soko_test.expect_ok('CR: the service role can run the monthly grant',
  $$select private.grant_monthly_credits('2031-04-01')$$);
reset role;
select soko_test.as_user('cr_admin');
set local role authenticated;
select soko_test.expect_sqlstate('CR: a company admin cannot run the monthly grant',
  $$select private.grant_monthly_credits('2031-05-01')$$, '42501');
reset role;
select soko_test.expect_count('CR: balance reflects exactly two monthly grants',
  format($$select private.credit_balance(%L)$$, soko_test.id('cr_co')), 225);

-- Company deletion ------------------------------------------------------------
select soko_test.expect_ok('CR: deleting the company succeeds despite the append-only ledger',
  format($$delete from public.companies where id = %L$$, soko_test.id('cr_co')));
select soko_test.expect_count('CR: the company''s ledger rows, notes, guard and subscription are gone',
  format($$select (select count(*) from public.credit_ledger where company_id = %1$L)
              + (select count(*) from public.credit_adjustment_notes where company_id = %1$L)
              + (select count(*) from private.credit_guard where company_id = %1$L)
              + (select count(*) from public.company_subscriptions where company_id = %1$L)$$,
         soko_test.id('cr_co')), 0);
select soko_test.expect_count('CR: credit-adjustment audit entries survive with the original company id',
  format($$select count(*) from public.audit_log where company_id = %L and action = 'credit_adjustment'$$,
         soko_test.id('cr_co')), 2);
select soko_test.expect_count('CR: other companies'' ledgers are untouched by the deletion',
  format($$select private.credit_balance(%L)$$, soko_test.id('cr_other')), 50);

-- =============================================================================
-- 14. Migration 06 — supplier catalogue
-- Supplier-only creation, cross-company isolation, public visibility, the
-- saved-products rule, record_product_view abuse controls, image paths vs
-- company-media storage, and grants. Actors: anon, a plain authenticated user,
-- supplier admins of two companies, a contractor admin, suspended and private
-- suppliers.
-- =============================================================================
reset role;
insert into soko_test.ids (key, id) values
  ('pc_a_admin', '00000000-0000-4000-8000-00000000001e'),
  ('pc_b_admin', '00000000-0000-4000-8000-00000000001f'),
  ('pc_con_admin','00000000-0000-4000-8000-000000000020'),
  ('pc_cap_user','00000000-0000-4000-8000-000000000021'),
  ('pc_a',       '00000000-0000-4000-8000-0000000000d1'),
  ('pc_b',       '00000000-0000-4000-8000-0000000000d2'),
  ('pc_susp',    '00000000-0000-4000-8000-0000000000d3'),
  ('pc_priv',    '00000000-0000-4000-8000-0000000000d4'),
  ('pc_con',     '00000000-0000-4000-8000-0000000000d5');
insert into auth.users (id, email, aud, role, email_confirmed_at)
select id, key || '@soko-security.test', 'authenticated', 'authenticated', now()
from soko_test.ids where key in ('pc_a_admin', 'pc_b_admin', 'pc_con_admin', 'pc_cap_user');

select soko_test.as_user('pc_a_admin');
insert into public.companies (id, kind, legal_name) values
  (soko_test.id('pc_a'),    'supplier',   'Catalogue Supplier A'),
  (soko_test.id('pc_b'),    'supplier',   'Catalogue Supplier B'),
  (soko_test.id('pc_susp'), 'supplier',   'Catalogue Suspended Supplier'),
  (soko_test.id('pc_priv'), 'supplier',   'Catalogue Private Supplier'),
  (soko_test.id('pc_con'),  'contractor', 'Catalogue Contractor');
update public.companies set is_public = true
where id in (soko_test.id('pc_a'), soko_test.id('pc_b'), soko_test.id('pc_susp'), soko_test.id('pc_con'));
insert into public.company_memberships (company_id, company_kind, user_id, role_key) values
  (soko_test.id('pc_a'),   'supplier',   soko_test.id('pc_a_admin'),   'supplier_admin'),
  (soko_test.id('pc_b'),   'supplier',   soko_test.id('pc_b_admin'),   'supplier_admin'),
  (soko_test.id('pc_con'), 'contractor', soko_test.id('pc_con_admin'), 'contractor_admin');

insert into public.products (company_id, name, status, image_paths) values
  (soko_test.id('pc_a'), 'PC A Published', 'published', array[soko_test.id('pc_a')::text || '/products/pub.png']),
  (soko_test.id('pc_a'), 'PC A Draft',     'draft',     array[soko_test.id('pc_a')::text || '/products/draft.png']),
  (soko_test.id('pc_a'), 'PC A Archived',  'archived',  '{}'),
  (soko_test.id('pc_b'), 'PC B Published', 'published', '{}'),
  (soko_test.id('pc_susp'), 'PC Susp Published', 'published', '{}'),
  (soko_test.id('pc_priv'), 'PC Priv Published', 'published', '{}');
insert into soko_test.ids select 'pc_a_pub',   id from public.products where name = 'PC A Published';
insert into soko_test.ids select 'pc_a_draft', id from public.products where name = 'PC A Draft';
insert into soko_test.ids select 'pc_a_arch',  id from public.products where name = 'PC A Archived';
insert into soko_test.ids select 'pc_b_pub',   id from public.products where name = 'PC B Published';
insert into soko_test.ids select 'pc_susp_pub',id from public.products where name = 'PC Susp Published';
insert into soko_test.ids select 'pc_priv_pub',id from public.products where name = 'PC Priv Published';
insert into public.product_specs (product_id, label, value) values
  (soko_test.id('pc_a_draft'), 'Secret spec', 'unreleased'),
  (soko_test.id('pc_b_pub'),   'Pressure', 'PN16');
insert into soko_test.ids select 'pc_b_spec', id from public.product_specs where product_id = soko_test.id('pc_b_pub');
insert into public.product_regions (product_id, region) values
  (soko_test.id('pc_b_pub'), 'Dubai'), (soko_test.id('pc_a_draft'), 'Abu Dhabi');
update public.companies set is_suspended = true where id = soko_test.id('pc_susp');
insert into storage.objects (bucket_id, name, metadata) values
  ('company-media', soko_test.id('pc_a')::text || '/products/pub.png',   '{"size": 1}'),
  ('company-media', soko_test.id('pc_a')::text || '/products/draft.png', '{"size": 1}'),
  ('company-media', soko_test.id('pc_a')::text || '/products/orphan.png','{"size": 1}'),
  ('company-media', soko_test.id('pc_a')::text || '/logo/logo.png',      '{"size": 1}');

-- 1. Only suppliers can create products -----------------------------------------
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_denied('PC: contractor cannot create a product for its own company',
  format($$insert into public.products (company_id, name) values (%L, 'Contractor Item')$$, soko_test.id('pc_con')));
select soko_test.expect_denied('PC: contractor cannot create a product for a supplier',
  format($$insert into public.products (company_id, name) values (%L, 'Injected Item')$$, soko_test.id('pc_a')));
select soko_test.expect_denied('PC: clients cannot set company_kind on insert',
  format($$insert into public.products (company_id, company_kind, name) values (%L, 'contractor', 'Kind Forge')$$, soko_test.id('pc_con')));
select soko_test.expect_denied('PC: contractor cannot edit a supplier product',
  format($$update public.products set name = 'Hijacked' where id = %L$$, soko_test.id('pc_a_pub')));
reset role;
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_denied('PC: supplier cannot move a product to a contractor company',
  format($$update public.products set company_id = %L where id = %L$$, soko_test.id('pc_con'), soko_test.id('pc_a_pub')));
select soko_test.expect_denied('PC: supplier cannot rewrite company_kind',
  format($$update public.products set company_kind = 'contractor' where id = %L$$, soko_test.id('pc_a_pub')));
select soko_test.expect_ok('PC: supplier admin can create its own product',
  format($$insert into public.products (company_id, name) values (%L, 'PC A New')$$, soko_test.id('pc_a')));
reset role;

-- 2. Cross-company isolation (Supplier A against Supplier B) --------------------
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_denied('PC: A cannot create a product for B',
  format($$insert into public.products (company_id, name) values (%L, 'Planted')$$, soko_test.id('pc_b')));
select soko_test.expect_denied('PC: A cannot edit B''s product',
  format($$update public.products set name = 'Defaced' where id = %L$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PC: A cannot delete B''s product',
  format($$delete from public.products where id = %L$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PC: A cannot add specs to B''s product',
  format($$insert into public.product_specs (product_id, label, value) values (%L, 'x', 'y')$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PC: A cannot edit B''s specs',
  format($$update public.product_specs set value = 'tampered' where id = %L$$, soko_test.id('pc_b_spec')));
select soko_test.expect_denied('PC: A cannot delete B''s specs',
  format($$delete from public.product_specs where id = %L$$, soko_test.id('pc_b_spec')));
select soko_test.expect_denied('PC: A cannot move its spec onto B''s product',
  format($$update public.product_specs set product_id = %L where product_id = %L$$,
         soko_test.id('pc_b_pub'), soko_test.id('pc_a_draft')));
select soko_test.expect_denied('PC: A cannot add regions to B''s product',
  format($$insert into public.product_regions (product_id, region) values (%L, 'Sharjah')$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PC: A cannot delete B''s regions',
  format($$delete from public.product_regions where product_id = %L$$, soko_test.id('pc_b_pub')));
select soko_test.expect_count('PC: A cannot see B''s products through member access to drafts',
  format($$select count(*) from public.products where company_id = %L and status <> 'published'$$, soko_test.id('pc_b')), 0);
reset role;
select soko_test.expect_count('PC: B''s product, spec and regions are unchanged',
  format($$select (select count(*) from public.products where id = %1$L and name = 'PC B Published')
              + (select count(*) from public.product_specs where product_id = %1$L and value = 'PN16')
              + (select count(*) from public.product_regions where product_id = %1$L)$$, soko_test.id('pc_b_pub')), 3);

-- 3. Public visibility ----------------------------------------------------------
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('PC: anon sees a published product of a public supplier',
  format($$select count(*) from public.products where id = %L$$, soko_test.id('pc_a_pub')), 1);
select soko_test.expect_count('PC: anon cannot see draft or archived products',
  format($$select count(*) from public.products where id in (%L, %L)$$, soko_test.id('pc_a_draft'), soko_test.id('pc_a_arch')), 0);
select soko_test.expect_count('PC: anon cannot see a suspended supplier''s published product',
  format($$select count(*) from public.products where id = %L$$, soko_test.id('pc_susp_pub')), 0);
select soko_test.expect_count('PC: anon cannot see a private supplier''s published product',
  format($$select count(*) from public.products where id = %L$$, soko_test.id('pc_priv_pub')), 0);
select soko_test.expect_count('PC: anon cannot see specs or regions of a draft',
  format($$select (select count(*) from public.product_specs where product_id = %1$L)
              + (select count(*) from public.product_regions where product_id = %1$L)$$, soko_test.id('pc_a_draft')), 0);
reset role;
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_count('PC: contractor sees only the publicly visible catalogue products',
  format($$select count(*) from public.products where company_id in (%L, %L, %L, %L)$$,
         soko_test.id('pc_a'), soko_test.id('pc_b'), soko_test.id('pc_susp'), soko_test.id('pc_priv')), 2);
reset role;
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_count('PC: supplier members see their own draft and archived products',
  format($$select count(*) from public.products where id in (%L, %L)$$, soko_test.id('pc_a_draft'), soko_test.id('pc_a_arch')), 2);
reset role;

-- 4. Saved-products rule --------------------------------------------------------
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_ok('PC: a user can save a visible product',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_a_pub')));
select soko_test.expect_denied('PC: a user cannot save a draft',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_a_draft')));
select soko_test.expect_denied('PC: a user cannot save a private supplier''s product',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_priv_pub')));
select soko_test.expect_denied('PC: a user cannot save a suspended supplier''s product',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_susp_pub')));
select soko_test.expect_denied('PC: a user cannot save on behalf of someone else',
  format($$insert into public.saved_products (user_id, product_id) values (%L, %L)$$,
         soko_test.id('pc_cap_user'), soko_test.id('pc_b_pub')));
reset role;
update public.products set status = 'archived' where id = soko_test.id('pc_a_pub');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_count('PC: a saved product hides once archived',
  $$select count(*) from public.saved_products$$, 0);
reset role;
update public.products set status = 'published' where id = soko_test.id('pc_a_pub');
update public.companies set is_suspended = true where id = soko_test.id('pc_a');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_count('PC: a saved product hides while its supplier is suspended',
  $$select count(*) from public.saved_products$$, 0);
reset role;
update public.companies set is_suspended = false where id = soko_test.id('pc_a');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_count('PC: a saved product reappears when visible again',
  $$select count(*) from public.saved_products$$, 1);
reset role;
update public.products set status = 'draft' where id = soko_test.id('pc_a_pub');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_ok('PC: a user can still remove a save of a now-private product',
  format($$select public.unsave_product(%L)$$, soko_test.id('pc_a_pub')));
select soko_test.expect_ok('PC: unsave of someone else''s or an unknown product is a silent no-op',
  format($$select public.unsave_product(%L)$$, gen_random_uuid()));
reset role;
select soko_test.expect_count('PC: the hidden save was actually deleted',
  format($$select count(*) from public.saved_products where user_id = %L$$, soko_test.id('pc_con_admin')), 0);
update public.products set status = 'published' where id = soko_test.id('pc_a_pub');

-- 5. record_product_view --------------------------------------------------------
select soko_test.as_anon();
set local role anon;
select soko_test.expect_sqlstate('PC: anon cannot record views',
  format($$select public.record_product_view(%L)$$, soko_test.id('pc_a_pub')), '42501');
reset role;
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_ok('PC: a forged viewer company is accepted silently',
  format($$select public.record_product_view(%L, %L)$$, soko_test.id('pc_a_pub'), soko_test.id('pc_b')));
select soko_test.expect_ok('PC: a duplicate same-day view is accepted silently',
  format($$select public.record_product_view(%L, %L)$$, soko_test.id('pc_a_pub'), soko_test.id('pc_con')));
select soko_test.expect_ok('PC: a view of a genuine membership is accepted',
  format($$select public.record_product_view(%L, %L)$$, soko_test.id('pc_b_pub'), soko_test.id('pc_con')));
select soko_test.expect_ok('PC: views of draft, private and suspended products are silent no-ops',
  format($$select public.record_product_view(id) from (values (%L::uuid), (%L::uuid), (%L::uuid), (gen_random_uuid())) v(id)$$,
         soko_test.id('pc_a_draft'), soko_test.id('pc_priv_pub'), soko_test.id('pc_susp_pub')));
select soko_test.expect_denied('PC: clients cannot read product_views',
  $$select count(*) from public.product_views$$);
select soko_test.expect_denied('PC: clients cannot insert into product_views',
  format($$insert into public.product_views (product_id, company_id, viewer_user_id) values (%L, %L, auth.uid())$$,
         soko_test.id('pc_b_pub'), soko_test.id('pc_b')));
reset role;
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_ok('PC: a supplier viewing its own product is accepted silently',
  format($$select public.record_product_view(%L, %L)$$, soko_test.id('pc_a_pub'), soko_test.id('pc_a')));
reset role;
select soko_test.expect_count('PC: forged viewer company is dropped and the duplicate is not counted',
  format($$select count(*) from public.product_views where product_id = %L and viewer_company_id is null
             and viewer_user_id = %L$$, soko_test.id('pc_a_pub'), soko_test.id('pc_con_admin')), 1);
select soko_test.expect_count('PC: a genuine viewer company is attributed',
  format($$select count(*) from public.product_views where product_id = %L and viewer_company_id = %L$$,
         soko_test.id('pc_b_pub'), soko_test.id('pc_con')), 1);
select soko_test.expect_count('PC: self views and non-public products are never recorded',
  format($$select count(*) from public.product_views
           where viewer_user_id = %L or product_id in (%L, %L, %L)$$,
         soko_test.id('pc_a_admin'), soko_test.id('pc_a_draft'), soko_test.id('pc_priv_pub'), soko_test.id('pc_susp_pub')), 0);
update public.companies set is_suspended = true where id = soko_test.id('pc_con');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select public.record_product_view(soko_test.id('pc_a_arch'));  -- archived: ignored
reset role;
update public.products set status = 'published' where id = soko_test.id('pc_a_arch');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select public.record_product_view(soko_test.id('pc_a_arch'), soko_test.id('pc_con'));
reset role;
update public.companies set is_suspended = false where id = soko_test.id('pc_con');
select soko_test.expect_count('PC: a suspended viewer company is not attributed',
  format($$select count(*) from public.product_views where product_id = %L and viewer_company_id is null$$,
         soko_test.id('pc_a_arch')), 1);
select soko_test.as_user('pc_b_admin');
insert into public.products (company_id, name, status)
select soko_test.id('pc_b'), 'PC B Bulk ' || g, 'published' from generate_series(1, 205) g;
select soko_test.as_user('pc_cap_user');
set local role authenticated;
select soko_test.expect_count('PC: the bulk catalogue is publicly discoverable',
  format($$select count(*) from public.products where company_id = %L and name like 'PC B Bulk %%'$$, soko_test.id('pc_b')), 205);
select soko_test.expect_ok('PC: a user can view many products in one day',
  format($$select count(public.record_product_view(id)::text) from public.products where company_id = %L$$, soko_test.id('pc_b')));
reset role;
select soko_test.expect_count('PC: one user''s recorded views are capped at 200 per day',
  format($$select count(*) from public.product_views where viewer_user_id = %L$$, soko_test.id('pc_cap_user')), 200);
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select public.record_product_view(id) from public.products where name = 'PC B Bulk 1';
reset role;
select soko_test.expect_count('PC: the cap is per user, other viewers still count',
  format($$select count(*) from public.product_views p join public.products x on x.id = p.product_id
           where x.name = 'PC B Bulk 1'$$), 2);

-- 6. Image paths and company-media storage --------------------------------------
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_sqlstate('PC: an image path into another supplier''s folder is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_b')::text || '/products/x.png', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PC: a traversal image path is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/../../' || soko_test.id('pc_b')::text || '/logo/x.png', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PC: an image path outside the products folder is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/' || soko_test.id('document')::text || '/v1/licence.pdf', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PC: a null image path element is rejected',
  format($$update public.products set image_paths = array[null::text] where id = %L$$, soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PC: a new product cannot point at another supplier''s objects',
  format($$insert into public.products (company_id, name, image_paths) values (%L, 'Bad Paths', array[%L])$$,
         soko_test.id('pc_a'), soko_test.id('supplier')::text || '/products/x.png'), '23514');
select soko_test.expect_ok('PC: a valid own image path is accepted',
  format($$update public.products set image_paths = array[%L, %L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/pub.png', soko_test.id('pc_a')::text || '/products/pub-2_v1.png', soko_test.id('pc_a_pub')));
reset role;
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('PC: anon can read a published product''s image and the public logo',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name in (%L, %L)$$,
         soko_test.id('pc_a')::text || '/products/pub.png', soko_test.id('pc_a')::text || '/logo/logo.png'), 2);
select soko_test.expect_count('PC: anon cannot read draft or unreferenced product images',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name in (%L, %L)$$,
         soko_test.id('pc_a')::text || '/products/draft.png', soko_test.id('pc_a')::text || '/products/orphan.png'), 0);
reset role;
select soko_test.as_user('pc_b_admin');
set local role authenticated;
select soko_test.expect_count('PC: another supplier cannot read draft product images',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('pc_a')::text || '/products/draft.png'), 0);
select soko_test.expect_denied('PC: another supplier cannot upload into A''s products folder',
  format($$insert into storage.objects (bucket_id, name, metadata) values ('company-media', %L, '{"size":1}')$$,
         soko_test.id('pc_a')::text || '/products/planted.png'));
reset role;
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_count('PC: members read all of their own product images',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name like %L$$,
         soko_test.id('pc_a')::text || '/products/%'), 3);
reset role;
update public.products set status = 'published' where id = soko_test.id('pc_a_draft');
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('PC: publishing a product makes its image readable',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('pc_a')::text || '/products/draft.png'), 1);
reset role;
update public.companies set is_suspended = true where id = soko_test.id('pc_a');
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('PC: a suspended supplier''s media is not public',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name like %L$$,
         soko_test.id('pc_a')::text || '/%'), 0);
reset role;
update public.companies set is_suspended = false where id = soko_test.id('pc_a');

-- 7. Grants, SECURITY DEFINER and RLS -------------------------------------------
select soko_test.expect_count('PC: RLS is enabled on every catalogue table',
  $$select count(*) from pg_class where oid in ('public.products'::regclass, 'public.product_specs'::regclass,
      'public.product_regions'::regclass, 'public.saved_products'::regclass, 'public.product_views'::regclass)
    and relrowsecurity$$, 5);
select soko_test.expect_count('PC: anon holds only SELECT on public catalogue tables, nothing on saves or views',
  $$select count(*) from information_schema.role_table_grants
    where grantee = 'anon' and table_schema = 'public'
      and table_name in ('products', 'product_specs', 'product_regions', 'saved_products', 'product_views')
      and not (privilege_type = 'SELECT' and table_name in ('products', 'product_specs', 'product_regions'))$$, 0);
select soko_test.expect_count('PC: authenticated holds no TRUNCATE, REFERENCES or TRIGGER on catalogue tables',
  $$select count(*) from information_schema.role_table_grants
    where grantee in ('authenticated', 'anon', 'PUBLIC') and table_schema = 'public'
      and table_name in ('products', 'product_specs', 'product_regions', 'saved_products', 'product_views')
      and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER')$$, 0);
select soko_test.expect_count('PC: authenticated has no table-wide INSERT/UPDATE on products (column grants only)',
  $$select count(*) from information_schema.role_table_grants
    where grantee = 'authenticated' and table_schema = 'public' and table_name = 'products'
      and privilege_type in ('INSERT', 'UPDATE')$$, 0);
select soko_test.expect_count('PC: clients cannot write protected product columns',
  $$select count(*) from information_schema.column_privileges
    where grantee = 'authenticated' and table_schema = 'public' and table_name = 'products'
      and privilege_type in ('INSERT', 'UPDATE')
      and column_name in ('id', 'company_kind', 'created_by', 'created_at', 'updated_at', 'published_at')$$, 0);
select soko_test.expect_count('PC: catalogue SECURITY DEFINER functions pin search_path',
  $$select count(*) from pg_proc
    where proname in ('record_product_view', 'can_manage_product', 'unsave_product') and prosecdef
      and not coalesce(proconfig @> array['search_path=""'], false)$$, 0);
select soko_test.expect_count('PC: anon and PUBLIC cannot execute catalogue functions',
  $$select count(*) from pg_proc p
    where p.proname in ('record_product_view', 'can_manage_product', 'stamp_created_by', 'products_published_at',
                        'unsave_product', 'valid_product_image_paths')
      and (has_function_privilege('anon', p.oid, 'execute')
           or exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                      where a.grantee = 0 and a.privilege_type = 'EXECUTE'))$$, 0);
select soko_test.expect_count('PC: trigger functions are not executable by authenticated',
  $$select count(*) from pg_proc
    where proname in ('stamp_created_by', 'products_published_at')
      and has_function_privilege('authenticated', oid, 'execute')$$, 0);

-- -----------------------------------------------------------------------------
-- 15. Migration 06 — final validation: view quota, re-parenting, saves, paths
-- (Concurrency of the view cap is exercised in product_view_concurrency_tests.mjs.)
-- -----------------------------------------------------------------------------
insert into soko_test.ids (key, id) values ('pc_fresh_user', '00000000-0000-4000-8000-0000000006f1');
insert into auth.users (id, email, aud, role, email_confirmed_at)
values (soko_test.id('pc_fresh_user'), 'pc_fresh_user@soko-security.test', 'authenticated', 'authenticated', now());

-- 1. Quota row mirrors the recorded views ---------------------------------------
select soko_test.expect_count('PV: the quota row for a capped user records exactly 200',
  format($$select views from private.product_view_quota where viewer_user_id = %L$$, soko_test.id('pc_cap_user')), 200);
select soko_test.expect_count('PV: every quota row equals that user''s recorded views for the day',
  $$select count(*) from private.product_view_quota q
    where q.views <> (select count(*) from public.product_views v
                      where v.viewer_user_id = q.viewer_user_id and v.viewed_on = q.viewed_on)$$, 0);
select soko_test.expect_count('PV: views are bucketed by the UTC day',
  $$select count(*) from public.product_views where viewed_on <> (now() at time zone 'utc')::date$$, 0);

-- 2. Duplicate views are idempotent and never consume quota ---------------------
select soko_test.as_user('pc_fresh_user');
set local role authenticated;
select soko_test.expect_ok('PV: repeated same-day views of one product are accepted',
  format($$select public.record_product_view(%1$L), public.record_product_view(%1$L),
                  public.record_product_view(%1$L, %2$L)$$, soko_test.id('pc_b_pub'), soko_test.id('pc_con')));
reset role;
select soko_test.expect_count('PV: repeated views record one row',
  format($$select count(*) from public.product_views where viewer_user_id = %L$$, soko_test.id('pc_fresh_user')), 1);
select soko_test.expect_count('PV: repeated views consume one unit of quota',
  format($$select views from private.product_view_quota where viewer_user_id = %L$$, soko_test.id('pc_fresh_user')), 1);
select soko_test.as_user('pc_cap_user');
set local role authenticated;
select public.record_product_view(soko_test.id('pc_b_pub'));
select public.record_product_view(id) from public.products where name in ('PC B Bulk 204', 'PC B Bulk 205', 'PC A Published');
reset role;
select soko_test.expect_count('PV: at the cap neither repeats nor new products are recorded',
  format($$select count(*) + (select views from private.product_view_quota where viewer_user_id = %1$L)
           from public.product_views where viewer_user_id = %1$L$$, soko_test.id('pc_cap_user')), 400);

-- 3. Privacy: inaccessible products leave no trace ------------------------------
insert into soko_test.ids (key, id) values ('pc_ghost_user', '00000000-0000-4000-8000-0000000006f2');
insert into auth.users (id, email, aud, role, email_confirmed_at)
values (soko_test.id('pc_ghost_user'), 'pc_ghost_user@soko-security.test', 'authenticated', 'authenticated', now());
update public.products set status = 'draft' where id = soko_test.id('pc_a_arch');
select soko_test.as_user('pc_ghost_user');
set local role authenticated;
select soko_test.expect_count('PV: missing, draft, private and suspended products all return the same void result',
  format($$select count(*) from (values (%L::uuid), (%L::uuid), (%L::uuid), (gen_random_uuid())) v(id)
           where public.record_product_view(v.id)::text = ''$$,
         soko_test.id('pc_a_arch'), soko_test.id('pc_priv_pub'), soko_test.id('pc_susp_pub')), 4);
reset role;
select soko_test.expect_count('PV: inaccessible products create no quota row and no view',
  format($$select (select count(*) from private.product_view_quota where viewer_user_id = %1$L)
              + (select count(*) from public.product_views where viewer_user_id = %1$L)$$,
         soko_test.id('pc_ghost_user')), 0);
select soko_test.as_user('pc_b_admin');
set local role authenticated;
select public.record_product_view(soko_test.id('pc_b_pub'));
reset role;
select soko_test.expect_count('PV: a supplier viewing its own product creates no quota row',
  format($$select count(*) from private.product_view_quota where viewer_user_id = %L$$, soko_test.id('pc_b_admin')), 0);
update public.products set status = 'published' where id = soko_test.id('pc_a_arch');
select soko_test.as_user('pc_fresh_user');
set local role authenticated;
select soko_test.expect_denied('PV: clients cannot read the view quota',
  $$select count(*) from private.product_view_quota$$);
select soko_test.expect_denied('PV: clients cannot reset their view quota',
  $$update private.product_view_quota set views = 0$$);
select soko_test.expect_denied('PV: clients cannot delete their view quota',
  $$delete from private.product_view_quota$$);
reset role;
select soko_test.expect_count('PV: client roles hold no privilege on the view quota; service_role is read-only',
  $$select count(*) from information_schema.role_table_grants
    where table_schema = 'private' and table_name = 'product_view_quota'
      and (grantee in ('anon', 'authenticated', 'PUBLIC')
           or (grantee = 'service_role' and privilege_type <> 'SELECT'))$$, 0);

-- 4. Cross-company modification and re-parenting --------------------------------
insert into public.product_specs (product_id, label, value) values (soko_test.id('pc_a_pub'), 'Size', 'DN50');
insert into soko_test.ids select 'pc_a_spec', id from public.product_specs where product_id = soko_test.id('pc_a_pub');
insert into public.product_regions (product_id, region) values (soko_test.id('pc_a_pub'), 'Ajman');
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_denied('PV: A cannot reassign its product to supplier B',
  format($$update public.products set company_id = %L where id = %L$$, soko_test.id('pc_b'), soko_test.id('pc_a_pub')));
select soko_test.expect_denied('PV: A cannot re-parent its spec onto B''s product',
  format($$update public.product_specs set product_id = %L where id = %L$$, soko_test.id('pc_b_pub'), soko_test.id('pc_a_spec')));
select soko_test.expect_denied('PV: A cannot re-parent its spec onto its own other product',
  format($$update public.product_specs set product_id = %L where id = %L$$, soko_test.id('pc_a_draft'), soko_test.id('pc_a_spec')));
select soko_test.expect_denied('PV: A cannot re-parent its region onto B''s product',
  format($$update public.product_regions set product_id = %L where product_id = %L$$, soko_test.id('pc_b_pub'), soko_test.id('pc_a_pub')));
select soko_test.expect_denied('PV: A cannot pull B''s spec onto its own product',
  format($$update public.product_specs set product_id = %L where id = %L$$, soko_test.id('pc_a_pub'), soko_test.id('pc_b_spec')));
select soko_test.expect_denied('PV: A cannot rename B''s region',
  format($$update public.product_regions set region = 'Hijacked' where product_id = %L$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PV: A cannot insert a spec under B''s product',
  format($$insert into public.product_specs (product_id, label, value) values (%L, 'planted', 'x')$$, soko_test.id('pc_b_pub')));
select soko_test.expect_denied('PV: A cannot create a product owned by B',
  format($$insert into public.products (company_id, name) values (%L, 'Forged B Item')$$, soko_test.id('pc_b')));
select soko_test.expect_ok('PV: A can still edit its own spec content',
  format($$update public.product_specs set label = 'Diameter', value = 'DN65', position = 2 where id = %L$$, soko_test.id('pc_a_spec')));
select soko_test.expect_ok('PV: A can still rename its own region',
  format($$update public.product_regions set region = 'Fujairah' where product_id = %L and region = 'Ajman'$$, soko_test.id('pc_a_pub')));
reset role;
select soko_test.as_user('pc_b_admin');
set local role authenticated;
select soko_test.expect_denied('PV: B cannot edit A''s spec content',
  format($$update public.product_specs set value = 'tampered' where id = %L$$, soko_test.id('pc_a_spec')));
select soko_test.expect_denied('PV: B cannot delete A''s region',
  format($$delete from public.product_regions where product_id = %L$$, soko_test.id('pc_a_pub')));
reset role;
select soko_test.expect_count('PV: A''s spec and region stayed on A''s product with A''s edits',
  format($$select (select count(*) from public.product_specs
                   where id = %1$L and product_id = %2$L and value = 'DN65')
              + (select count(*) from public.product_regions where product_id = %2$L and region = 'Fujairah')$$,
         soko_test.id('pc_a_spec'), soko_test.id('pc_a_pub')), 2);
select soko_test.expect_count('PV: B''s spec and regions are untouched',
  format($$select (select count(*) from public.product_specs where id = %1$L and product_id = %2$L and value = 'PN16')
              + (select count(*) from public.product_regions where product_id = %2$L and region = 'Dubai')$$,
         soko_test.id('pc_b_spec'), soko_test.id('pc_b_pub')), 2);
select soko_test.expect_count('PV: product_id, company_id and company_kind are not client-updatable',
  $$select count(*) from information_schema.column_privileges
    where grantee = 'authenticated' and table_schema = 'public' and privilege_type = 'UPDATE'
      and ((table_name in ('product_specs', 'product_regions') and column_name = 'product_id')
        or (table_name = 'products' and column_name in ('company_id', 'company_kind')))$$, 0);

-- 5. Saved products follow parent visibility and remain removable ---------------
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_ok('PV: contractor saves B''s published product',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_b_pub')));
reset role;
select soko_test.as_user('pc_fresh_user');
set local role authenticated;
select soko_test.expect_ok('PV: another user saves the same product',
  format($$insert into public.saved_products (user_id, product_id) values (auth.uid(), %L)$$, soko_test.id('pc_b_pub')));
reset role;
update public.companies set is_public = false where id = soko_test.id('pc_b');
select soko_test.as_user('pc_con_admin');
set local role authenticated;
select soko_test.expect_count('PV: a save hides when the supplier goes private',
  format($$select count(*) from public.saved_products where product_id = %L$$, soko_test.id('pc_b_pub')), 0);
select soko_test.expect_denied('PV: a plain DELETE cannot reach the hidden save',
  format($$delete from public.saved_products where product_id = %L$$, soko_test.id('pc_b_pub')));
select soko_test.expect_ok('PV: unsave_product removes the hidden save',
  format($$select public.unsave_product(%L)$$, soko_test.id('pc_b_pub')));
reset role;
select soko_test.expect_count('PV: unsave removed only the caller''s save',
  format($$select count(*) from public.saved_products where product_id = %L and user_id in (%L, %L)$$,
         soko_test.id('pc_b_pub'), soko_test.id('pc_con_admin'), soko_test.id('pc_fresh_user')), 1);
update public.companies set is_public = true where id = soko_test.id('pc_b');
update public.products set status = 'archived' where id = soko_test.id('pc_b_pub');
select soko_test.as_user('pc_fresh_user');
set local role authenticated;
select soko_test.expect_count('PV: a save hides when the product is archived',
  $$select count(*) from public.saved_products$$, 0);
select soko_test.expect_ok('PV: the owner can remove a save of an archived product',
  format($$select public.unsave_product(%L)$$, soko_test.id('pc_b_pub')));
reset role;
select soko_test.expect_count('PV: no saves remain for the archived product',
  format($$select count(*) from public.saved_products where product_id = %L$$, soko_test.id('pc_b_pub')), 0);
update public.products set status = 'published' where id = soko_test.id('pc_b_pub');

-- 6. Image paths match the company-media storage rules (07) ---------------------
select soko_test.as_user('pc_a_admin');
set local role authenticated;
select soko_test.expect_sqlstate('PV: an uppercase company folder is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         upper(soko_test.id('pc_a')::text) || '/products/x.png', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PV: a nested products subfolder is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/sub/x.png', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PV: a non-image extension is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/spec-sheet.pdf', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PV: an SVG (not an allowed bucket type) is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/logo.svg', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PV: a file with no extension is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/photo', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_sqlstate('PV: a trailing-slash folder path is rejected',
  format($$update public.products set image_paths = array[%L] where id = %L$$,
         soko_test.id('pc_a')::text || '/products/', soko_test.id('pc_a_pub')), '23514');
select soko_test.expect_ok('PV: every allowed bucket image type is accepted',
  format($$update public.products set image_paths = array[%1$L || 'a.png', %1$L || 'b.JPG', %1$L || 'c.jpeg',
                                                          %1$L || 'd.webp', %1$L || 'e.avif', %1$L || 'pub.png']
           where id = %2$L$$, soko_test.id('pc_a')::text || '/products/', soko_test.id('pc_a_pub')));
select soko_test.expect_count('PV: the product manager may write every accepted path under 07''s rules',
  format($$select count(*) from public.products p, unnest(p.image_paths) path
           where p.id = %L and private.can_write_company_media(path)$$, soko_test.id('pc_a_pub')), 6);
reset role;
select soko_test.expect_count('PV: every stored image path resolves to its owning company''s products folder',
  $$select count(*) from public.products p, unnest(p.image_paths) path
    where private.storage_company(path) is distinct from p.company_id
       or (storage.foldername(path))[1] <> p.company_id::text
       or (storage.foldername(path))[2] <> 'products'
       or array_length(storage.foldername(path), 1) <> 2$$, 0);
select soko_test.as_user('pc_b_admin');
set local role authenticated;
select soko_test.expect_count('PV: another supplier may not write A''s accepted paths',
  format($$select count(*) from unnest(array[%1$L || 'a.png', %1$L || 'pub.png']) path
           where private.can_write_company_media(path)$$, soko_test.id('pc_a')::text || '/products/'), 0);
reset role;
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('PV: a published product''s referenced image is still publicly readable',
  format($$select count(*) from storage.objects where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('pc_a')::text || '/products/pub.png'), 1);
reset role;

-- =============================================================================
-- 16. Migration 07 — documents, sharing, Storage paths, retention and quota
-- =============================================================================
reset role;
create function soko_test.dp(p_key text) returns text language sql stable as
  $$ select value from soko_test.secrets where key = p_key $$;
-- Runs as the caller, so Storage RLS applies exactly as for a client upload.
create function soko_test.put(p_bucket text, p_name text, p_size bigint, p_mime text default 'application/pdf')
returns void language sql as $$
  insert into storage.objects (bucket_id, name, metadata)
  values (p_bucket, p_name, jsonb_build_object('size', p_size, 'mimetype', p_mime));
$$;
grant execute on function soko_test.dp(text), soko_test.put(text, text, bigint, text) to anon, authenticated, service_role;

insert into soko_test.ids select k, gen_random_uuid()
from unnest(array['d_admin','d_tech','d_rep','d_mgr','d_editor','r_admin','r_officer','x_admin','vkey']) k;
insert into auth.users (id, email, aud, role, email_confirmed_at)
select id, key || '@soko-security.test', 'authenticated', 'authenticated', now()
from soko_test.ids where key in ('d_admin','d_tech','d_rep','d_mgr','d_editor','r_admin','r_officer','x_admin');

-- No shipped role holds profile.edit without products.manage, so a test-only
-- role checks that profile.edit alone never reaches products/.
insert into public.roles (company_kind, key, label, is_admin)
values ('supplier', 'soko_test_profile_editor', 'Profile editor (test)', false);
insert into public.role_permissions (company_kind, role_key, permission)
values ('supplier', 'soko_test_profile_editor', 'profile.edit');
insert into public.role_document_access (company_kind, role_key, access_level)
values ('supplier', 'soko_test_profile_editor', 'team');

select soko_test.as_user('d_admin');
set local role authenticated;
insert into soko_test.ids values ('d_sup', public.create_company('supplier', 'Doc Owner Supplier LLC'));
update public.companies set is_public = true where id = soko_test.id('d_sup');
reset role;
select soko_test.as_user('r_admin');
set local role authenticated;
insert into soko_test.ids values ('d_rec', public.create_company('contractor', 'Doc Recipient Contractor LLC'));
reset role;
select soko_test.as_user('x_admin');
set local role authenticated;
insert into soko_test.ids values ('d_other', public.create_company('supplier', 'Doc Other Supplier LLC'));
reset role;

insert into public.company_memberships (company_id, company_kind, user_id, role_key) values
  (soko_test.id('d_sup'), 'supplier',   soko_test.id('d_tech'),    'technical_manager'),
  (soko_test.id('d_sup'), 'supplier',   soko_test.id('d_rep'),     'sales_rep'),
  (soko_test.id('d_sup'), 'supplier',   soko_test.id('d_mgr'),     'sales_manager'),
  (soko_test.id('d_sup'), 'supplier',   soko_test.id('d_editor'),  'soko_test_profile_editor'),
  (soko_test.id('d_rec'), 'contractor', soko_test.id('r_officer'), 'procurement_officer');

insert into soko_test.ids select k, gen_random_uuid()
from unnest(array['dd_team','dd_tech','dd_admins','dd_public','dd_verif','dd_empty','dd_other']) k;
insert into public.documents (id, company_id, name, access_level, is_public, for_verification) values
  (soko_test.id('dd_team'),   soko_test.id('d_sup'),   'Team Spec Sheet',   'team',      false, false),
  (soko_test.id('dd_tech'),   soko_test.id('d_sup'),   'Technical Drawing', 'technical', false, false),
  (soko_test.id('dd_admins'), soko_test.id('d_sup'),   'Admin Contract',    'admins',    false, false),
  (soko_test.id('dd_public'), soko_test.id('d_sup'),   'Public Brochure',   'team',      true,  false),
  (soko_test.id('dd_verif'),  soko_test.id('d_sup'),   'Trade Licence',     'admins',    false, true),
  (soko_test.id('dd_empty'),  soko_test.id('d_sup'),   'Never Uploaded',    'team',      false, false),
  (soko_test.id('dd_other'),  soko_test.id('d_other'), 'Other Spec',        'team',      false, false);
insert into soko_test.secrets
select 'p_' || k || '_v' || v, d.company_id::text || '/' || d.id::text || '/v' || v || '/file.pdf'
from unnest(array['dd_team','dd_tech','dd_admins','dd_public','dd_verif','dd_empty','dd_other']) k
cross join generate_series(1, 3) v
join public.documents d on d.id = soko_test.id(k);
insert into soko_test.secrets values
  ('p_verif',  soko_test.id('d_sup')::text || '/' || soko_test.id('vkey')::text || '/cert.pdf'),
  ('p_verif2', soko_test.id('d_sup')::text || '/' || soko_test.id('vkey')::text || '/cert2.pdf');

insert into storage.objects (bucket_id, name, metadata)
select 'company-documents', soko_test.dp('p_' || k || '_v1'), '{"size": 1000, "mimetype": "application/pdf"}'
from unnest(array['dd_team','dd_tech','dd_admins','dd_public','dd_verif','dd_other']) k;
select soko_test.as_user('d_admin');
set local role authenticated;
insert into soko_test.ids
select 'v_' || k, public.finalize_document_version(soko_test.id(k), soko_test.dp('p_' || k || '_v1'), 'file.pdf')
from unnest(array['dd_team','dd_tech','dd_admins','dd_public','dd_verif']) k;
reset role;
select soko_test.as_user('x_admin');
set local role authenticated;
insert into soko_test.ids values ('v_dd_other',
  public.finalize_document_version(soko_test.id('dd_other'), soko_test.dp('p_dd_other_v1'), 'file.pdf'));
reset role;

-- 16A. Grants -----------------------------------------------------------------
select soko_test.expect_count('07G: anon cannot execute object_size',
  $$select count(*) from pg_proc where oid = 'private.object_size(jsonb)'::regprocedure
      and has_function_privilege('anon', oid, 'execute')$$, 0);
select soko_test.expect_count('07G: only service_role runs the orphan report and reminders',
  $$select count(*) from pg_proc
    where oid in ('private.list_orphaned_storage_objects(interval)'::regprocedure,
                  'private.queue_document_expiry_reminders()'::regprocedure)
      and (has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute'))$$, 0);
select soko_test.expect_count('07G: users have no write grant on document_versions or document_shares',
  $$select count(*) from information_schema.role_table_grants
    where table_schema = 'public' and table_name in ('document_versions', 'document_shares', 'document_reminders_sent')
      and grantee in ('anon', 'authenticated') and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')$$, 0);

-- 16B. Roles and access levels --------------------------------------------------
select soko_test.as_user('d_rep');
set local role authenticated;
select soko_test.expect_count('07R: a sales rep sees only team-level documents',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 3);
select soko_test.expect_count('07R: a sales rep sees only team-level versions',
  format($$select count(*) from public.document_versions where company_id = %L$$, soko_test.id('d_sup')), 2);
select soko_test.expect_ok('07R: a sales rep downloads a team document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
select soko_test.expect_denied('07R: a sales rep cannot download a technical document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_tech')));
select soko_test.expect_count('07R: a sales rep reads the team file from Storage',
  format($$select count(*) from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_team_v1')), 1);
select soko_test.expect_count('07R: a sales rep cannot read the technical file from Storage',
  format($$select count(*) from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_tech_v1')), 0);
select soko_test.expect_denied('07R: a sales rep cannot share documents',
  format('select public.share_document(%L, %L)', soko_test.id('dd_team'), soko_test.id('d_rec')));
select soko_test.expect_denied('07R: a sales rep cannot upload a new version',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_team_v2')));
reset role;
select soko_test.as_user('d_tech');
set local role authenticated;
select soko_test.expect_count('07R: a technical manager sees team and technical documents',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 4);
select soko_test.expect_denied('07R: a technical manager cannot download an admin-only document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_admins')));
select soko_test.expect_denied('07R: a technical manager cannot upload to an admin-only document',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_admins_v2')));
reset role;

-- 16C. Anonymous access -------------------------------------------------------
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('07A: anonymous users see only the public document',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 1);
select soko_test.expect_count('07A: anonymous users see only the public document''s versions',
  format($$select count(*) from public.document_versions where company_id = %L$$, soko_test.id('d_sup')), 1);
select soko_test.expect_count('07A: anonymous users read no company-documents objects',
  $$select count(*) from storage.objects where bucket_id = 'company-documents'$$, 0);
select soko_test.expect_count('07A: anonymous users read no verification objects',
  $$select count(*) from storage.objects where bucket_id = 'verification'$$, 0);
select soko_test.expect_denied('07A: anonymous users cannot record downloads',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_public')));
select soko_test.expect_denied('07A: anonymous users cannot finalise versions',
  format('select public.finalize_document_version(%L, %L, %L)', soko_test.id('dd_public'), soko_test.dp('p_dd_public_v2'), 'x.pdf'));
select soko_test.expect_denied('07A: anonymous users cannot upload media',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/anon.png'));
select soko_test.expect_denied('07A: anonymous users cannot call object_size',
  $$select private.object_size('{"size": 1}')$$);
reset role;

-- 16D. Strict path validation -----------------------------------------------------
select soko_test.expect_count('07P: malformed document paths never parse',
  format($$with b(c, d) as (select %L::text, %L::text)
    select count(*) from b, unnest(array[
      c || '/' || d || '/v1/../x.pdf',      c || '/' || d || '/v1/sub/x.pdf',
      '../' || c || '/' || d || '/v1/x.pdf', '/' || c || '/' || d || '/v1/x.pdf',
      c || '/' || d || '/v1/x.pdf/',        c || '//' || d || '/v1/x.pdf',
      c || '/' || d || '/v0/x.pdf',         c || '/' || d || '/v01/x.pdf',
      c || '/' || d || '/1/x.pdf',          c || '/' || d || '/v1/',
      c || '/' || d || '/v1/.hidden',       c || '/' || d || '/v1/x y.pdf',
      c || '/' || d || '/v1/x%%2F.pdf',     c || '/' || d || '/v1/x.pdf' || chr(10),
      upper(c) || '/' || d || '/v1/x.pdf',  c || '/not-a-uuid/v1/x.pdf',
      c || '/' || d || '/v1/' || repeat('a', 201)]) p
    where (select x.company_id from private.parse_document_path(p) x) is not null$$,
    soko_test.id('d_sup'), soko_test.id('dd_team')), 0);
select soko_test.expect_count('07P: a well-formed document path parses to its parts',
  format($$select count(*) from private.parse_document_path(%L) x
           where x.company_id = %L and x.document_id = %L and x.version = 1 and x.file_name = 'file.pdf'$$,
         soko_test.dp('p_dd_team_v1'), soko_test.id('d_sup'), soko_test.id('dd_team')), 1);
select soko_test.expect_count('07P: malformed media paths never parse',
  format($$with b(c) as (select %L::text)
    select count(*) from b, unnest(array[
      c || '/products/../x.png', c || '/products/sub/x.png', c || '/logos/x.png',
      c || '/x.png', c || '/logo/', '../' || c || '/logo/x.png', c || '/logo/.x.png']) p
    where (select x.company_id from private.parse_media_path(p) x) is not null$$, soko_test.id('d_sup')), 0);
select soko_test.expect_count('07P: malformed verification paths never parse',
  format($$with b(c, k) as (select %L::text, %L::text)
    select count(*) from b, unnest(array[
      c || '/cert.pdf', c || '/not-a-uuid/cert.pdf', c || '/' || k || '/../cert.pdf',
      c || '/' || k || '/sub/cert.pdf', c || '/' || k || '/']) p
    where (select x.company_id from private.parse_verification_path(p) x) is not null$$,
    soko_test.id('d_sup'), soko_test.id('vkey')), 0);
select soko_test.expect_denied('07P: a version row cannot name a path outside its document',
  format($$insert into public.document_versions (document_id, company_id, version, storage_path, file_name, size_bytes)
           values (%L, %L, 2, %L, 'x.pdf', 1)$$,
         soko_test.id('dd_team'), soko_test.id('d_sup'), soko_test.dp('p_dd_tech_v2')));
select soko_test.expect_denied('07P: a version row cannot point at another company''s document',
  format($$insert into public.document_versions (document_id, company_id, version, storage_path, file_name, size_bytes)
           values (%L, %L, 2, %L, 'x.pdf', 1)$$,
         soko_test.id('dd_other'), soko_test.id('d_sup'), soko_test.id('d_sup')::text || '/' || soko_test.id('dd_other')::text || '/v2/x.pdf'));

select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_denied('07P: cannot upload into another company''s document folder',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_other_v2')));
select soko_test.expect_denied('07P: cannot pair own company prefix with another company''s document',
  format($$select soko_test.put('company-documents', %L, 10)$$,
         soko_test.id('d_sup')::text || '/' || soko_test.id('dd_other')::text || '/v2/file.pdf'));
select soko_test.expect_denied('07P: cannot upload a traversal path',
  format($$select soko_test.put('company-documents', %L, 10)$$,
         soko_test.id('d_sup')::text || '/' || soko_test.id('dd_team')::text || '/v2/../file.pdf'));
select soko_test.expect_denied('07P: cannot upload to a skipped version',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_team_v3')));
select soko_test.expect_denied('07P: cannot upload over a finalised version path',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_team_v1')));
select soko_test.expect_ok('07P: can upload the exact next version',
  format($$select soko_test.put('company-documents', %L, 500)$$, soko_test.dp('p_dd_team_v2')));

-- 16E. finalize_document_version ------------------------------------------------
select soko_test.expect_denied('07F: finalise rejects another document''s path',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_tech_v2')));
select soko_test.expect_denied('07F: finalise rejects another company''s path',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_other_v2')));
select soko_test.expect_denied('07F: finalise rejects a skipped version',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_team_v3')));
select soko_test.expect_denied('07F: finalise rejects replaying version 1',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_team_v1')));
select soko_test.expect_denied('07F: finalise rejects a version whose file was never uploaded',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_tech'), soko_test.dp('p_dd_tech_v2')));
select soko_test.expect_denied('07F: another company''s admin cannot finalise',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_other'), soko_test.dp('p_dd_other_v2')));
select soko_test.expect_ok('07F: finalise accepts the uploaded next version',
  format('select public.finalize_document_version(%L, %L, %L)', soko_test.id('dd_team'), soko_test.dp('p_dd_team_v2'), 'Spec v2.pdf'));
select soko_test.expect_count('07F: current_version advanced to 2',
  format('select current_version from public.documents where id = %L', soko_test.id('dd_team')), 2);
select soko_test.expect_count('07F: the version records Storage''s own size',
  format('select size_bytes from public.document_versions where document_id = %L and version = 2', soko_test.id('dd_team')), 500);
select soko_test.expect_denied('07F: the same version cannot be finalised twice',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_team_v2')));
select soko_test.expect_denied('07F: users cannot insert versions directly',
  format($$insert into public.document_versions (document_id, company_id, version, storage_path, file_name, size_bytes)
           values (%L, %L, 3, %L, 'x.pdf', 1)$$, soko_test.id('dd_team'), soko_test.id('d_sup'), soko_test.dp('p_dd_team_v3')));
select soko_test.expect_denied('07F: users cannot update versions',
  format($$update public.document_versions set file_name = 'forged.pdf' where document_id = %L$$, soko_test.id('dd_team')));
select soko_test.expect_denied('07F: users cannot overwrite a finalised file',
  format($$update storage.objects set metadata = '{"size": 1}' where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_team_v1')));
select soko_test.expect_denied('07F: users cannot move a finalised file',
  format($$update storage.objects set name = %L where bucket_id = 'company-documents' and name = %L$$,
         soko_test.dp('p_dd_team_v3'), soko_test.dp('p_dd_team_v1')));
reset role;
select soko_test.expect_denied('07F: version rows are immutable even for the owner',
  format($$update public.document_versions set version = 9 where document_id = %L$$, soko_test.id('dd_team')));

-- Objects with forged or missing metadata (written as owner, as a client could
-- not): finalisation must reject each one.
insert into storage.objects (bucket_id, name, metadata) values
  ('company-documents', soko_test.dp('p_dd_tech_v2'),   '{"mimetype": "application/pdf"}'),
  ('company-documents', soko_test.dp('p_dd_admins_v2'), '{"size": 10, "mimetype": "application/x-msdownload"}'),
  ('company-documents', soko_test.dp('p_dd_public_v2'), '{"size": 52428801, "mimetype": "application/pdf"}'),
  ('company-documents', soko_test.dp('p_dd_verif_v2'),  '{"size": "-5", "mimetype": "application/pdf"}'),
  ('verification',      soko_test.dp('p_dd_empty_v1'),  '{"size": 10, "mimetype": "application/pdf"}');
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_denied('07F: finalise rejects an object without a size',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_tech'), soko_test.dp('p_dd_tech_v2')));
select soko_test.expect_denied('07F: finalise rejects a disallowed MIME type',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_admins'), soko_test.dp('p_dd_admins_v2')));
select soko_test.expect_denied('07F: finalise rejects a file over the bucket limit',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_public'), soko_test.dp('p_dd_public_v2')));
select soko_test.expect_denied('07F: finalise rejects a negative size',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_verif'), soko_test.dp('p_dd_verif_v2')));
select soko_test.expect_denied('07F: finalise ignores a same-named object in another bucket',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_empty'), soko_test.dp('p_dd_empty_v1')));
select soko_test.expect_denied('07F: finalise rejects control characters in the file name',
  format('select public.finalize_document_version(%L, %L, %L)', soko_test.id('dd_tech'), soko_test.dp('p_dd_tech_v2'), 'a' || chr(7) || '.pdf'));
reset role;

-- 16F. Sharing, revocation and expiry --------------------------------------------
select soko_test.as_user('d_mgr');
set local role authenticated;
insert into soko_test.ids values ('sh_team', public.share_document(soko_test.id('dd_team'), soko_test.id('d_rec')));
select soko_test.expect_denied('07S: cannot share a document above your access level',
  format('select public.share_document(%L, %L)', soko_test.id('dd_admins'), soko_test.id('d_rec')));
select soko_test.expect_denied('07S: cannot share with your own company',
  format('select public.share_document(%L, %L)', soko_test.id('dd_team'), soko_test.id('d_sup')));
select soko_test.expect_denied('07S: cannot share with a past expiry',
  format('select public.share_document(%L, %L, now() - interval ''1 minute'')', soko_test.id('dd_tech'), soko_test.id('d_rec')));
select soko_test.expect_denied('07S: cannot share a document without a version',
  format('select public.share_document(%L, %L)', soko_test.id('dd_empty'), soko_test.id('d_rec')));
reset role;

select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_count('07S: the recipient sees only the shared and public documents',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 2);
select soko_test.expect_count('07S: the recipient download returns the finalised path',
  format($$select count(*) where public.record_document_download(%L) = %L$$, soko_test.id('v_dd_team'), soko_test.dp('p_dd_team_v1')), 1);
select soko_test.expect_count('07S: the recipient cannot read the file directly from Storage',
  format($$select count(*) from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_team_v1')), 0);
select soko_test.expect_denied('07S: the recipient cannot download an unshared document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_tech')));
select soko_test.expect_denied('07S: the recipient cannot revoke the share',
  format('select public.revoke_document_share(%L)', soko_test.id('sh_team')));
select soko_test.expect_denied('07S: the recipient cannot reshare the document',
  format('select public.share_document(%L, %L)', soko_test.id('dd_team'), soko_test.id('d_other')));
reset role;

select soko_test.as_user('x_admin');
set local role authenticated;
select soko_test.expect_denied('07S: an outside company cannot download a shared document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
select soko_test.expect_count('07S: an outside company sees no shares',
  $$select count(*) from public.document_shares$$, 0);
select soko_test.expect_denied('07S: an outside company cannot revoke a share',
  format('select public.revoke_document_share(%L)', soko_test.id('sh_team')));
reset role;

select soko_test.expect_count('07S: a recipient download is audited without the storage path',
  format($$select (count(*) > 0 and count(*) filter (where diff ? 'storage_path') = 0
                   and bool_and(diff ->> 'by_member' = 'false'))::int
           from public.audit_log where action = 'download' and entity_id = %L and actor_id = %L$$,
         soko_test.id('v_dd_team'), soko_test.id('r_officer')), 1);
select soko_test.expect_count('07S: document audits never contain names, paths or file names',
  format($$select count(*) from public.audit_log where company_id = %L
             and (diff::text like '%%file.pdf%%' or diff::text like '%%Team Spec Sheet%%'
                  or diff::text like '%%Spec v2.pdf%%' or diff::text like '%%Trade Licence%%')$$, soko_test.id('d_sup')), 0);

-- Expiry
update public.document_shares set expires_at = now() - interval '1 second' where id = soko_test.id('sh_team');
select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_denied('07S: an expired share no longer allows downloads',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
select soko_test.expect_count('07S: an expired share is hidden from the recipient',
  $$select count(*) from public.document_shares$$, 0);
select soko_test.expect_count('07S: an expired share hides the document metadata',
  format('select count(*) from public.documents where id = %L', soko_test.id('dd_team')), 0);
reset role;
update public.document_shares set expires_at = null where id = soko_test.id('sh_team');

-- Revocation
select soko_test.as_user('d_mgr');
set local role authenticated;
select soko_test.expect_ok('07S: the owner revokes the share',
  format('select public.revoke_document_share(%L)', soko_test.id('sh_team')));
reset role;
select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_denied('07S: a revoked share no longer allows downloads',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
select soko_test.expect_count('07S: a revoked share hides the document metadata and versions',
  format($$select (select count(*) from public.documents where id = %1$L)
                + (select count(*) from public.document_versions where document_id = %1$L)$$, soko_test.id('dd_team')), 0);
reset role;
select soko_test.as_user('d_mgr');
set local role authenticated;
insert into soko_test.ids values ('sh_team2', public.share_document(soko_test.id('dd_team'), soko_test.id('d_rec')));
select soko_test.expect_count('07S: the owner keeps the revoked share in its history',
  format('select count(*) from public.document_shares where document_id = %L', soko_test.id('dd_team')), 2);
reset role;

-- Recipient-company suspension
update public.companies set is_suspended = true where id = soko_test.id('d_rec');
select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_denied('07S: a suspended recipient company cannot download',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
reset role;
update public.companies set is_suspended = false where id = soko_test.id('d_rec');
select soko_test.as_user('d_mgr');
set local role authenticated;
select soko_test.expect_ok('07S: the re-issued share works again',
  format('select public.share_document(%L, %L, now() + interval ''1 day'')', soko_test.id('dd_team'), soko_test.id('d_rec')));
reset role;

-- 16G. Archival -------------------------------------------------------------------
select soko_test.as_user('d_admin');
set local role authenticated;
update public.documents set archived = true where id in (soko_test.id('dd_team'), soko_test.id('dd_public'));
select soko_test.expect_denied('07X: an archived document cannot get a new upload',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_team_v3')));
select soko_test.expect_denied('07X: an archived document cannot be shared',
  format('select public.share_document(%L, %L)', soko_test.id('dd_team'), soko_test.id('d_other')));
select soko_test.expect_count('07X: owner members still see archived documents',
  format('select count(*) from public.documents where id = %L', soko_test.id('dd_team')), 1);
reset role;
insert into storage.objects (bucket_id, name, metadata)
values ('company-documents', soko_test.dp('p_dd_team_v3'), '{"size": 10, "mimetype": "application/pdf"}');
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_denied('07X: an archived document cannot be finalised',
  format('select public.finalize_document_version(%L, %L, null)', soko_test.id('dd_team'), soko_test.dp('p_dd_team_v3')));
reset role;
select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_denied('07X: a recipient cannot download an archived document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
reset role;
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('07X: an archived public document is hidden from anonymous users',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 0);
reset role;
delete from storage.objects where bucket_id = 'company-documents' and name = soko_test.dp('p_dd_team_v3');
select soko_test.as_user('d_admin');
set local role authenticated;
update public.documents set archived = false where id in (soko_test.id('dd_team'), soko_test.id('dd_public'));
reset role;

-- 16H. Verification files --------------------------------------------------------
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_ok('07V: a company admin uploads verification evidence',
  format($$select soko_test.put('verification', %L, 100)$$, soko_test.dp('p_verif')));
select soko_test.expect_denied('07V: a malformed verification path is rejected',
  format($$select soko_test.put('verification', %L, 100)$$, soko_test.id('d_sup')::text || '/cert.pdf'));
select soko_test.expect_denied('07V: another company''s verification folder is rejected',
  format($$select soko_test.put('verification', %L, 100)$$, soko_test.id('d_other')::text || '/' || soko_test.id('vkey')::text || '/cert.pdf'));
select soko_test.expect_denied('07V: verification evidence cannot be overwritten',
  format($$update storage.objects set metadata = '{"size": 1}' where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')));
select soko_test.expect_denied('07V: verification evidence cannot be deleted by users',
  format($$delete from storage.objects where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')));
reset role;
select soko_test.as_user('d_tech');
set local role authenticated;
select soko_test.expect_denied('07V: a non-admin cannot upload verification evidence',
  format($$select soko_test.put('verification', %L, 100)$$, soko_test.dp('p_verif2')));
select soko_test.expect_count('07V: a non-admin cannot read verification evidence',
  format($$select count(*) from storage.objects where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')), 0);
reset role;
select soko_test.as_user('padmin');
set local role authenticated;
select soko_test.expect_count('07V: platform admins read verification evidence',
  format($$select count(*) from storage.objects where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')), 1);
reset role;
select soko_test.as_user('x_admin');
set local role authenticated;
select soko_test.expect_count('07V: another company cannot read verification evidence',
  format($$select count(*) from storage.objects where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')), 0);
reset role;

-- 16I. Owner-company suspension ----------------------------------------------------
update public.companies set is_suspended = true where id = soko_test.id('d_sup');
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_count('07U: a suspended company''s admin sees only its verification document',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 1);
select soko_test.expect_count('07U: a suspended company''s files are unreadable in Storage',
  format($$select count(*) from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_team_v1')), 0);
select soko_test.expect_count('07U: suspended admins still read their verification document file',
  format($$select count(*) from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_verif_v1')), 1);
select soko_test.expect_count('07U: suspended admins still read their verification evidence',
  format($$select count(*) from storage.objects where bucket_id = 'verification' and name = %L$$, soko_test.dp('p_verif')), 1);
select soko_test.expect_ok('07U: suspended admins may download their verification document',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_verif')));
select soko_test.expect_denied('07U: suspended members cannot download ordinary documents',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
select soko_test.expect_denied('07U: suspended companies cannot upload document versions',
  format($$select soko_test.put('company-documents', %L, 10)$$, soko_test.dp('p_dd_team_v3')));
select soko_test.expect_denied('07U: suspended companies cannot share',
  format('select public.share_document(%L, %L)', soko_test.id('dd_tech'), soko_test.id('d_rec')));
select soko_test.expect_denied('07U: suspended companies cannot upload media',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/s.png'));
select soko_test.expect_denied('07U: suspended companies cannot upload verification evidence',
  format($$select soko_test.put('verification', %L, 100)$$, soko_test.dp('p_verif2')));
reset role;
select soko_test.as_user('r_officer');
set local role authenticated;
select soko_test.expect_denied('07U: recipients cannot download from a suspended owner',
  format('select public.record_document_download(%L)', soko_test.id('v_dd_team')));
reset role;
select soko_test.as_anon();
set local role anon;
select soko_test.expect_count('07U: a suspended company''s public documents are hidden',
  format($$select count(*) from public.documents where company_id = %L$$, soko_test.id('d_sup')), 0);
reset role;
update public.companies set is_suspended = false where id = soko_test.id('d_sup');

-- 16J. Company media permissions -------------------------------------------------
select soko_test.as_user('d_tech');
set local role authenticated;
select soko_test.expect_ok('07M: products.manage may upload product images',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/products/t.png'));
select soko_test.expect_denied('07M: products.manage alone cannot upload a logo',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/t.png'));
select soko_test.expect_denied('07M: products.manage alone cannot upload gallery images',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/t.png'));
select soko_test.expect_denied('07M: a product image cannot be moved into the logo folder',
  format($$update storage.objects set name = %L where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('d_sup')::text || '/logo/t.png', soko_test.id('d_sup')::text || '/products/t.png'));
reset role;
select soko_test.as_user('d_editor');
set local role authenticated;
select soko_test.expect_ok('07M: profile.edit may upload a logo',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/e.png'));
select soko_test.expect_ok('07M: profile.edit may upload a cover',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/cover/e.png'));
select soko_test.expect_ok('07M: profile.edit may upload gallery images',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/e.png'));
select soko_test.expect_denied('07M: profile.edit alone cannot upload product images',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/products/e.png'));
select soko_test.expect_denied('07M: profile.edit alone cannot overwrite product images',
  format($$update storage.objects set metadata = '{"size": 1}' where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('d_sup')::text || '/products/t.png'));
select soko_test.expect_denied('07M: profile.edit alone cannot delete product images',
  format($$delete from storage.objects where bucket_id = 'company-media' and name = %L$$,
         soko_test.id('d_sup')::text || '/products/t.png'));
reset role;
select soko_test.as_user('d_mgr');
set local role authenticated;
select soko_test.expect_ok('07M: a role with both permissions may upload product images',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/products/m.png'));
select soko_test.expect_ok('07M: a role with both permissions may upload a logo',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/m.png'));
reset role;
select soko_test.as_user('d_rep');
set local role authenticated;
select soko_test.expect_denied('07M: a role with neither permission cannot upload media',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/r.png'));
reset role;
select soko_test.as_user('x_admin');
set local role authenticated;
select soko_test.expect_denied('07M: another company cannot upload into this company''s media',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_sup')::text || '/logo/x.png'));
select soko_test.expect_denied('07M: another company cannot delete this company''s media',
  format($$delete from storage.objects where bucket_id = 'company-media' and name = %L$$, soko_test.id('d_sup')::text || '/logo/m.png'));
reset role;

-- 16K. Retention -------------------------------------------------------------------
select soko_test.as_user('d_tech');
set local role authenticated;
select soko_test.expect_denied('07D: a pending upload above your access level cannot be deleted',
  format($$delete from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_admins_v2')));
reset role;
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_denied('07D: a document with finalised versions cannot be deleted',
  format('delete from public.documents where id = %L', soko_test.id('dd_team')));
select soko_test.expect_denied('07D: a finalised file cannot be deleted from Storage',
  format($$delete from storage.objects where bucket_id = 'company-documents' and name = %L$$, soko_test.dp('p_dd_team_v1')));
select soko_test.expect_count('07D: never-finalised uploads can be cleaned up by managers',
  format($$with d as (delete from storage.objects where bucket_id = 'company-documents' and name in (%L, %L, %L, %L) returning 1)
           select count(*) from d$$,
         soko_test.dp('p_dd_tech_v2'), soko_test.dp('p_dd_admins_v2'), soko_test.dp('p_dd_public_v2'), soko_test.dp('p_dd_verif_v2')), 4);
select soko_test.expect_count('07D: a document that never had a version can be deleted',
  format($$with d as (delete from public.documents where id = %L returning 1) select count(*) from d$$, soko_test.id('dd_empty')), 1);
select soko_test.expect_denied('07D: users cannot run the orphan report',
  $$select * from private.list_orphaned_storage_objects()$$);
reset role;
delete from storage.objects where bucket_id = 'verification' and name = soko_test.dp('p_dd_empty_v1');
select soko_test.expect_denied('07D: finalised versions cannot be deleted on their own, even by the owner',
  format('delete from public.document_versions where id = %L', soko_test.id('v_dd_team')));
select soko_test.expect_ok('07D: deleting a company cascades through its documents',
  format('delete from public.companies where id = %L', soko_test.id('d_other')));
select soko_test.expect_count('07D: the deleted company leaves no document rows',
  format($$select (select count(*) from public.documents where company_id = %1$L)
                + (select count(*) from public.document_versions where company_id = %1$L)
                + (select count(*) from public.document_shares where owner_company_id = %1$L)$$, soko_test.id('d_other')), 0);
select soko_test.expect_count('07D: the deleted company''s document audit trail is retained',
  format($$select (count(*) > 0)::int from public.audit_log where company_id = %L and entity like '%%document%%'$$, soko_test.id('d_other')), 1);
select soko_test.expect_count('07D: the deleted company''s files are reported as orphans',
  format($$select count(*) from private.list_orphaned_storage_objects()
           where bucket_id = 'company-documents' and name = %L and reason = 'company deleted or malformed path'$$,
         soko_test.dp('p_dd_other_v1')), 1);
select soko_test.expect_count('07D: live finalised files are never reported as orphans',
  format($$select count(*) from private.list_orphaned_storage_objects() where name = %L$$, soko_test.dp('p_dd_team_v1')), 0);

-- 16L. Storage quota --------------------------------------------------------------
select soko_test.expect_count('07Q: object_size reads integer sizes only',
  $$select count(*) from (values
      ('{"size": 12}'::jsonb, 12::bigint), ('{"size": "12"}', 12), ('{"size": -5}', null),
      ('{"size": "1e9"}', null), ('{"size": 1.5}', null), ('{}', null),
      ('{"size": "9999999999999999"}', null), ('{"size": null}', null)) t(m, expected)
    where private.object_size(m) is not distinct from expected$$, 8);
insert into soko_test.secrets
select 'quota_left', (private.entitlement_int(soko_test.id('d_sup'), 'storageMb')::bigint * 1024 * 1024
  - (select coalesce(sum(coalesce(private.object_size(o.metadata), 0)), 0) from storage.objects o
     where o.bucket_id in ('company-documents', 'company-media', 'verification')
       and o.name like soko_test.id('d_sup')::text || '/%'))::text;
select soko_test.expect_count('07Q: the test company starts with quota to spare',
  $$select (soko_test.dp('quota_left')::bigint > 1000)::int$$, 1);
insert into storage.objects (bucket_id, name, metadata)
values ('company-media', soko_test.id('d_sup')::text || '/gallery/filler.png',
        jsonb_build_object('size', soko_test.dp('quota_left')::bigint - 100, 'mimetype', 'image/png'));
select soko_test.as_user('d_mgr');
set local role authenticated;
select soko_test.expect_denied('07Q: an upload that would exceed the quota is rejected',
  format($$select soko_test.put('company-media', %L, 101, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/big.png'));
select soko_test.expect_ok('07Q: an upload that exactly fills the quota is accepted',
  format($$select soko_test.put('company-media', %L, 100, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/fit.png'));
select soko_test.expect_denied('07Q: a full company cannot add an object without a size',
  format($$select soko_test.put('company-media', %L, null, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/nosize.png'));
select soko_test.expect_denied('07Q: a negative size does not bypass the quota',
  format($$select soko_test.put('company-media', %L, -1000, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/neg.png'));
select soko_test.expect_denied('07Q: an overwrite cannot grow past the quota',
  format($$update storage.objects set metadata = '{"size": 5000, "mimetype": "image/png"}'
           where bucket_id = 'company-media' and name = %L$$, soko_test.id('d_sup')::text || '/gallery/fit.png'));
reset role;
select soko_test.as_user('d_admin');
set local role authenticated;
select soko_test.expect_denied('07Q: the quota covers document versions',
  format($$select soko_test.put('company-documents', %L, 1)$$, soko_test.dp('p_dd_tech_v2')));
select soko_test.expect_denied('07Q: the quota covers verification evidence',
  format($$select soko_test.put('verification', %L, 1)$$, soko_test.dp('p_verif2')));
reset role;
select soko_test.as_user('r_admin');
set local role authenticated;
select soko_test.expect_ok('07Q: another company''s quota is unaffected',
  format($$select soko_test.put('company-media', %L, 10, 'image/png')$$, soko_test.id('d_rec')::text || '/logo/r.png'));
reset role;
select soko_test.as_user('d_mgr');
set local role authenticated;
select soko_test.expect_count('07Q: deleting media frees quota',
  format($$with d as (delete from storage.objects where bucket_id = 'company-media' and name = %L returning 1) select count(*) from d$$,
         soko_test.id('d_sup')::text || '/gallery/fit.png'), 1);
select soko_test.expect_ok('07Q: freed quota can be used again',
  format($$select soko_test.put('company-media', %L, 50, 'image/png')$$, soko_test.id('d_sup')::text || '/gallery/again.png'));
reset role;
delete from storage.objects where bucket_id = 'company-media' and name = soko_test.id('d_sup')::text || '/gallery/filler.png';

-- -----------------------------------------------------------------------------
-- Report
-- -----------------------------------------------------------------------------
reset role;
select n, case when passed then 'PASS' else 'FAIL' end as result, label, detail
from soko_test.results order by n;

do $$
declare v_failed int; v_total int;
begin
  select count(*) filter (where not passed), count(*) into v_failed, v_total from soko_test.results;
  if v_failed > 0 then
    raise exception 'SOKO security tests: % of % FAILED', v_failed, v_total;
  end if;
  raise notice 'SOKO security tests: all % passed', v_total;
end $$;

rollback;
