// SOKO Migration 05 — concurrent credit spending tests.
//
// Needs several real sessions, so it cannot live in security_tests.sql.
// Run only against a disposable LOCAL database with all migrations applied:
//
//   SOKO_TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres \
//   PG_MODULE=/path/to/node_modules/pg/lib/index.js \
//   node supabase/tests/credit_concurrency_tests.mjs
//
// Every transaction takes its snapshot, then waits at a barrier, then spends.
// That forces the stale-snapshot case on every run, at every isolation level.

const url = process.env.SOKO_TEST_DATABASE_URL;
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) {
  throw new Error('SOKO_TEST_DATABASE_URL must point at a local test database');
}
const pg = (await import(process.env.PG_MODULE ?? 'pg')).default;
const connect = async () => { const c = new pg.Client({ connectionString: url }); await c.connect(); return c; };

let failures = 0;
const check = (ok, label, detail = '') => {
  if (!ok) failures++;
  console.log(ok ? 'PASS' : 'FAIL', label, detail);
};

const owner = await connect();
const created = { companies: [], users: [] };

async function company(balance) {
  const id = (await owner.query(
    `insert into public.companies (kind, legal_name) values ('supplier', 'Concurrency Co ' || gen_random_uuid()) returning id`,
  )).rows[0].id;
  created.companies.push(id);
  if (balance > 0) {
    await owner.query(`insert into public.credit_ledger (company_id, delta, reason) values ($1, $2, 'purchase')`, [id, balance]);
  }
  return id;
}
const balance = async co => (await owner.query('select private.credit_balance($1) b', [co])).rows[0].b;

async function race(n, isolation, statement, params, setup = []) {
  const clients = await Promise.all(Array.from({ length: n }, connect));
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let ready = 0;
  const run = async c => {
    await c.query(`begin isolation level ${isolation}`);
    for (const s of setup) await c.query(s);
    await c.query('select count(*) from public.credit_ledger');
    if (++ready === n) release();
    await gate;
    try {
      await c.query(statement, params);
      await c.query('select pg_sleep(0.05)');
      await c.query('commit');
      return 'ok';
    } catch (e) {
      await c.query('rollback');
      return e.code;
    }
  };
  const outcomes = await Promise.all(clients.map(run));
  await Promise.all(clients.map(c => c.end()));
  return outcomes;
}

const summary = outcomes => outcomes.reduce((acc, o) => ({ ...acc, [o]: (acc[o] ?? 0) + 1 }), {});
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const ISOLATIONS = ['read committed', 'repeatable read', 'serializable'];
const RETRYABLE = new Set(['40001', '40P01']);

// Releases once n callers arrive; later calls (retries) pass straight through.
function barrier(n) {
  let release, ready = 0;
  const gate = new Promise(resolve => { release = resolve; });
  return async () => { if (++ready >= n) release(); await gate; };
}

async function attempt(c, isolation, body) {
  await c.query(`begin isolation level ${isolation}`);
  try {
    await body(c);
    await c.query('commit');
    return 'ok';
  } catch (e) {
    await c.query('rollback').catch(() => {});
    return e.code ?? e.message;
  }
}

// The client-side retry contract for credit operations: retry only
// serialization failures and deadlocks, with jitter; everything else is final.
async function withRetry(c, isolation, body, max = 25) {
  const seen = [];
  for (;;) {
    const outcome = await attempt(c, isolation, body);
    if (!RETRYABLE.has(outcome) || seen.length >= max) return { outcome, retries: seen };
    seen.push(outcome);
    await sleep(5 + Math.random() * 25);
  }
}

async function parallel(bodies, isolation) {
  const clients = await Promise.all(bodies.map(connect));
  try {
    return await Promise.all(bodies.map((body, i) => withRetry(clients[i], isolation, body)));
  } finally {
    await Promise.all(clients.map(c => c.end()));
  }
}

const finals = results => summary(results.map(r => r.outcome));
const retried = results => summary(results.flatMap(r => r.retries));
const rows = async (sql, params) => (await owner.query(sql, params)).rows[0].c;

