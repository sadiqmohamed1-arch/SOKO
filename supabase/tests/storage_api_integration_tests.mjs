// SOKO Migration 07 — integration tests against a real Supabase Storage server.
//
// PostgreSQL-only tests insert into storage.objects directly, so they cannot
// prove what Storage itself puts in `metadata` when RLS runs, or how it sets
// `version`. This drives the real Storage HTTP API with user JWTs.
//
// Run only against a disposable LOCAL stack (Postgres + Storage built from
// source, file backend) with all 12 SOKO migrations applied:
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54339/postgres \
//   SOKO_STORAGE_URL=http://127.0.0.1:5055 SOKO_JWT_SECRET=<local secret> \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js \
//   node supabase/tests/storage_api_integration_tests.mjs
import { createHmac, randomUUID } from 'node:crypto';

const url = process.env.SOKO_TEST_DATABASE_URL;
const storage = process.env.SOKO_STORAGE_URL;
const secret = process.env.SOKO_JWT_SECRET;
for (const u of [url, storage]) {
  if (!u || !['127.0.0.1', 'localhost'].includes(new URL(u).hostname)) {
    throw new Error('SOKO_TEST_DATABASE_URL and SOKO_STORAGE_URL must be local');
  }
}
if (!secret) throw new Error('SOKO_JWT_SECRET is required');
const pg = (await import(process.env.PG_MODULE ?? 'pg')).default;
const owner = new pg.Client({ connectionString: url });
await owner.connect();

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(ok ? 'PASS' : 'FAIL', label, detail);
};

