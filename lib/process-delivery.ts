import type { ProcessRecord } from './process-coding';

// Transport settings are separate from the research coding / aggregation parameters.
export const PROCESS_DELIVERY = {
  version: 'batched-v2', activePollMs: 15000, inactivePollMs: 30000,
  uploadMs: 15000, jitterMs: 3000, maxEvents: 50, maxBytes: 900000,
  keepaliveBytes: 60000, backlogMs: 2000,
};
export type DeliveryRow = ProcessRecord & { ownerId: string };
export type RejectedRow = DeliveryRow & { rejectedReason: string; rejectedAt: number };
export type DeliveryResult = { acknowledgedIds: string[]; rejectedIds: string[]; rejectionReasons?: Record<string, string> };
type Queue = {
  read(): Promise<DeliveryRow[]>;
  settle(accepted: string[], rejected: RejectedRow[]): Promise<void>;
  count(): Promise<number>;
};

/** Batches transport only: every event keeps its original UID, sequence and timestamps. */
export class ProcessDelivery {
  private busy = false;
  private failures = 0;
  private retryAt = 0;
  private nextAt: number;
  constructor(private queue: Queue, private send: (rows: DeliveryRow[], exit: boolean) => Promise<DeliveryResult>,
    private update: (pending: number, error: string) => void, private now = Date.now, private random = Math.random) {
    this.nextAt = this.now() + this.delay(PROCESS_DELIVERY.uploadMs);
  }
  private delay(ms: number) { return ms + Math.floor(this.random() * PROCESS_DELIVERY.jitterMs); }
  async flush(mode: 'scheduled' | 'exit' | 'resume' = 'scheduled') {
    if (this.busy || this.now() < this.retryAt) return;
    const count = await this.queue.count();
    if (this.busy || this.now() < this.retryAt) return;
    if (mode === 'scheduled' && this.now() < this.nextAt) return;
    if (!count) { this.nextAt = this.now() + this.delay(PROCESS_DELIVERY.uploadMs); this.update(0, ''); return; }
    this.busy = true;
    try {
      const rows = await this.queue.read(), batch: DeliveryRow[] = [];
      const limit = mode === 'exit' ? PROCESS_DELIVERY.keepaliveBytes : PROCESS_DELIVERY.maxBytes;
      // Include envelope / commas in the keepalive budget.
      let bytes = 200;
      for (const row of rows.slice(0, PROCESS_DELIVERY.maxEvents)) {
        const size = new TextEncoder().encode(JSON.stringify(row)).length + 1;
        if (bytes + size > limit) break;
        batch.push(row); bytes += size;
      }
      if (!batch.length) return; // Large exit batches stay durable for the next visit.
      const result = await this.send(batch, mode === 'exit');
      if (!result || !Array.isArray(result.acknowledgedIds) || !Array.isArray(result.rejectedIds)) throw Error('Invalid recording receipt.');
      const sent = new Map(batch.map(row => [row.eventUid, row]));
      const accepted = [...new Set(result.acknowledgedIds)].filter(id => sent.has(id));
      const rejected = [...new Set(result.rejectedIds)].filter(id => sent.has(id) && !accepted.includes(id))
        .map(id => ({ ...sent.get(id)!, rejectedAt: this.now(), rejectedReason: result.rejectionReasons?.[id] || 'server_rejected' }));
      if (!accepted.length && !rejected.length) throw Error('Recording receipt did not confirm any events.');
      await this.queue.settle(accepted, rejected);
      this.failures = 0; this.retryAt = 0;
      const remaining = await this.queue.count();
      this.nextAt = this.now() + this.delay(remaining >= PROCESS_DELIVERY.maxEvents ? PROCESS_DELIVERY.backlogMs : PROCESS_DELIVERY.uploadMs);
      this.update(remaining, rejected.length ? 'Some records need review and are retained in this browser.' : '');
    } catch {
      this.retryAt = this.now() + this.delay(Math.min(60000, 5000 * 2 ** Math.min(this.failures++, 4)));
      this.update(await this.queue.count().catch(() => count), 'Behavior uploads will retry in the background. Writing is unaffected.');
    } finally { this.busy = false; }
  }
  /** Online / an explicit recording control change can bring a pending batch forward. */
  ready() { this.nextAt = this.now(); }
}
