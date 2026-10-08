/** Only Prisma Postgres' documented direct hostname is changed. Migration URLs stay untouched. */
export function runtimeDatabaseUrl(value: string | undefined, pool: 'writing' | 'recording' = 'writing') {
  if (!value) return undefined;
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) return value;
  if (url.hostname === 'db.prisma.io') url.hostname = 'pooled.db.prisma.io';
  if (pool === 'recording') {
    url.searchParams.set('connection_limit', '6');
    url.searchParams.set('pool_timeout', '10');
  } else {
    if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '5');
    if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10');
  }
  return url.toString();
}

// Short, database-only transactions need enough time for several remote round trips.
export const WRITING_TRANSACTION_OPTIONS = { maxWait: 5000, timeout: 15000 };
