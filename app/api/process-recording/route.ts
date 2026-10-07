import { NextResponse } from 'next/server';
import { currentProcessUser, processStatusContext } from '@/lib/process-auth';
import { controlRecording, recordings, isProcessAdmin, sameOrigin } from '@/lib/process-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const lastId = new URL(request.url).searchParams.get('lastRecordingId');
    const user = await processStatusContext(lastId); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const {active}=user;
    const ended=lastId&&lastId!==active?.id?user.ended||undefined:undefined;
    const batches = isProcessAdmin(user) && new URL(request.url).searchParams.get('admin') === '1' ? await recordings() : undefined;
    return NextResponse.json({ userId: user.id, active, ended, ...(batches ? { recordings: batches } : {}), serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { console.error('GET /api/process-recording failed', error); return NextResponse.json({ error: 'Behavior recording is temporarily unavailable. Writing remains available.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const user = await currentProcessUser(); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    if (!isProcessAdmin(user) || !sameOrigin(request)) return NextResponse.json({ error: 'Tony access required.' }, { status: 403 });
    const body = await request.json(); if (!['start', 'stop'].includes(body.action)) return NextResponse.json({ error: 'Unknown recording action.' }, { status: 400 });
    const recording = await controlRecording(body.action, user.username, user.id);
    return NextResponse.json({ recording, active: recording && !recording.stoppedAt ? recording : null, serverNow: Date.now() });
  } catch (error) { console.error('POST /api/process-recording failed', error); return NextResponse.json({ error: 'Could not change behavior recording. Please try again. Writing remains available.' }, { status: 503 }); }
}
