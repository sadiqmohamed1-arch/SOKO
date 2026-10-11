// SOKO Migration 07 — document-download Edge Function tests with the caller's JWT.
//
// Runs the real supabase/functions/document-download/index.ts under Deno against
// a local stub of PostgREST and Storage. The stub verifies each HS256 JWT and
// runs public.record_document_download on the LOCAL database as that user
// (role authenticated or anon, request.jwt.claims set), exactly as PostgREST
// would, and records every signed-URL request. Deno only gets
// --allow-net=127.0.0.1, so nothing can reach a Supabase project.
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js DENO_BIN=/path/to/deno \
//   node supabase/tests/document_download_edge_tests.mjs
//
// Needs a disposable database with all migrations applied. Fixtures are
// committed and removed again at the end.
import { createHmac, randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const url = process.env.SOKO_TEST_DATABASE_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  throw new Error('SOKO_TEST_DATABASE_URL must point at a local test database');
}
const pg = (await import(process.env.PG_MODULE ?? 'pg')).default;
const here = dirname(fileURLToPath(import.meta.url));
const FUNCTION_PATH = resolve(here, '../functions/document-download/index.ts');
const DRIVER_PATH = resolve(here, 'document_download_edge_driver.ts');

const JWT_SECRET = 'soko-local-edge-test-secret-' + randomUUID();
const ANON_KEY = 'local-anon-key';
const SERVICE_KEY = 'local-service-role-key';

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(ok ? 'PASS' : 'FAIL', label, detail);
};

const b64url = b => Buffer.from(b).toString('base64url');
function signJwt(payload, secret = JWT_SECRET) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}
function verifyJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const sig = createHmac('sha256', JWT_SECRET).update(`${parts[0]}.${parts[1]}`).digest('base64url');
  if (sig !== parts[2]) return null;
  const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
  if (typeof claims.exp !== 'number' || claims.exp * 1000 < Date.now()) return null;
  if (!['authenticated', 'anon'].includes(claims.role)) return null;
  return claims;
}
const now = () => Math.floor(Date.now() / 1000);
const userJwt = uid => signJwt({ sub: uid, role: 'authenticated', aud: 'authenticated', exp: now() + 600 });

const admin = new pg.Client({ connectionString: url });
await admin.connect();

