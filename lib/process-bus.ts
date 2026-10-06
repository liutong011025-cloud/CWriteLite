'use client';
import type { ProcessContext, ProcessOrigin } from './process-coding';

// The writing application only talks to this small, optional bus. Observers cannot throw into it.
type Message = { kind: 'event'; code: string; payload: Record<string, unknown> | (() => Record<string, unknown>); origin?: ProcessOrigin } |
  { kind: 'request'; path: string; body: unknown; id: string; at: number } |
  { kind: 'result'; path: string; body: unknown; id: string; at: number; result?: unknown; error?: string } |
  { kind: 'context'; context: ProcessContext };
const listeners = new Set<(message: Message) => void>();
function publish(message: Message) {
  for (const fn of listeners) {
    try {
      const copy = message.kind === 'event' && typeof message.payload === 'function'
        ? { ...message, payload: () => structuredClone((message.payload as () => Record<string, unknown>)()) }
        : structuredClone(message);
      fn(copy);
    } catch { /* Research must never break writing. */ }
  }
}
export function subscribeProcess(fn: (message: Message) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export function trackProcess(code: string, payload: Record<string, unknown> | (() => Record<string, unknown>) = {}, origin?: ProcessOrigin) { publish({ kind: 'event', code, payload, origin }); }
export function processContext(context: ProcessContext) { publish({ kind: 'context', context }); }
export function observeProcessRequest(path: string, body: unknown) {
  if (!listeners.size) return (_result?: unknown, _error?: string) => {};
  const at = Date.now(), id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `req_${at}_${Math.random().toString(36).slice(2)}`;
  publish({ kind: 'request', path, body, id, at });
  return (result?: unknown, error?: string) => publish({ kind: 'result', path, body, id, at, result, error });
}

/** Optional observation of native fetch calls; returning the original response preserves app behavior. */
export async function processFetch(path: string, init?: RequestInit) {
  let body: unknown;
  try { body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined; } catch {}
  const finish = observeProcessRequest(path, body);
  try {
    const response = await fetch(path, init);
    try { void response.clone().json().then(data => finish(data, response.ok ? undefined : data.error || 'Request failed')).catch(() => finish(undefined, 'Unreadable response')); } catch { /* Observation cannot change the original fetch result. */ }
    return response;
  } catch (error) { finish(undefined, (error as Error).message); throw error; }
}