const b64 = x => Buffer.from(JSON.stringify(x)).toString('base64url');
const jwt = claims => {
  const body = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ aud: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, ...claims })}`;
  return `${body}.${createHmac('sha256', secret).update(body).digest('base64url')}`;
};
const userJwt = uid => jwt({ sub: uid, role: 'authenticated' });

async function upload(token, bucket, name, bytes, mime, { upsert = false } = {}) {
  const res = await fetch(`${storage}/object/${bucket}/${name}`, {
    method: upsert ? 'PUT' : 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': mime, 'x-upsert': String(upsert) },
    body: Buffer.alloc(bytes, 7),
  });
  return { status: res.status, body: await res.text() };
}

// As the user, through the same RLS context Storage uses.
async function asUser(uid, sql, params = []) {
  await owner.query('begin');
  try {
    await owner.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: uid, role: 'authenticated' })]);
    await owner.query('set local role authenticated');
    const r = await owner.query(sql, params);
    await owner.query('commit');
    return { rows: r.rows };
  } catch (e) {
    await owner.query('rollback');
    return { error: e };
  }
}

const object = async (bucket, name) => (await owner.query(
  `select metadata, version, owner_id, updated_at from storage.objects where bucket_id = $1 and name = $2`, [bucket, name])).rows[0];

const serviceJwt = () => jwt({ role: 'service_role' });
const tusMeta = obj => Object.entries(obj).map(([k, v]) => `${k} ${Buffer.from(v).toString('base64')}`).join(',');
async function tusCreate(token, bucket, name, length, mime) {
  const res = await fetch(`${storage}/upload/resumable`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'tus-resumable': '1.0.0', 'upload-length': String(length),
               'upload-metadata': tusMeta({ bucketName: bucket, objectName: name, contentType: mime }), 'x-upsert': 'false' },
  });
  await res.text();
  return { status: res.status, location: res.headers.get('location') };
}
async function tusPatch(token, location, offset, bytes) {
  const res = await fetch(location, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${token}`, 'tus-resumable': '1.0.0', 'upload-offset': String(offset),
               'content-type': 'application/offset+octet-stream' },
    body: Buffer.alloc(bytes, 9),
  });
  await res.text();
  return { status: res.status, offset: Number(res.headers.get('upload-offset')) };
}
async function tusHead(token, location) {
  const res = await fetch(location, { method: 'HEAD', headers: { authorization: `Bearer ${token}`, 'tus-resumable': '1.0.0' } });
  return Number(res.headers.get('upload-offset'));
}
// The document-download Edge Function flow: authorise + audit with the user's
// JWT, then sign a short-lived URL with the service role and fetch it.
async function download(uid, versionId) {
  const auth = await asUser(uid, `select public.record_document_download($1) as path`, [versionId]);
  if (auth.error) return { error: auth.error };
  const path = auth.rows[0].path;
  const signed = await fetch(`${storage}/object/sign/company-documents/${path}`, {
    method: 'POST', headers: { authorization: `Bearer ${serviceJwt()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  }).then(r => r.json());
  const res = await fetch(`${storage}${signed.signedURL}`);
  return { status: res.status, bytes: (await res.arrayBuffer()).byteLength };
}

// Direct Storage API reads as the user: authenticated GET, and a signed URL
// minted with the user's own JWT. Both go through storage.objects RLS.
async function directRead(token, name) {
  const res = await fetch(`${storage}/object/authenticated/company-documents/${name}`,
    { headers: { authorization: `Bearer ${token}` } });
  return { status: res.status, bytes: (await res.arrayBuffer()).byteLength };
}
async function userSign(token, name) {
  const res = await fetch(`${storage}/object/sign/company-documents/${name}`, {
    method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ expiresIn: 60 }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, signed: typeof body.signedURL === 'string' };
}
async function serviceDelete(name) {
  const res = await fetch(`${storage}/object/company-documents/${name}`,
    { method: 'DELETE', headers: { authorization: `Bearer ${jwt({ role: 'service_role' })}` } });
  await res.text();
  return res.status;
}

const created = { companies: [], users: [] };
async function user() {
  const id = (await owner.query(
    `insert into auth.users (id, email, aud, role, email_confirmed_at)
     values (gen_random_uuid(), 'sapi-' || gen_random_uuid() || '@soko-security.test', 'authenticated', 'authenticated', now())
     returning id`)).rows[0].id;
  created.users.push(id);
  return id;
}

try {
  const admin = await user();
  const other = await user();
  const co = (await owner.query(
    `insert into public.companies (kind, legal_name) values ('supplier', 'Storage API Co ' || gen_random_uuid()) returning id`)).rows[0].id;
  created.companies.push(co);
  for (const [uid, role] of [[admin, 'supplier_admin'], [other, 'supplier_admin']]) {
    await owner.query(`insert into public.company_memberships (company_id, company_kind, user_id, role_key)
                       values ($1, 'supplier', $2, $3)`, [co, uid, role]);
  }
  const path = file => `${co}/logo/${file}`;
  const reserve = (uid, name, size, mime) => asUser(uid,
    `select public.reserve_storage_upload('company-media', $1, $2, $3)`, [name, size, mime]);

  // A. No reservation: Storage's RLS check must refuse the upload.
  let r = await upload(userJwt(admin), 'company-media', path('none.png'), 80, 'image/png');
  check(r.status >= 400 && !(await object('company-media', path('none.png'))),
    'A: an upload without a reservation is refused by Storage', `HTTP ${r.status}`);

  // B. Matching reservation: contentLength and mimetype reach RLS as declared.
  const okName = path('ok.png');
  check(!(await reserve(admin, okName, 80, 'image/png')).error, 'B: reservation for 80 bytes image/png');
  r = await upload(userJwt(admin), 'company-media', okName, 80, 'image/png');
  check(r.status === 200, 'B: an upload matching its reservation is accepted', `HTTP ${r.status} ${r.status === 200 ? '' : r.body}`);
  const ok = await object('company-media', okName);
  check(ok?.metadata?.size === 80, 'B: Storage records metadata.size = real stored bytes', JSON.stringify(ok?.metadata));
  check(ok?.metadata?.mimetype === 'image/png', 'B: Storage records metadata.mimetype');
  check(typeof ok?.version === 'string' && ok.version.length > 0, 'B: Storage sets storage.objects.version', ok?.version);

  // C. Body larger than reserved: proves RLS sees the real request length.
  const bigName = path('big.png');
  await reserve(admin, bigName, 50, 'image/png');
  r = await upload(userJwt(admin), 'company-media', bigName, 80, 'image/png');
  check(r.status >= 400 && !(await object('company-media', bigName)),
    'C: an upload larger than its reservation is refused', `HTTP ${r.status}`);

  // D. Other content type: proves RLS sees the request's mimetype.
  const mimeName = path('mime.png');
  await reserve(admin, mimeName, 80, 'image/png');
  r = await upload(userJwt(admin), 'company-media', mimeName, 80, 'image/jpeg');
  check(r.status >= 400 && !(await object('company-media', mimeName)),
    'D: an upload with a different content type is refused', `HTTP ${r.status}`);

  // E. Another member cannot use (or take over) someone else's reservation.
  const heldName = path('held.png');
  await reserve(admin, heldName, 80, 'image/png');
  r = await upload(userJwt(other), 'company-media', heldName, 80, 'image/png');
  check(r.status >= 400 && !(await object('company-media', heldName)),
    "E: another user's upload under someone else's reservation is refused", `HTTP ${r.status}`);
  const takeover = await reserve(other, heldName, 80, 'image/png');
  check(takeover.error?.code === '55006', 'E: another user cannot re-reserve the held path', takeover.error?.code);

  // F. Completion uses Storage's own metadata.size.
  const done = await asUser(admin, `select public.complete_storage_upload('company-media', $1) as n`, [okName]);
  check(Number(done.rows?.[0]?.n) === 80, 'F: complete_storage_upload returns the size Storage recorded', JSON.stringify(done.rows ?? done.error?.message));

  // G. No renewal: the owner cannot re-reserve a settled path in its grace period,
  //    and a direct upsert with no open window is refused.
  const again = await reserve(admin, okName, 60, 'image/png');
  check(again.error?.code === '55006', 'G: a settled path in its grace period cannot be re-reserved', again.error?.code);
  r = await upload(userJwt(admin), 'company-media', okName, 60, 'image/png', { upsert: true });
  check(r.status >= 400 && (await object('company-media', okName))?.version === ok.version,
    'G: an upsert without an open reservation is refused and the object is unchanged', `HTTP ${r.status}`);

  // H. After reconciliation releases the path, an upsert gets a new version.
  await owner.query(`delete from private.storage_upload_reservations where bucket_id = 'company-media' and object_name = $1`, [okName]);
  check(!(await reserve(admin, okName, 60, 'image/png')).error, 'H: the released path can be reserved for a replacement');
  r = await upload(userJwt(admin), 'company-media', okName, 60, 'image/png', { upsert: true });
  check(r.status === 200, 'H: a reserved upsert (Storage UPDATE) is accepted', `HTTP ${r.status} ${r.status === 200 ? '' : r.body}`);
  const replaced = await object('company-media', okName);
  check(replaced?.metadata?.size === 60, 'H: the upsert updates metadata.size', JSON.stringify(replaced?.metadata));
  check(replaced?.version && replaced.version !== ok.version, 'H: an overwrite changes storage.objects.version', `${ok.version} -> ${replaced?.version}`);

  // I. Cleanup report never lists a file whose reservation is open or in grace.
  const listed = (await owner.query(`select name from private.list_orphaned_storage_objects(interval '0')`)).rows.map(x => x.name);
  check(!listed.some(n => n.startsWith(`${co}/`)), 'I: no in-grace upload is reported for cleanup', listed.filter(n => n.startsWith(`${co}/`)).join(','));

  // J. Documents bucket: an existing object cannot be reserved or overwritten.
  const unknown = await asUser(admin, `select public.reserve_storage_upload('company-documents', $1, 10, 'application/pdf')`,
    [`${co}/${randomUUID()}/v1/a.pdf`]);
  check(!!unknown.error, 'J: a document path for a document that does not exist cannot be reserved', unknown.error?.code);

  // K. Full document lifecycle with a standard upload:
  //    reserve -> Storage upload -> finalise -> download -> reconcile.
  const newDoc = async label => (await owner.query(
    `insert into public.documents (company_id, name, access_level, is_public, for_verification)
     values ($1, $2, 'team', false, false) returning id`, [co, label])).rows[0].id;
  const finalize = (uid, doc, name) => asUser(uid,
    `select public.finalize_document_version($1, $2, null) as id`, [doc, name]);
  const reserveDoc = (uid, name, size) => asUser(uid,
    `select public.reserve_storage_upload('company-documents', $1, $2, 'application/pdf')`, [name, size]);
  const reservation = async name => (await owner.query(
    `select settled_at, rejected_at, object_version from private.storage_upload_reservations
     where bucket_id = 'company-documents' and object_name = $1`, [name])).rows[0];
  const listedFor = async name => ({
    orphan: (await owner.query(`select reason from private.list_orphaned_storage_objects(interval '0') where name = $1`, [name])).rows,
    incident: (await owner.query(`select incident from private.list_storage_integrity_incidents() where name = $1`, [name])).rows,
  });

  const docA = await newDoc('Standard lifecycle');
  const stdName = `${co}/${docA}/v1/standard.pdf`;
  check(!(await reserveDoc(admin, stdName, 120)).error, 'K: reserve 120 bytes application/pdf');
  r = await upload(userJwt(admin), 'company-documents', stdName, 120, 'application/pdf');
  check(r.status === 200, 'K: standard upload under the reservation is accepted', `HTTP ${r.status} ${r.status === 200 ? '' : r.body}`);
  const std = await object('company-documents', stdName);
  check(std?.metadata?.size === 120 && std?.metadata?.contentLength === 120,
    'K: Storage records metadata.size and metadata.contentLength = real bytes', JSON.stringify(std?.metadata));
  check(std?.metadata?.mimetype === 'application/pdf', 'K: Storage records metadata.mimetype from the request');
  check(typeof std?.version === 'string' && std.version.length > 0, 'K: Storage sets storage.objects.version', std?.version);
  check(std?.owner_id === admin, 'K: Storage sets owner_id to the uploader JWT sub', std?.owner_id);

  const stolen = await finalize(other, docA, stdName);
  check(stolen.error?.code === '22023', "K: another member cannot finalise someone else's upload", stolen.error?.code);
  const fin = await finalize(admin, docA, stdName);
  check(!fin.error && fin.rows?.[0]?.id, 'K: the uploader finalises the document version', fin.error?.message ?? '');
  const verA = fin.rows?.[0]?.id;
  const pinned = (await owner.query(`select object_version, size_bytes, mime_type from public.document_versions where id = $1`, [verA])).rows[0];
  check(pinned?.object_version === std.version && Number(pinned?.size_bytes) === 120 && pinned?.mime_type === 'application/pdf',
    'K: the version row pins Storage version, real size and MIME type', JSON.stringify(pinned));
  const resA = await reservation(stdName);
  check(resA?.settled_at && !resA.rejected_at && resA.object_version === std.version,
    'K: finalisation settles the reservation with the Storage version', JSON.stringify(resA));
  const again2 = await finalize(admin, docA, stdName);
  check(!!again2.error, 'K: the same upload cannot be finalised twice', again2.error?.code);

  const dl = await download(admin, verA);
  check(dl.status === 200 && dl.bytes === 120, 'K: download via record_document_download + signed URL returns the bytes', JSON.stringify(dl.error?.message ?? dl));
  let dr = await directRead(userJwt(other), stdName);
  check(dr.status === 200 && dr.bytes === 120, 'K: a member reads the intact finalised file through the Storage API', `HTTP ${dr.status}`);
  let us = await userSign(userJwt(other), stdName);
  check(us.status === 200 && us.signed, 'K: a member can sign the intact finalised file with their own JWT', `HTTP ${us.status}`);

  await owner.query(`update private.storage_upload_reservations set expires_at = now() - interval '2 days'
                     where bucket_id = 'company-documents' and object_name = $1`, [stdName]);
  await owner.query(`select * from private.reconcile_storage_reservations()`);
  const afterRec = await reservation(stdName);
  check(!afterRec?.rejected_at, 'K: reconciliation does not reject a finalised upload', JSON.stringify(afterRec));
  let lists = await listedFor(stdName);
  check(lists.orphan.length === 0 && lists.incident.length === 0,
    'K: an intact finalised file is neither an orphan nor an integrity incident', JSON.stringify(lists));

  // Bytes replaced behind SOKO's back (service role bypasses RLS): download
  // refuses, and the file is reported as an incident, not a deletion candidate.
  r = await upload(serviceJwt(), 'company-documents', stdName, 90, 'application/pdf', { upsert: true });
  const swapped = await object('company-documents', stdName);
  check(r.status === 200 && swapped?.version !== std.version, 'K: a service-role overwrite changes storage.objects.version',
    `${std.version} -> ${swapped?.version}`);
  const dlBad = await download(admin, verA);
  check(dlBad.error?.code === '55000', 'K: download of replaced bytes is refused', dlBad.error?.code ?? JSON.stringify(dlBad));
  for (const [who, uid] of [['the uploader', admin], ['another member', other]]) {
    dr = await directRead(userJwt(uid), stdName);
    check(dr.status >= 400, `K: ${who} cannot read replaced bytes through the Storage API`, `HTTP ${dr.status}`);
    us = await userSign(userJwt(uid), stdName);
    check(us.status >= 400 && !us.signed, `K: ${who} cannot sign replaced bytes with their own JWT`, `HTTP ${us.status}`);
  }
  await owner.query(`select * from private.reconcile_storage_reservations()`);
  lists = await listedFor(stdName);
  check(lists.orphan.length === 0, 'K: a replaced finalised file is not listed for routine deletion', JSON.stringify(lists.orphan));
  check(lists.incident.length === 1 && lists.incident[0].incident === 'replaced',
    'K: a replaced finalised file is reported as an integrity incident', JSON.stringify(lists.incident));

  // L. Full document lifecycle with a resumable (TUS) upload in two chunks.
  const docB = await newDoc('Resumable lifecycle');
  const tusName = `${co}/${docB}/v1/resumable.pdf`;
  const tusBig = `${co}/${docB}/v1/too-big.pdf`;
  const tusMime = `${co}/${docB}/v1/wrong-type.pdf`;
  await reserveDoc(admin, tusBig, 100);
  let t = await tusCreate(userJwt(admin), 'company-documents', tusBig, 200, 'application/pdf');
  check(t.status >= 400, 'L: a resumable upload declaring more than the reservation is refused at creation', `HTTP ${t.status}`);
  await reserveDoc(admin, tusMime, 200);
  t = await tusCreate(userJwt(admin), 'company-documents', tusMime, 200, 'image/png');
  check(t.status >= 400, 'L: a resumable upload declaring another content type is refused at creation', `HTTP ${t.status}`);
  t = await tusCreate(userJwt(other), 'company-documents', tusName, 200, 'application/pdf');
  check(t.status >= 400, 'L: a resumable upload without the caller\'s reservation is refused', `HTTP ${t.status}`);

  check(!(await reserveDoc(admin, tusName, 200)).error, 'L: reserve 200 bytes application/pdf');
  t = await tusCreate(userJwt(admin), 'company-documents', tusName, 200, 'application/pdf');
  check(t.status === 201 && !!t.location, 'L: resumable upload created under the reservation', `HTTP ${t.status}`);
  let p = await tusPatch(userJwt(admin), t.location, 0, 100);
  check(p.status === 204 && p.offset === 100, 'L: first chunk accepted', `HTTP ${p.status} offset ${p.offset}`);
  check(!(await object('company-documents', tusName)), 'L: no storage.objects row exists until the upload completes');
  check(await tusHead(userJwt(admin), t.location) === 100, 'L: HEAD reports the resumable offset');
  const otherPatch = await tusPatch(userJwt(other), t.location, 100, 100);
  check(otherPatch.status >= 400, 'L: another member cannot continue someone else\'s resumable upload', `HTTP ${otherPatch.status}`);
  p = await tusPatch(userJwt(admin), t.location, 100, 100);
  check(p.status === 204 && p.offset === 200, 'L: final chunk completes the upload', `HTTP ${p.status} offset ${p.offset}`);
  const tus = await object('company-documents', tusName);
  check(tus?.metadata?.size === 200 && tus?.metadata?.contentLength === 200,
    'L: resumable upload records metadata.size and metadata.contentLength = real bytes', JSON.stringify(tus?.metadata));
  check(tus?.metadata?.mimetype === 'application/pdf', 'L: resumable upload records metadata.mimetype from Upload-Metadata');
  check(typeof tus?.version === 'string' && tus.version.length > 0, 'L: resumable upload sets storage.objects.version', tus?.version);
  check(tus?.owner_id === admin, 'L: resumable upload sets owner_id to the uploader', tus?.owner_id);
  const finB = await finalize(admin, docB, tusName);
  check(!finB.error && finB.rows?.[0]?.id, 'L: the resumable upload is finalised', finB.error?.message ?? '');
  const dlB = await download(admin, finB.rows?.[0]?.id);
  check(dlB.status === 200 && dlB.bytes === 200, 'L: download returns the resumable upload\'s bytes', JSON.stringify(dlB.error?.message ?? dlB));
  await owner.query(`update private.storage_upload_reservations set expires_at = now() - interval '2 days'
                     where bucket_id = 'company-documents' and object_name = $1`, [tusName]);
  await owner.query(`select * from private.reconcile_storage_reservations()`);
  lists = await listedFor(tusName);
  check(!(await reservation(tusName))?.rejected_at && lists.orphan.length === 0 && lists.incident.length === 0,
    'L: after reconciliation the resumable file is settled, not an orphan, not an incident', JSON.stringify(lists));

  // M. Public document: an outsider reads it only while the finalised version is intact.
  const outsider = await user();
  await owner.query('update public.companies set is_public = true where id = $1', [co]);
  await owner.query('update public.documents set is_public = true where id = $1', [docB]);
  dr = await directRead(userJwt(outsider), tusName);
  check(dr.status === 200 && dr.bytes === 200, 'M: an outsider reads an intact public finalised file through the Storage API', `HTTP ${dr.status}`);
  r = await upload(serviceJwt(), 'company-documents', tusName, 50, 'application/pdf', { upsert: true });
  check(r.status === 200, 'M: service-role overwrite of the public file', `HTTP ${r.status}`);
  dr = await directRead(userJwt(outsider), tusName);
  check(dr.status >= 400, 'M: an outsider cannot read a replaced public file through the Storage API', `HTTP ${dr.status}`);
  us = await userSign(userJwt(outsider), tusName);
  check(us.status >= 400 && !us.signed, 'M: an outsider cannot sign a replaced public file', `HTTP ${us.status}`);
  dr = await directRead(userJwt(admin), tusName);
  check(dr.status >= 400, 'M: the owner cannot read a replaced public file through the Storage API', `HTTP ${dr.status}`);
  const dlPub = await download(admin, finB.rows?.[0]?.id);
  check(dlPub.error?.code === '55000', 'M: the download flow refuses a replaced public file', dlPub.error?.code ?? JSON.stringify(dlPub));

  // N. Missing finalised file: neither path can serve it.
  const delStatus = await serviceDelete(stdName);
  check(delStatus === 200 && !(await object('company-documents', stdName)), 'N: service role deletes the finalised file', `HTTP ${delStatus}`);
  const dlGone = await download(admin, verA);
  check(dlGone.error?.code === '55000', 'N: the download flow refuses a missing finalised file', dlGone.error?.code ?? JSON.stringify(dlGone));
  dr = await directRead(userJwt(admin), stdName);
  check(dr.status >= 400, 'N: a missing finalised file cannot be read through the Storage API', `HTTP ${dr.status}`);
  lists = await listedFor(stdName);
  check(lists.incident.length === 1 && lists.incident[0].incident === 'missing',
    'N: a missing finalised file is reported as an integrity incident', JSON.stringify(lists.incident));
} finally {
  for (const co of created.companies) {
    await owner.query(`delete from storage.objects where name like $1`, [`${co}/%`]).catch(() => {});
    await owner.query('delete from public.companies where id = $1', [co]).catch(e => console.log('cleanup', e.message));
  }
  for (const uid of created.users) await owner.query('delete from auth.users where id = $1', [uid]).catch(() => {});
  await owner.end();
}

console.log(failures === 0 ? 'Storage API integration: all passed' : `Storage API integration: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
