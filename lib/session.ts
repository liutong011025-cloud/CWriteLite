import { cookies } from 'next/headers';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from './prisma';
export async function currentUser() {
    const value = (await cookies()).get('cwritel_session')?.value;
    if (!value)
        return null;
    const session = await prisma.session.findUnique({ where: { token: createHash('sha256').update(value).digest('hex') }, include: { user: true } });
    return session && session.expiresAt > new Date() ? session.user : null;
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
