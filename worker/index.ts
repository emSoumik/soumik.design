// range worker: static assets answer Range with a full 200, which Safari won't play.
// only the video paths in wrangler.jsonc (run_worker_first) come through here.

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

// workerd global (not in lib.dom)
declare class FixedLengthStream extends TransformStream<Uint8Array, Uint8Array> {
  constructor(length: number);
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'public, max-age=86400, stale-while-revalidate=604800';

const TYPES: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
};

type Span = { start: number; end: number } | 'unsatisfiable' | null;

// null = no usable range (serve the whole file); one range only
function parseRange(header: string, size: number): Span {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  if (m[1] === '') {
    const n = Number(m[2]);
    if (n === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - n), end: size - 1 };
  }
  const start = Number(m[1]);
  if (m[2] !== '' && Number(m[2]) < start) return null;
  if (start >= size) return 'unsatisfiable';
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  return { start, end };
}

// stream bytes [start, end] of body without buffering, and stop reading upstream after end
function slice(body: ReadableStream<Uint8Array>, start: number, end: number) {
  const reader = body.getReader();
  let pos = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) return controller.close();
        const next = pos + value.byteLength;
        let sent = false;
        if (next > start) {
          const from = Math.max(0, start - pos);
          const to = Math.min(value.byteLength, end + 1 - pos);
          controller.enqueue(value.subarray(from, to));
          sent = true;
        }
        pos = next;
        if (pos > end) {
          controller.close();
          await reader.cancel();
          return;
        }
        // one chunk per pull keeps backpressure; skipped chunks keep looping
        if (sent) return;
      }
    },
    cancel: (reason) => reader.cancel(reason),
  });
}

// the assets binding sends no Content-Length, so count bytes once per file version and remember it
const sizes = new Map<string, number>();

async function countBytes(res: Response): Promise<number> {
  if (!res.body) return 0;
  const reader = res.body.getReader();
  let n = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) return n;
    n += value.byteLength;
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'GET' && request.method !== 'HEAD') return env.ASSETS.fetch(request);

    const url = new URL(request.url);
    const ext = url.pathname.split('.').pop() ?? '';
    const type = TYPES[ext];
    if (!type) return env.ASSETS.fetch(request);

    const rangeHeader = request.headers.get('Range');
    const ifRange = request.headers.get('If-Range');

    // always ask the assets binding for the whole file, never a range
    const upstreamHeaders = new Headers(request.headers);
    upstreamHeaders.delete('Range');
    upstreamHeaders.delete('If-Range');
    const fetchFull = (method: string) =>
      env.ASSETS.fetch(new Request(request.url, { method, headers: upstreamHeaders }));
    const upstream = await fetchFull(request.method);

    // 304, 404 and friends pass through
    if (upstream.status !== 200) return upstream;

    const etag = upstream.headers.get('ETag');
    const immutable = /\.v\d+\.(mp4|webm)$/.test(url.pathname);

    const headers = new Headers();
    headers.set('Content-Type', type);
    headers.set('Accept-Ranges', 'bytes');
    headers.set('Cache-Control', immutable ? IMMUTABLE : REVALIDATE);
    if (etag) headers.set('ETag', etag);
    headers.set('X-Content-Type-Options', 'nosniff');

    // a plain GET streams straight through; ranges and HEAD need the size
    if (!rangeHeader && request.method === 'GET') return new Response(upstream.body, { status: 200, headers });

    const key = `${url.pathname}:${etag}`;
    let size = Number(upstream.headers.get('Content-Length')) || sizes.get(key) || 0;
    if (!size) {
      size = await countBytes(await fetchFull('GET'));
      sizes.set(key, size);
      if (sizes.size > 500) sizes.delete(sizes.keys().next().value as string);
    }

    let span: Span = null;
    if (rangeHeader && size > 0) {
      // if-range: only honour the range when the validator still matches
      const stale = ifRange !== null && ifRange !== etag;
      if (!stale) span = parseRange(rangeHeader, size);
    }

    if (span === 'unsatisfiable') {
      headers.set('Content-Range', `bytes */${size}`);
      await upstream.body?.cancel();
      return new Response(null, { status: 416, headers });
    }

    if (span) {
      headers.set('Content-Range', `bytes ${span.start}-${span.end}/${size}`);
      headers.set('Content-Length', String(span.end - span.start + 1));
      if (request.method === 'HEAD' || !upstream.body) {
        await upstream.body?.cancel();
        return new Response(null, { status: 206, headers });
      }
      // fixed length so the client gets a real Content-Length instead of chunked encoding
      const { readable, writable } = new FixedLengthStream(span.end - span.start + 1);
      slice(upstream.body, span.start, span.end).pipeTo(writable).catch(() => {});
      return new Response(readable, { status: 206, headers });
    }

    // no usable range: full response
    headers.set('Content-Length', String(size));
    if (request.method === 'HEAD') {
      await upstream.body?.cancel();
      return new Response(null, { status: 200, headers });
    }
    return new Response(upstream.body, { status: 200, headers });
  },
};
