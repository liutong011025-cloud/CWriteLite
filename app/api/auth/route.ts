import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { currentUser, publicUser, signIn, signOut } from '@/lib/session';
export async function GET() { const user = await currentUser(); return NextResponse.json({ user: user ? publicUser(user) : null }); }
export async function DELETE() { await signOut(); return NextResponse.json({ success: true }); }
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const username = String(body.username || body.name || '').trim();
        const password = String(body.password || '');
        if (!username || username.length > 40 || password.length < 6 || password.length > 128)
            return NextResponse.json({ error: 'Enter a username and a password of at least 6 characters.' }, { status: 400 });
        let user;
        if (body.action === 'register') {
            if (await prisma.user.findUnique({ where: { username } }))
                return NextResponse.json({ error: 'This username is already taken.' }, { status: 409 });
            user = await prisma.user.create({ data: { username, password: await hash(password, 12), email: String(body.email || '').slice(0, 254) } });
        }
        else {
            user = await prisma.user.findUnique({ where: { username } });
            if (!user || !await compare(password, user.password))
                return NextResponse.json({ error: 'Username or password is incorrect.' }, { status: 401 });
        }
        await signIn(user.id);
        return NextResponse.json({ success: true, user: publicUser(user) });
    }
    catch (error) {
        console.error('POST /api/auth failed', error);
        return NextResponse.json({ error: 'Unable to sign in. Please try again.' }, { status: 500 });
    }
}