try {
  // Overspend races at each isolation level: balance 10, eight parallel debits of 3.
  for (const isolation of ['read committed', 'repeatable read', 'serializable']) {
    const co = await company(10);
    const outcomes = await race(8, isolation,
      `select private.spend_credits($1, 3, 'campaign_launch', null)`, [co]);
    const ok = outcomes.filter(o => o === 'ok').length;
    const unexpected = outcomes.filter(o => !['ok', '53400', '40001'].includes(o));
    const final = await balance(co);
    check(final >= 0 && final === 10 - 3 * ok && unexpected.length === 0 && ok <= 3,
      `spend race (${isolation}) never overspends`, JSON.stringify({ final, ...summary(outcomes) }));
    if (isolation === 'read committed') {
      check(ok === 3, 'spend race (read committed) serves every affordable debit', `ok=${ok}`);
    }
  }

  // Platform-admin negative adjustments racing each other.
  const admin = (await owner.query(
    `insert into auth.users (id, email, aud, role, email_confirmed_at)
     values (gen_random_uuid(), 'conc-admin-' || gen_random_uuid() || '@soko-security.test', 'authenticated', 'authenticated', now())
     returning id`,
  )).rows[0].id;
  created.users.push(admin);
  await owner.query(`insert into public.platform_admins (user_id, note) values ($1, 'concurrency test')`, [admin]);
  const claims = JSON.stringify({ sub: admin, role: 'authenticated' });
  for (const isolation of ['read committed', 'repeatable read']) {
    const co = await company(10);
    const outcomes = await race(8, isolation, `select public.admin_adjust_credits($1, -3, null)`, [co],
      [`select set_config('request.jwt.claims', '${claims}', true)`, 'set local role authenticated']);
    const ok = outcomes.filter(o => o === 'ok').length;
    const final = await balance(co);
    const audits = (await owner.query(
      `select count(*)::int c from public.audit_log where company_id = $1 and action = 'credit_adjustment'`, [co])).rows[0].c;
    check(final >= 0 && final === 10 - 3 * ok && audits === ok && outcomes.every(o => ['ok', '53400', '40001'].includes(o)),
      `admin adjustment race (${isolation}) never goes negative`, JSON.stringify({ final, audits, ...summary(outcomes) }));
  }

  // Direct owner debits are caught by the overdraft trigger even without the functions.
  {
    const co = await company(10);
    const outcomes = await race(8, 'read committed',
      `insert into public.credit_ledger (company_id, delta, reason) values ($1, -3, 'campaign_launch')`, [co]);
    const final = await balance(co);
    check(final === 1 && outcomes.filter(o => o === 'ok').length === 3,
      'direct owner debit race is serialised by the overdraft trigger', JSON.stringify({ final, ...summary(outcomes) }));
  }

  // Spends and refunds interleaved: the final balance equals the committed sum.
  {
    const co = await company(6);
    const clients = 6;
    const spends = race(clients, 'read committed', `select private.spend_credits($1, 2, 'campaign_launch', null)`, [co]);
    const refunds = race(clients, 'read committed', `select private.add_credits($1, 1, 'campaign_refund', null)`, [co]);
    const [s, r] = await Promise.all([spends, refunds]);
    const expected = 6 - 2 * s.filter(o => o === 'ok').length + r.filter(o => o === 'ok').length;
    const final = await balance(co);
    check(final === expected && final >= 0, 'mixed spend/refund race keeps an exact, non-negative balance',
      JSON.stringify({ final, expected, spends: summary(s), refunds: summary(r) }));
  }

  // Monthly grants run concurrently grant at most once per company per month.
  {
    const co = await company(0);
    await owner.query(`update public.company_subscriptions set plan_id = 'supplier_pro', status = 'active' where company_id = $1`, [co]);
    const outcomes = await race(5, 'read committed', `select private.grant_monthly_credits($1::date)`, ['2032-07-19']);
    const grants = (await owner.query(
      `select count(*)::int c from public.credit_ledger where company_id = $1 and reason = 'monthly_grant'`, [co])).rows[0].c;
    check(grants === 1 && outcomes.every(o => o === 'ok'), 'concurrent monthly grants are idempotent',
      JSON.stringify({ grants, ...summary(outcomes) }));
  }

  const proPlan = async co => owner.query(
    `update public.company_subscriptions set plan_id = 'supplier_pro', status = 'active' where company_id = $1`, [co]);
  const setClaims = c => c.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);

  // Spend races with the client retry contract: every caller ends in a final
  // answer (ok or insufficient), never a leftover 40001/40P01.
  for (const isolation of ISOLATIONS) {
    const co = await company(10);
    const go = barrier(8);
    const results = await parallel(Array.from({ length: 8 }, () => async c => {
      await c.query('select count(*) from public.credit_ledger');
      await go();
      await c.query(`select private.spend_credits($1, 3, 'campaign_launch', null)`, [co]);
      await c.query('select pg_sleep(0.02)');
    }), isolation);
    const f = finals(results);
    const final = await balance(co);
    check(f.ok === 3 && f['53400'] === 5 && final === 1,
      `spend race with retry (${isolation}) serves exactly the affordable debits`,
      JSON.stringify({ final, finals: f, retried: retried(results) }));
  }

  // Classic cross-company deadlock: T1 spends A then B, T2 spends B then A.
  // Postgres must detect it (40P01), and a retry must complete both.
  for (const isolation of ISOLATIONS) {
    const a = await company(10), b = await company(10);
    const go = barrier(2);
    const crossSpend = (first, second) => async c => {
      await c.query(`select private.spend_credits($1, 2, 'campaign_launch', null)`, [first]);
      await go();
      await c.query('select pg_sleep(0.1)');
      await c.query(`select private.spend_credits($1, 2, 'campaign_launch', null)`, [second]);
    };
    const results = await parallel([crossSpend(a, b), crossSpend(b, a)], isolation);
    const r = retried(results);
    const [ba, bb] = [await balance(a), await balance(b)];
    check((r['40P01'] ?? 0) + (r['40001'] ?? 0) >= 1, `cross-company deadlock is detected (${isolation})`, JSON.stringify(r));
    check(results.every(x => x.outcome === 'ok') && ba === 6 && bb === 6,
      `cross-company deadlock resolves by retry with exact balances (${isolation})`,
      JSON.stringify({ a: ba, b: bb, finals: finals(results) }));
  }

  // Monthly grants, spends and admin adjustments on one company at once.
  for (const [i, isolation] of ISOLATIONS.entries()) {
    const co = await company(5);
    await proPlan(co);
    const period = `2034-0${i + 1}-11`;
    const go = barrier(16);
    const op = (sql, params, admin = false) => async c => {
      if (admin) await setClaims(c);
      await c.query('select count(*) from public.credit_ledger');
      await go();
      await c.query(sql, params);
      await c.query('select pg_sleep(0.02)');
    };
    const bodies = [
      ...Array.from({ length: 4 }, () => op(`select private.grant_monthly_credits($1::date)`, [period])),
      ...Array.from({ length: 6 }, () => op(`select private.spend_credits($1, 2, 'campaign_launch', null)`, [co])),
      ...Array.from({ length: 4 }, () => op(`select public.admin_adjust_credits($1, -1, 'race debit')`, [co], true)),
      ...Array.from({ length: 2 }, () => op(`select public.admin_adjust_credits($1, 3, 'race credit')`, [co], true)),
    ];
    const deltas = [0, 0, 0, 0, -2, -2, -2, -2, -2, -2, -1, -1, -1, -1, 3, 3];
    const results = await parallel(bodies, isolation);
    const grantRows = await rows(
      `select count(*)::int c from public.credit_ledger where company_id = $1 and reason = 'monthly_grant' and period = date_trunc('month', $2::date)`,
      [co, period]);
    const grantAmount = await rows(
      `select coalesce(sum(delta), 0)::int c from public.credit_ledger where company_id = $1 and reason = 'monthly_grant'`, [co]);
    const committed = results.reduce((sum, r, j) => sum + (r.outcome === 'ok' ? deltas[j] : 0), 0);
    const okAdjust = results.slice(10).filter(r => r.outcome === 'ok').length;
    const audits = await rows(
      `select count(*)::int c from public.audit_log where company_id = $1 and action = 'credit_adjustment'`, [co]);
    const notes = await rows(`select count(*)::int c from public.credit_adjustment_notes where company_id = $1`, [co]);
    const final = await balance(co);
    const onlyFinal = results.every(r => ['ok', '53400'].includes(r.outcome));
    check(grantRows === 1 && results.slice(0, 4).every(r => r.outcome === 'ok'),
      `grants racing spends and adjustments grant exactly once (${isolation})`, JSON.stringify({ grantRows }));
    check(onlyFinal && final >= 0 && final === 5 + grantAmount + committed && audits === okAdjust && notes === okAdjust,
      `grants racing spends and adjustments keep an exact, non-negative balance (${isolation})`,
      JSON.stringify({ final, expected: 5 + grantAmount + committed, audits, notes, finals: finals(results), retried: retried(results) }));
  }

  // Concurrent monthly grants across many companies: one row per company per
  // month, whatever the isolation level or day of the month each run uses.
  {
    const cos = [];
    for (let k = 0; k < 25; k++) { const co = await company(0); await proPlan(co); cos.push(co); }
    for (const [i, isolation] of ISOLATIONS.entries()) {
      const go = barrier(6);
      const results = await parallel(Array.from({ length: 6 }, (_, d) => async c => {
        await c.query('select count(*) from public.credit_ledger');
        await go();
        await c.query(`select private.grant_monthly_credits($1::date)`, [`2035-0${i + 1}-${String(d + 3).padStart(2, '0')}`]);
      }), isolation);
      const g = (await owner.query(
        `select count(*)::int n, count(distinct company_id)::int d from public.credit_ledger
          where company_id = any($1) and reason = 'monthly_grant' and period = $2::date`,
        [cos, `2035-0${i + 1}-01`])).rows[0];
      check(g.n === cos.length && g.d === cos.length && results.every(r => r.outcome === 'ok'),
        `multi-company concurrent grants: exactly one per company per month (${isolation})`,
        JSON.stringify({ ...g, finals: finals(results), retried: retried(results) }));
    }
  }

  // Company deletion while credit work is in flight, on an account that has
  // already spent (warm guard row, so no FK lock is taken by the guard insert).
  const warmCompany = async () => {
    const co = await company(20);
    await owner.query(`select private.spend_credits($1, 1, 'campaign_launch', null)`, [co]);
    const c = await connect();
    await c.query('begin'); await setClaims(c);
    await c.query(`select public.admin_adjust_credits($1, -1, 'pre-delete note')`, [co]);
    await c.query('commit'); await c.end();
    return co;
  };
  const leftovers = async co => (await owner.query(
    `select (select count(*) from public.credit_ledger where company_id = $1)::int ledger,
            (select count(*) from public.credit_adjustment_notes where company_id = $1)::int notes,
            (select count(*) from private.credit_guard where company_id = $1)::int guard,
            (select count(*) from public.company_subscriptions where company_id = $1)::int subs,
            (select count(*) from public.audit_log where company_id = $1 and action = 'credit_adjustment')::int audits`,
    [co])).rows[0];

  for (const isolation of ISOLATIONS) {
    // Spend first: the deletion must wait and then cascade, with no deadlock.
    {
      const co = await warmCompany();
      const spender = await connect(), deleter = await connect();
      await spender.query(`begin isolation level ${isolation}`);
      await setClaims(spender);
      await spender.query(`select private.spend_credits($1, 3, 'campaign_launch', null)`, [co]);
      const del = attempt(deleter, 'read committed', c => c.query('delete from public.companies where id = $1', [co]));
      await sleep(150);
      let spendOutcome = 'ok';
      try {
        await spender.query(`select public.admin_adjust_credits($1, -2, 'in-flight note')`, [co]);
        await spender.query(`select private.spend_credits($1, 2, 'campaign_launch', null)`, [co]);
        await spender.query('commit');
      } catch (e) { spendOutcome = e.code; await spender.query('rollback'); }
      const delOutcome = await del;
      await spender.end(); await deleter.end();
      const left = await leftovers(co);
      check(spendOutcome === 'ok' && delOutcome === 'ok',
        `in-flight spend and adjustment commit before the company delete, no deadlock (${isolation})`,
        JSON.stringify({ spendOutcome, delOutcome }));
      check(left.ledger === 0 && left.notes === 0 && left.guard === 0 && left.subs === 0 && left.audits === 2,
        `company delete cascades ledger, notes and guard; adjustment audits survive (${isolation})`, JSON.stringify(left));
    }
    // Delete first: the in-flight spend must fail cleanly and write nothing.
    {
      const co = await warmCompany();
      const spender = await connect(), deleter = await connect();
      await deleter.query('begin');
      await deleter.query('delete from public.companies where id = $1', [co]);
      const spend = withRetry(spender, isolation, async c => {
        await c.query('select count(*) from public.credit_ledger');
        await c.query(`select private.spend_credits($1, 3, 'campaign_launch', null)`, [co]);
      });
      await sleep(150);
      await deleter.query('commit');
      const { outcome, retries } = await spend;
      await spender.end(); await deleter.end();
      const left = await leftovers(co);
      check(outcome === 'P0002' && !retries.includes('40P01') && left.ledger === 0 && left.guard === 0,
        `spend against a company deleted mid-flight fails as not found and writes nothing (${isolation})`,
        JSON.stringify({ outcome, retries, ...left }));
    }
  }
} finally {
  for (const id of created.companies) await owner.query('delete from public.companies where id = $1', [id]);
  for (const id of created.users) {
    await owner.query('delete from public.platform_admins where user_id = $1', [id]);
    await owner.query('delete from auth.users where id = $1', [id]);
  }
  await owner.end();
}

console.log(failures === 0 ? 'SOKO credit concurrency tests: all passed' : `SOKO credit concurrency tests: ${failures} failed`);
if (failures) process.exitCode = 1;
