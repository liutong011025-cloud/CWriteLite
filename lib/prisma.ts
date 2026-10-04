import { PrismaClient } from '@prisma/client';
const globalDb = globalThis as unknown as {
    liteDb?: PrismaClient;
};
export const prisma = globalDb.liteDb ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production')
    globalDb.liteDb = prisma;
