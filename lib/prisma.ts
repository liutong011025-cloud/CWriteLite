import { PrismaClient } from '@prisma/client';
import { runtimeDatabaseUrl, WRITING_TRANSACTION_OPTIONS } from './database-config';
const globalDb = globalThis as unknown as {
    liteDb?: PrismaClient;
    litePoolVersion?: string;
};
if (globalDb.liteDb && globalDb.litePoolVersion !== 'pooled-v1') {
    void globalDb.liteDb.$disconnect().catch(() => {});
    globalDb.liteDb = undefined;
}
const url = runtimeDatabaseUrl(process.env.DATABASE_URL);
if (!globalDb.liteDb) console.info('database_pool_initialized', { pool: 'writing', pooledPrismaPostgres: url ? new URL(url).hostname === 'pooled.db.prisma.io' : false });
export const prisma = globalDb.liteDb ?? new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    transactionOptions: WRITING_TRANSACTION_OPTIONS,
});
globalDb.liteDb = prisma;
globalDb.litePoolVersion = 'pooled-v1';
