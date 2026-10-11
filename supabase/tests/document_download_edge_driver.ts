// Deno driver for document_download_edge_tests.mjs. Loads the real
// document-download Edge Function, captures the handler it passes to
// Deno.serve, and answers one JSON request per stdin line with one JSON
// response per stdout line. Run with --allow-net=127.0.0.1 so the function
// can only reach the local stub, never a Supabase project.
type Handler = (req: Request) => Response | Promise<Response>;
let handler: Handler | undefined;

Object.defineProperty(Deno, 'serve', {
  configurable: true,
  writable: true,
  value: (h: Handler) => {
    handler = h;
    return { finished: Promise.resolve(), shutdown: async () => {}, ref() {}, unref() {}, addr: {} };
  },
});

const fnPath = Deno.env.get('EDGE_FUNCTION_PATH');
if (!fnPath) throw new Error('EDGE_FUNCTION_PATH is required');
await import(new URL(`file://${fnPath}`).href);
if (!handler) throw new Error('the Edge Function did not call Deno.serve');

const encoder = new TextEncoder();
const write = (o: unknown) => Deno.stdout.write(encoder.encode(JSON.stringify(o) + '\n'));
await write({ ready: true });

let buffer = '';
for await (const chunk of Deno.stdin.readable.pipeThrough(new TextDecoderStream())) {
  buffer += chunk;
  let nl: number;
  while ((nl = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, nl);
    buffer = buffer.slice(nl + 1);
    if (!line.trim()) continue;
    const { id, method, headers, body } = JSON.parse(line);
    try {
      const res = await handler(new Request('http://edge.local/document-download', {
        method, headers, body: method === 'GET' || method === 'OPTIONS' ? undefined : body,
      }));
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch { /* non-JSON body */ }
      await write({ id, status: res.status, body: json, cacheControl: res.headers.get('cache-control') });
    } catch (e) {
      await write({ id, status: -1, error: String(e) });
    }
  }
}
