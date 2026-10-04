import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { prisma } from '@/lib/prisma';
export async function POST() { const u = await currentUser(); if (!u)
    return NextResponse.json({ error: 'Please log in.' }, { status: 401 }); await prisma.workReview.updateMany({ where: { authorUsername: u.username, readAt: null }, data: { readAt: new Date() } }); return NextResponse.json({ success: true }); }
