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
  `select metadata, version, updated_at from storage.objects where bucket_id = $1 and name = $2`, [bucket, name])).rows[0];

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
