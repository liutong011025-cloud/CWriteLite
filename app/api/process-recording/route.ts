import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { activeRecording, controlRecording, recordings, isProcessAdmin, sameOrigin, processDb } from '@/lib/process-store';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  try {
    const user = await currentUser(processDb()); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const active = await activeRecording();
    const lastId = new URL(request.url).searchParams.get('lastRecordingId');
    const ended = lastId && lastId.length <= 80 ? await processDb().$queryRaw<{id:string;stoppedAt:Date|null}[]>`SELECT "id","stoppedAt" FROM "ProcessRecording" WHERE "id"=${lastId}` : [];
    const batches = isProcessAdmin(user) && new URL(request.url).searchParams.get('admin') === '1' ? await recordings() : undefined;
    return NextResponse.json({ userId: user.id, active: active ? { id: active.id, startedAt: active.startedAt, codingVersion: active.codingVersion, parameters: active.parameters } : null, ended: ended[0], ...(batches ? { recordings: batches } : {}), serverNow: Date.now() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch { return NextResponse.json({ active: null, error: 'Behavior recording is unavailable. Writing remains available. Apply the database migration if this is a new deployment.' }, { status: 503 }); }
}
export async function POST(request: Request) {
  try {
    const user = await currentUser(processDb()); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    if (!isProcessAdmin(user) || !sameOrigin(request)) return NextResponse.json({ error: 'Tony access required.' }, { status: 403 });
    const body = await request.json(); if (!['start', 'stop'].includes(body.action)) return NextResponse.json({ error: 'Unknown recording action.' }, { status: 400 });
    const recording = await controlRecording(body.action, user.username, user.id);
    return NextResponse.json({ recording, active: recording && !recording.stoppedAt ? recording : null, serverNow: Date.now() });
  } catch { return NextResponse.json({ error: 'Could not change behavior recording. Please try again. Writing remains available.' }, { status: 503 }); }
}