// --- local PostgREST + Storage stub ----------------------------------------
const signCalls = [];
const rpcCalls = [];
const readBody = req => new Promise(r => { let s = ''; req.on('data', c => (s += c)); req.on('end', () => r(s)); });
const reply = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const stub = createServer(async (req, res) => {
  const body = await readBody(req);
  const bearer = (req.headers.authorization ?? '').replace(/^Bearer /, '');
  if (req.method === 'POST' && req.url === '/rest/v1/rpc/record_document_download') {
    if (req.headers.apikey !== ANON_KEY) return reply(res, 401, { code: 'PGRST301', message: 'bad apikey' });
    const claims = verifyJwt(bearer);
    rpcCalls.push({ sub: claims?.sub ?? null, ok: !!claims });
    if (!claims) return reply(res, 401, { code: 'PGRST301', message: 'JWT invalid' });
    const c = new pg.Client({ connectionString: url });
    await c.connect();
    try {
      await c.query('begin');
      await c.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)`,
        [JSON.stringify(claims), claims.sub ?? '']);
      await c.query(claims.role === 'anon' ? 'set local role anon' : 'set local role authenticated');
      const { rows } = await c.query('select public.record_document_download($1::uuid) as path',
        [JSON.parse(body).p_version]);
      await c.query('commit');
      return reply(res, 200, rows[0].path);
    } catch (e) {
      await c.query('rollback').catch(() => {});
      return reply(res, e.code === '42501' ? 403 : 400, { code: e.code, message: e.message });
    } finally {
      await c.end();
    }
  }
  const sign = req.method === 'POST' && req.url.match(/^\/storage\/v1\/object\/sign\/([^/]+)\/(.+)$/);
  if (sign) {
    if (bearer !== SERVICE_KEY) return reply(res, 403, { message: 'service role required' });
    const path = decodeURIComponent(sign[2]);
    signCalls.push({ bucket: sign[1], path, expiresIn: JSON.parse(body).expiresIn });
    return reply(res, 200, { signedURL: `/object/sign/${sign[1]}/${encodeURI(path)}?token=local` });
  }
  reply(res, 404, { message: 'not stubbed: ' + req.method + ' ' + req.url });
});
await new Promise(r => stub.listen(0, '127.0.0.1', r));
const STUB_URL = `http://127.0.0.1:${stub.address().port}`;

// --- Deno driver --------------------------------------------------------------
const workdir = process.env.EDGE_WORKDIR ?? join(tmpdir(), 'soko-edge-tests');
mkdirSync(workdir, { recursive: true });
const deno = spawn(process.env.DENO_BIN ?? 'deno',
  ['run', '--node-modules-dir=auto', '--allow-env', '--allow-read', '--allow-net=127.0.0.1', DRIVER_PATH], {
    cwd: workdir,
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME,
      ...(process.env.DENO_DIR ? { DENO_DIR: process.env.DENO_DIR } : {}),
      EDGE_FUNCTION_PATH: FUNCTION_PATH,
      SUPABASE_URL: STUB_URL, SUPABASE_ANON_KEY: ANON_KEY, SUPABASE_SERVICE_ROLE_KEY: SERVICE_KEY,
    },
    stdio: ['pipe', 'pipe', 'inherit'],
  });
const pending = new Map();
let ready;
const readyP = new Promise(r => (ready = r));
let out = '';
deno.stdout.on('data', chunk => {
  out += chunk;
  let nl;
  while ((nl = out.indexOf('\n')) >= 0) {
    const msg = JSON.parse(out.slice(0, nl));
    out = out.slice(nl + 1);
    if (msg.ready) ready();
    else pending.get(msg.id)?.(msg);
  }
});
const call = (method, headers, body) => new Promise(resolveCall => {
  const id = randomUUID();
  pending.set(id, resolveCall);
  deno.stdin.write(JSON.stringify({ id, method, headers, body }) + '\n');
});
const download = (token, versionId, extra = {}) => call('POST',
  { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra },
  JSON.stringify({ version_id: versionId }));

// --- fixtures (committed, removed at the end) -------------------------------
const ids = Object.fromEntries(
  ['owner', 'tech', 'recipient', 'outsider', 'live', 'rev', 'exp', 'arc', 'verif'].map(k => [k, randomUUID()]));
async function asUser(uid, sql, params = []) {
  await admin.query('begin');
  try {
    await admin.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true)`,
      [JSON.stringify({ sub: uid, role: 'authenticated' }), uid]);
    await admin.query('set local role authenticated');
    const r = await admin.query(sql, params);
    await admin.query('commit');
    return r.rows;
  } catch (e) {
    await admin.query('rollback');
    throw e;
  }
}
const companies = {};
const versions = {};
const shares = {};
let cleanupDone = false;
async function cleanup() {
  if (cleanupDone) return;
  cleanupDone = true;
  const cs = Object.values(companies);
  if (cs.length) {
    await admin.query(`delete from storage.objects where bucket_id = 'company-documents' and split_part(name, '/', 1) = any($1)`, [cs]);
    await admin.query('delete from public.companies where id = any($1::uuid[])', [cs]);
  }
  await admin.query('delete from auth.users where id = any($1::uuid[])',
    [[ids.owner, ids.tech, ids.recipient, ids.outsider]]);
}

try {
  await admin.query(`insert into auth.users (id, email, aud, role, email_confirmed_at)
    select u, 'edge-' || u || '@soko-security.test', 'authenticated', 'authenticated', now() from unnest($1::uuid[]) u`,
    [[ids.owner, ids.tech, ids.recipient, ids.outsider]]);
  companies.sup = (await asUser(ids.owner, `select public.create_company('supplier', 'Edge Supplier LLC') id`))[0].id;
  companies.rec = (await asUser(ids.recipient, `select public.create_company('contractor', 'Edge Recipient LLC') id`))[0].id;
  companies.out = (await asUser(ids.outsider, `select public.create_company('supplier', 'Edge Outsider LLC') id`))[0].id;
  await admin.query(`insert into public.company_memberships (company_id, company_kind, user_id, role_key)
    values ($1, 'supplier', $2, 'technical_manager')`, [companies.sup, ids.tech]);
  const docs = ['live', 'rev', 'exp', 'arc', 'verif'];
  for (const k of docs) {
    await admin.query(`insert into public.documents (id, company_id, name, access_level, is_public, for_verification)
      values ($1, $2, $3, $4, false, $5)`,
      [ids[k], companies.sup, `Edge ${k}`, k === 'verif' ? 'admins' : 'team', k === 'verif']);
    const path = `${companies.sup}/${ids[k]}/v1/file.pdf`;
    await admin.query(`insert into storage.objects (bucket_id, name, metadata)
      values ('company-documents', $1, '{"size": 100, "mimetype": "application/pdf"}')`, [path]);
    // Finalisation requires the uploader's reservation and a Storage owner/version.
    await admin.query(`insert into private.storage_upload_reservations
        (company_id, bucket_id, object_name, user_id, reserved_bytes, mime_type, created_at, expires_at)
      values ($1, 'company-documents', $2, $3, 100, 'application/pdf', now() - interval '1 minute', now() + interval '15 minutes')`,
      [companies.sup, path, ids.owner]);
    await admin.query(`update storage.objects set owner_id = $2, version = 'edge-' || md5(name)
      where bucket_id = 'company-documents' and name = $1`, [path, ids.owner]);
    versions[k] = (await asUser(ids.owner, 'select public.finalize_document_version($1, $2, $3) id',
      [ids[k], path, 'file.pdf']))[0].id;
  }
  for (const k of ['live', 'rev', 'exp', 'arc']) {
    shares[k] = (await asUser(ids.owner, `select public.share_document($1, $2, now() + interval '1 day') id`,
      [ids[k], companies.rec]))[0].id;
  }
  const pathOf = k => `${companies.sup}/${ids[k]}/v1/file.pdf`;

  await readyP;
  const tok = { owner: userJwt(ids.owner), tech: userJwt(ids.tech), rec: userJwt(ids.recipient), out: userJwt(ids.outsider) };

  const expectUrl = async (label, token, k) => {
    const before = signCalls.length;
    const r = await download(token, versions[k]);
    const sc = signCalls.slice(before);
    check(r.status === 200 && typeof r.body?.url === 'string' && r.body.url.startsWith(STUB_URL + '/storage/v1/')
          && r.body.expires_in === 60 && sc.length === 1 && sc[0].path === pathOf(k)
          && sc[0].bucket === 'company-documents' && sc[0].expiresIn === 60 && r.cacheControl === 'no-store',
      label, `status ${r.status}, signs ${sc.length}`);
  };
  const expectRefused = async (label, token, versionId, status, extra) => {
    const before = signCalls.length;
    const r = await download(token, versionId, extra);
    check(r.status === status && signCalls.length === before && r.body?.url === undefined,
      label, `status ${r.status}, signs ${signCalls.length - before}`);
  };

  // Request handling and JWT verification.
  {
    const r = await call('GET', {}, undefined);
    check(r.status === 405, 'GET is rejected', `status ${r.status}`);
    const o = await call('OPTIONS', {}, undefined);
    check(o.status === 200 && signCalls.length === 0, 'CORS preflight signs nothing', `status ${o.status}`);
  }
  await expectRefused('no Authorization header is rejected before any RPC', null, versions.live, 401);
  await expectRefused('a non-uuid version id is rejected', tok.owner, 'not-a-uuid', 400);
  await expectRefused('a JWT signed with the wrong secret is refused', signJwt(
    { sub: ids.owner, role: 'authenticated', exp: now() + 600 }, 'wrong-secret'), versions.live, 403);
  await expectRefused('an expired JWT is refused', signJwt(
    { sub: ids.owner, role: 'authenticated', exp: now() - 60 }), versions.live, 403);
  await expectRefused('an anon-role JWT is refused', signJwt({ role: 'anon', exp: now() + 600 }), versions.live, 403);
  await expectRefused('the service-role key as a caller JWT is refused', SERVICE_KEY, versions.live, 403);
  await expectRefused('an unknown version is refused', tok.owner, randomUUID(), 403);
  check(rpcCalls.every(c => c.ok || c.sub === null), 'invalid JWTs never reach the database as a user');

  // Live access.
  await expectUrl('the owner admin gets a 60-second URL', tok.owner, 'live');
  await expectUrl('a team member gets a 60-second URL', tok.tech, 'live');
  await expectUrl('an active share recipient gets a 60-second URL', tok.rec, 'live');
  await expectUrl('an active share recipient can download the soon-revoked document', tok.rec, 'rev');
  await expectUrl('an active share recipient can download the soon-expired document', tok.rec, 'exp');
  await expectUrl('an active share recipient can download the soon-archived document', tok.rec, 'arc');
  await expectRefused('another company cannot download a private document', tok.out, versions.live, 403);
  await expectRefused('a share recipient cannot download unshared verification evidence', tok.rec, versions.verif, 403);
  await expectRefused('a non-admin member cannot download admin-only evidence', tok.tech, versions.verif, 403);

  // Revoke, expire, archive.
  await asUser(ids.owner, 'select public.revoke_document_share($1)', [shares.rev]);
  await admin.query(`update public.document_shares set expires_at = now() - interval '1 second' where id = $1`, [shares.exp]);
  await asUser(ids.owner, 'update public.documents set archived = true where id = $1', [ids.arc]);
  await expectRefused('a revoked share cannot produce a new signed URL', tok.rec, versions.rev, 403);
  await expectRefused('an expired share cannot produce a new signed URL', tok.rec, versions.exp, 403);
  await expectRefused('a share of an archived document cannot produce a new signed URL', tok.rec, versions.arc, 403);
  await expectUrl('an internal member can still download an archived document', tok.tech, 'arc');
  await expectUrl('other active shares are unaffected', tok.rec, 'live');
  await expectUrl('the owner can still download the revoked-share document', tok.owner, 'rev');

  // Suspension.
  await admin.query('update public.companies set is_suspended = true where id = $1', [companies.sup]);
  await expectRefused("a suspended owner's share cannot produce a signed URL", tok.rec, versions.live, 403);
  await expectRefused('a member of a suspended company cannot download', tok.tech, versions.live, 403);
  await expectRefused('an admin of a suspended company cannot download ordinary documents', tok.owner, versions.live, 403);
  await expectUrl('an admin of a suspended company can still download verification evidence', tok.owner, 'verif');
  await admin.query('update public.companies set is_suspended = false where id = $1', [companies.sup]);

  // Audit: one entry per signed URL, none for refusals.
  const { rows } = await admin.query(`select count(*)::int n from public.audit_log
    where action = 'download' and company_id = $1`, [companies.sup]);
  check(rows[0].n === signCalls.length, 'every signed URL has exactly one audit entry and refusals have none',
    `audit ${rows[0].n}, signed ${signCalls.length}`);
  check(signCalls.every(c => c.expiresIn === 60), 'every signed URL lives 60 seconds');
} catch (e) {
  failures++;
  console.log('FAIL harness error', e.message);
} finally {
  deno.stdin.end();
  deno.kill();
  stub.close();
  await cleanup().catch(e => console.log('cleanup error', e.message));
  await admin.end();
}

console.log(failures === 0 ? 'EDGE: all passed' : `EDGE: ${failures} failed`);
if (failures) process.exitCode = 1;
