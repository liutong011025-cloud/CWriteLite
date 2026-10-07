import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { processDb } from './process-store';

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
