import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { processDb, Prisma } from './process-store';

// One small join, fresh on each request. Never load profile / map / password data
// or borrow the pool used by writing and AI requests for a recording heartbeat.
export async function currentProcessUser() {
  const value = (await cookies()).get('cwritel_session')?.value;
  if (!value) return null;
  const token = createHash('sha256').update(value).digest('hex');
  const rows = await processDb().$queryRaw<{ id: string; username: string }[]>`
    SELECT u."id", u."username" FROM "Session" s JOIN "User" u ON u."id"=s."userId"
    WHERE s."token"=${token} AND s."expiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') LIMIT 1`;
  return rows[0] || null;
}

/** Authenticate and fetch only recording windows in one round trip for an upload batch. */
export async function processUploadContext(ids: string[]) {
  const value = (await cookies()).get('cwritel_session')?.value;
  if (!value) return null;
  const token = createHash('sha256').update(value).digest('hex');
  const windows = ids.length ? Prisma.sql`r.id IN (${Prisma.join(ids)})` : Prisma.sql`FALSE`;
  const rows = await processDb().$queryRaw<{id:string;username:string;recordings:{id:string;startedAt:string;stoppedAt:string|null}[]}[]>(Prisma.sql`
    SELECT u.id,u.username,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',r.id,'startedAt',r."startedAt",'stoppedAt',r."stoppedAt")) FROM "ProcessRecording" r WHERE ${windows}),'[]'::jsonb) AS recordings
    FROM "Session" s JOIN "User" u ON u.id=s."userId"
    WHERE s.token=${token} AND s."expiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') LIMIT 1`);
  const row=rows[0];
  return row?{user:{id:row.id,username:row.username},recordings:row.recordings.map(r=>({...r,startedAt:new Date(r.startedAt),stoppedAt:r.stoppedAt?new Date(r.stoppedAt):null}))}:null;
}

/** Status polling needs only one fresh authenticated database read. */
export async function processStatusContext(lastId: string | null) {
  const value=(await cookies()).get('cwritel_session')?.value;
  if(!value)return null;
  const token=createHash('sha256').update(value).digest('hex');
  const rows=await processDb().$queryRaw<{
    id:string;username:string;
    active:{id:string;startedAt:string;codingVersion:string;parameters:unknown}|null;
    ended:{id:string;stoppedAt:string|null}|null;
  }[]>`
    SELECT u.id,u.username,
      (SELECT jsonb_build_object('id',r.id,'startedAt',r."startedAt",'codingVersion',r."codingVersion",'parameters',r.parameters) FROM "ProcessRecording" r WHERE r."stoppedAt" IS NULL LIMIT 1) AS active,
      (SELECT jsonb_build_object('id',r.id,'stoppedAt',r."stoppedAt") FROM "ProcessRecording" r WHERE r.id=${lastId&&lastId.length<=80?lastId:null} LIMIT 1) AS ended
    FROM "Session" s JOIN "User" u ON u.id=s."userId"
    WHERE s.token=${token} AND s."expiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') LIMIT 1`;
  const row=rows[0];
  if(!row)return null;
  return {...row,
    active:row.active?{...row.active,startedAt:new Date(row.active.startedAt).toISOString()}:null,
    ended:row.ended?{...row.ended,stoppedAt:row.ended.stoppedAt?new Date(row.ended.stoppedAt).toISOString():null}:null,
  };
}
