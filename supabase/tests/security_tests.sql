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
grant usage on schema soko_test to anon, authenticated;
grant all on all tables in schema soko_test to anon, authenticated;
grant all on all sequences in schema soko_test to anon, authenticated;

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

grant execute on all functions in schema soko_test to anon, authenticated;

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
select soko_test.expect_count('10E: authenticated can execute exactly the 41 approved public RPCs',
  $$select count(*) from soko_fn where schema = 'public' and has_function_privilege('authenticated', oid, 'execute')$$, 41);
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
