import { NextResponse } from 'next/server';
import { currentProcessUser } from '@/lib/process-auth';
import { activeRecording, controlRecording, recordings, isProcessAdmin, sameOrigin, processDb } from '@/lib/process-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await currentProcessUser(); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const active = await activeRecording();
    const lastId = new URL(request.url).searchParams.get('lastRecordingId');
    const ended = lastId && lastId !== active?.id && lastId.length <= 80 ? await processDb().$queryRaw<{id:string;stoppedAt:Date|null}[]>`SELECT "id","stoppedAt" FROM "ProcessRecording" WHERE "id"=${lastId}` : [];
    const batches = isProcessAdmin(user) && new URL(request.url).searchParams.get('admin') === '1' ? await recordings() : undefined;
    return NextResponse.json({ userId: user.id, active: active ? { id: active.id, startedAt: active.startedAt, codingVersion: active.codingVersion, parameters: active.parameters } : null, ended: ended[0], ...(batches ? { recordings: batches } : {}), serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
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
