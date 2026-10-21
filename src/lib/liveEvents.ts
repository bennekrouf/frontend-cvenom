/**
 * Live change notifications from the backend (`GET /events`, Server-Sent Events).
 *
 * Profiles created or CVs generated outside this tab — by the MCP tools, the
 * chat, another tab — show up without polling.
 *
 * `EventSource` cannot send an Authorization header, so the stream is read
 * with `fetch` and parsed here. A fresh Firebase token is taken on every
 * (re)connection.
 */

import { auth } from './firebase';
import { getApiUrl } from './config';

export interface LiveEvent {
  kind: 'files_changed' | 'cv_generated' | 'resync';
  profile?: string;
  download_url?: string;
  filename?: string;
}

const MIN_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

/**
 * Number of this tab's own API calls still in flight. An event that arrives
 * meanwhile is most likely the echo of one of them (the server publishes just
 * before it responds), so callers can skip announcing it twice.
 */
let pendingLocal = 0;

export const localRequests = {
  track<T>(promise: Promise<T>): Promise<T> {
    pendingLocal++;
    return promise.finally(() => { pendingLocal--; });
  },
  inFlight: (): boolean => pendingLocal > 0,
};

/**
 * Stay connected to the event stream until the returned function is called.
 * Reconnects with exponential backoff; `onEvent` gets each parsed event.
 */
export function connectLiveEvents(onEvent: (event: LiveEvent) => void): () => void {
  let controller: AbortController | null = null;
  let stopped = false;
  let retryMs = MIN_RETRY_MS;
  let connectedBefore = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleReconnect = () => {
    if (stopped) return;
    retryTimer = setTimeout(run, retryMs);
    retryMs = Math.min(retryMs * 2, MAX_RETRY_MS);
  };

  const run = async () => {
    const user = auth.currentUser;
    if (!user || stopped) return;
    controller = new AbortController();

    try {
      const token = await user.getIdToken();
      const response = await fetch(`${getApiUrl()}/events`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

      retryMs = MIN_RETRY_MS;
      // Changes may have happened while disconnected.
      if (connectedBefore) onEvent({ kind: 'resync' });
      connectedBefore = true;
      await readStream(response.body, onEvent);
    } catch (error) {
      if (stopped) return;
      console.warn('Live events disconnected:', error);
    }
    scheduleReconnect();
  };

  run();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    controller?.abort();
  };
}

/** Parse an SSE body, calling `onEvent` for each `data:` payload. */
async function readStream(body: ReadableStream<Uint8Array>, onEvent: (event: LiveEvent) => void) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) return;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, '\n');

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);

      const data = block
        .split('\n')
        .filter(line => line.startsWith('data:'))
        .map(line => line.slice(5).trimStart())
        .join('\n');
      if (!data) continue; // heartbeat comment

      try {
        onEvent(JSON.parse(data) as LiveEvent);
      } catch {
        console.warn('Ignoring malformed live event:', data);
      }
    }
  }
}
