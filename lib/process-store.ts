import { PrismaClient, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { CODING_VERSION, PROCESS_PARAMETERS } from './process-coding';
import { runtimeDatabaseUrl } from './database-config';

export type Recording = { id: string; startedAt: Date; stoppedAt: Date | null; createdBy: string; codingVersion: string; parameters: unknown; quality: unknown };
export type StoredProcessEvent = { eventUid: string; recordingId: string; userId: string; username: string; sessionId: string; sequence: number; eventId: string; functionalCode: string; category: string; subcategory: string; stage: string; workId: string | null; workType: string; origin: string; clientTs: Date; clientEndTs: Date | null; durationMs: number | null; activeDurationMs: number | null; payload: Record<string, unknown>; serverTs: Date };
const state = globalThis as unknown as { processDb?: PrismaClient; processPoolVersion?: string; recordingCache?: { value: Recording | null; until: number }; recordingRead?: Promise<Recording | null> };
/** A small separate pool prevents a research upload/export queue from occupying the writing pool. */
export function processDb() {
  if (state.processDb && state.processPoolVersion !== 'pooled-utc-v4') { void state.processDb.$disconnect().catch(()=>{}); state.processDb=undefined; state.recordingCache=undefined; state.recordingRead=undefined; }
  if (!state.processDb) {
    const url = runtimeDatabaseUrl(process.env.DATABASE_URL, 'recording');
    console.info('database_pool_initialized', { pool: 'recording', pooledPrismaPostgres: url ? new URL(url).hostname === 'pooled.db.prisma.io' : false });
    state.processDb = new PrismaClient({ ...(url ? { datasources: { db: { url } } } : {}) });
    state.processPoolVersion = 'pooled-utc-v4';
  }
  return state.processDb;
}
export function invalidateRecording() { state.recordingCache = undefined; }
export async function activeRecording(): Promise<Recording | null> {
  if (state.recordingCache && state.recordingCache.until > Date.now()) return state.recordingCache.value;
  if (!state.recordingRead) state.recordingRead = processDb().$queryRaw<Recording[]>`SELECT * FROM "ProcessRecording" WHERE "stoppedAt" IS NULL LIMIT 1`.then(rows => {
    const value = rows[0] || null; state.recordingCache = { value, until: Date.now() + 3000 }; return value;
  }).finally(() => { state.recordingRead = undefined; });
  return state.recordingRead;
}
export async function recordings() { return processDb().$queryRaw<Recording[]>`SELECT * FROM "ProcessRecording" ORDER BY "startedAt" DESC LIMIT 200`; }
export function isProcessAdmin(user: { username: string } | null) { return user?.username === 'Tony'; }
export function sameOrigin(request: Request) {
  const origin=request.headers.get('origin');if(!origin)return true;
  try { const source=new URL(origin),host=request.headers.get('host')||new URL(request.url).host;return ['http:','https:'].includes(source.protocol)&&source.host.toLowerCase()===host.toLowerCase(); } catch { return false; }
}
export async function controlRecording(action: 'start' | 'stop', username: string, userId: string) {
  const recording = await processDb().$transaction(async tx => {
    await tx.$executeRaw`DO $$ BEGIN PERFORM pg_advisory_xact_lock(1824060610); END $$`;
    const rows = await tx.$queryRaw<Recording[]>`SELECT * FROM "ProcessRecording" WHERE "stoppedAt" IS NULL LIMIT 1 FOR UPDATE`;
    if (action === 'start') {
      if (rows[0]) return rows[0];
      const id = randomUUID();
      const created = await tx.$queryRaw<Recording[]>`INSERT INTO "ProcessRecording" ("id","createdBy","codingVersion","parameters") VALUES (${id},${username},${CODING_VERSION},${JSON.stringify(PROCESS_PARAMETERS)}::jsonb) RETURNING *`;
      await tx.$executeRaw`INSERT INTO "ProcessEvent" ("eventUid","recordingId","userId","username","sessionId","sequence","eventId","functionalCode","category","subcategory","stage","workType","origin","clientTs","payload") VALUES (${randomUUID()},${id},${userId},${username},${'admin_'+id},1,'LITE_ADM_RECORD_START','ADM_RECORD_START','admin','开始记录','farm','platform','admin',${created[0].startedAt},'{}'::jsonb)`;
      return created[0];
    }
    if (!rows[0]) return null;
    const stopped = await tx.$queryRaw<Recording[]>`UPDATE "ProcessRecording" SET "stoppedAt"=CURRENT_TIMESTAMP WHERE "id"=${rows[0].id} RETURNING *`;
    await tx.$executeRaw`INSERT INTO "ProcessEvent" ("eventUid","recordingId","userId","username","sessionId","sequence","eventId","functionalCode","category","subcategory","stage","workType","origin","clientTs","payload") VALUES (${randomUUID()},${rows[0].id},${userId},${username},${'admin_'+rows[0].id},2,'LITE_ADM_RECORD_STOP','ADM_RECORD_STOP','admin','停止记录','farm','platform','admin',${stopped[0].stoppedAt},'{}'::jsonb)`;
    return stopped[0];
  }, { timeout: 6000, maxWait: 3000 });
  invalidateRecording(); return recording;
}
export { Prisma };
