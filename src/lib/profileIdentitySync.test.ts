/**
 * Profile identity sync tests (email-confirm signup path).
 * Run: npx tsx src/lib/profileIdentitySync.test.ts
 */
import type { User } from '@supabase/supabase-js';
import {
  buildIdentityFillPatch,
  buildSignupUserMetadata,
  clearedIdentityMetadata,
  isUsernameConflictError,
  isUsernameFormatError,
  pendingIdentityFromMetadata,
  syncPendingProfileIdentity,
} from './profileIdentitySync';

let passed = 0;
let failed = 0;
function assert(cond: unknown, label: string) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL ${label}`);
  }
}

// --- metadata builders ---
const meta = buildSignupUserMetadata({
  fullName: 'QA Buyer One',
  professionalClassification: 'Procurement / Buyer',
  username: 'qa1b.buyer.proc.a',
});
assert(meta.full_name === 'QA Buyer One', 'signup metadata includes full_name');
assert(meta.professional_classification === 'Procurement / Buyer', 'signup metadata includes professional role');
assert(meta.username === 'qa1b.buyer.proc.a', 'signup metadata includes username');

const salesMeta = buildSignupUserMetadata({
  fullName: 'QA Sales Two',
  professionalClassification: 'Sales / Business Development',
  username: null,
});
assert(salesMeta.professional_classification === 'Sales / Business Development', 'sales role in metadata');
assert(salesMeta.username === undefined, 'omitted username not in metadata');

assert(
  pendingIdentityFromMetadata(meta).professional_classification === 'Procurement / Buyer',
  'pending extracts classification',
);
assert(pendingIdentityFromMetadata(meta).username === 'qa1b.buyer.proc.a', 'pending extracts username');
assert(
  Object.keys(pendingIdentityFromMetadata({})).length === 0,
  'empty metadata → no pending identity',
);

// --- fill patch never overwrites ---
assert(
  Object.keys(
    buildIdentityFillPatch(
      { professional_classification: 'Consultant', username: 'existing' },
      { professional_classification: 'Procurement / Buyer', username: 'qa1b.buyer.proc.a' },
    ),
  ).length === 0,
  'does not overwrite existing classification or username',
);

const fillNull = buildIdentityFillPatch(
  { professional_classification: null, username: null },
  { professional_classification: 'Procurement / Buyer', username: 'qa1b.buyer.proc.a' },
);
assert(fillNull.professional_classification === 'Procurement / Buyer', 'fills null classification');
assert(fillNull.username === 'qa1b.buyer.proc.a', 'fills null username');

assert(
  buildIdentityFillPatch(
    { professional_classification: 'Engineer / Technical', username: null },
    { professional_classification: 'Procurement / Buyer', username: 'new.handle' },
  ).username === 'new.handle' &&
    buildIdentityFillPatch(
      { professional_classification: 'Engineer / Technical', username: null },
      { professional_classification: 'Procurement / Buyer', username: 'new.handle' },
    ).professional_classification === undefined,
  'fills only null username; keeps existing classification',
);

assert(
  isUsernameConflictError('duplicate key value violates unique constraint "profiles_username_uq"'),
  'detects username unique violation',
);
assert(
  isUsernameFormatError('new row violates check constraint "profiles_username_format_check"'),
  'detects username format violation',
);
assert(
  clearedIdentityMetadata().professional_classification === null &&
    clearedIdentityMetadata().username === null,
  'cleared metadata nulls pending keys',
);

// --- syncPendingProfileIdentity with mock client (no session at signup → later login) ---
function mockClient(opts: {
  current: { professional_classification: string | null; username: string | null };
  updateError?: { message: string; code?: string } | null;
  onUpdate?: (patch: Record<string, string | null>) => void;
}) {
  let lastUpdate: Record<string, string | null> | null = null;
  let updateCalls = 0;
  return {
    lastUpdate: () => lastUpdate,
    updateCalls: () => updateCalls,
    client: {
      from: (_table: string) => ({
        select: (_cols: string) => ({
          eq: (_c: string, _v: string) => ({
            maybeSingle: async () => ({ data: opts.current, error: null }),
          }),
        }),
        update: (patch: Record<string, string | null>) => ({
          eq: async (_c: string, _v: string) => {
            updateCalls += 1;
            lastUpdate = patch;
            opts.onUpdate?.(patch);
            // First call may fail on username; second (rest) succeeds
            if (opts.updateError && updateCalls === 1 && patch.username) {
              return { error: opts.updateError };
            }
            return { error: null };
          },
        }),
      }),
      auth: {
        updateUser: async () => ({ error: null }),
      },
    },
  };
}

async function runSyncCases() {
  const user = {
    id: 'cbd6b0ca-1f77-4210-b5b9-3589b8ac8b26',
    user_metadata: meta,
  } as unknown as User;

  {
    const m = mockClient({ current: { professional_classification: null, username: null } });
    const r = await syncPendingProfileIdentity(m.client, user);
    assert(r.applied === true, 'sync applies when profile columns null (post email-confirm login)');
    assert(r.clearMetadata === true, 'sync clears metadata after apply');
    assert(m.lastUpdate()?.professional_classification === 'Procurement / Buyer', 'sync wrote classification');
    assert(m.lastUpdate()?.username === 'qa1b.buyer.proc.a', 'sync wrote username');
  }

  {
    const m = mockClient({
      current: { professional_classification: 'Consultant', username: 'kept.user' },
    });
    const r = await syncPendingProfileIdentity(m.client, user);
    assert(r.applied === false, 'sync no-op when profile already filled (returning user)');
    assert(r.clearMetadata === true, 'clears stale signup metadata for returning user');
    assert(m.updateCalls() === 0, 'no profile write when nothing to fill');
  }

  {
    const m = mockClient({
      current: { professional_classification: null, username: null },
      updateError: {
        message: 'duplicate key value violates unique constraint "profiles_username_uq"',
        code: '23505',
      },
    });
    const r = await syncPendingProfileIdentity(m.client, user);
    assert(r.errors?.username?.includes('already taken'), 'username conflict → friendly error');
    assert(r.clearMetadata === true, 'clears metadata after username conflict');
    assert(m.updateCalls() === 2, 'retries update without username after conflict');
  }

  {
    const emptyUser = { id: user.id, user_metadata: {} } as unknown as User;
    const m = mockClient({ current: { professional_classification: null, username: null } });
    const r = await syncPendingProfileIdentity(m.client, emptyUser);
    assert(
      r.applied === false && r.clearMetadata === false,
      'no metadata → no sync (interrupted without signup fields)',
    );
  }
}

void runSyncCases().then(() => {
  console.log(`profileIdentitySync tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
});
