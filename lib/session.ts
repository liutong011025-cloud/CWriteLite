import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma';
import type { User } from '@prisma/client';
export async function sessionToken() {
    const value = (await cookies()).get('cwritel_session')?.value;
    return value ? createHash('sha256').update(value).digest('hex') : null;
}
export async function currentUser(db = prisma) {
    const token = await sessionToken();
    if (!token) return null;
    // A fresh join checks revocation and expiry without two sequential ORM reads.
    const users = await db.$queryRaw<User[]>`
        SELECT u.* FROM "Session" s JOIN "User" u ON u.id=s."userId"
        WHERE s.token=${token} AND s."expiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') LIMIT 1`;
    return users[0] || null;
}
export async function signIn(userId: string) {
    const value = randomBytes(32).toString('hex');
    await prisma.session.create({ data: { token: createHash('sha256').update(value).digest('hex'), userId, expiresAt: new Date(Date.now() + 7 * 86400000) } });
    (await cookies()).set('cwritel_session', value, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 604800 });
}
export async function signOut() {
    const value = (await cookies()).get('cwritel_session')?.value;
    if (value)
        await prisma.session.deleteMany({ where: { token: createHash('sha256').update(value).digest('hex') } });
    (await cookies()).delete('cwritel_session');
}
export function publicUser(user: {
    id: string;
    username: string;
    role: string;
}) { return { id: user.id, username: user.username, role: user.role }; }
