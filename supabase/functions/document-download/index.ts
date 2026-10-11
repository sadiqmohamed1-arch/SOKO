// Supabase Edge Function (Deno). Not part of the Vite build.
//
// POST { "version_id": "<uuid>" } with the user's Authorization: Bearer <jwt>.
// 1. Calls public.record_document_download AS THE CALLER, which enforces the
//    owner's access level, public documents, or an active unexpired share, and
//    writes the audit entry. Any denial stops here.
// 2. Only then signs a 60-second URL with the service role. Share recipients
//    have no direct Storage read policy, so this is their only path to a file,
//    and revoking or expiring a share blocks every new URL immediately.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SIGNED_URL_TTL_SECONDS = 60;
const BUCKET = 'company-documents';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'not authenticated' });

  let versionId: unknown;
  try {
    versionId = (await req.json())?.version_id;
  } catch {
    return json(400, { error: 'invalid body' });
  }
  if (typeof versionId !== 'string' || !UUID_RE.test(versionId)) {
    return json(400, { error: 'version_id must be a uuid' });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return json(500, { error: 'server misconfigured' });

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: storagePath, error: authzError } = await asCaller.rpc('record_document_download', {
    p_version: versionId,
  });
  if (authzError || typeof storagePath !== 'string') {
    return json(403, { error: 'not allowed' });
  }

  const asService = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: signed, error: signError } = await asService.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);
  if (signError || !signed?.signedUrl) return json(500, { error: 'could not sign url' });

  return json(200, { url: signed.signedUrl, expires_in: SIGNED_URL_TTL_SECONDS });
});
