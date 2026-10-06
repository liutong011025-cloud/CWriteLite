import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/session';
import { PROCESS_CATALOG, type ProcessRecord } from '@/lib/process-coding';
import { processDb, Prisma, sameOrigin, type Recording } from '@/lib/process-store';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  const user = await currentUser(); if (!user) return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Invalid origin.' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 1500000) return NextResponse.json({ error: 'Recording batch is too large.' }, { status: 413 });
    const text = await request.text(); if (text.length > 1500000) return NextResponse.json({ error: 'Recording batch is too large.' }, { status: 413 });
    const body = JSON.parse(text); if (!Array.isArray(body.events) || body.events.length > 50 || body.events.some((e:unknown)=>!e||typeof e!=='object')) return NextResponse.json({ error: 'Invalid recording batch.' }, { status: 400 });
    if (body.expectedUserId !== user.id) return NextResponse.json({ error: 'Recording owner changed. Retry when the original account logs in.' }, { status: 409 });
    const events = body.events as ProcessRecord[], ids = [...new Set(events.map(e => e.recordingId).filter(id => typeof id === 'string' && id.length <= 80))];
    if (!ids.length) return NextResponse.json({ acknowledgedIds: [], rejectedIds: events.map(e => e.eventUid) });
    const batches = await processDb().$queryRaw<Recording[]>(Prisma.sql`SELECT * FROM "ProcessRecording" WHERE "id" IN (${Prisma.join(ids)})`);
    const map = new Map(batches.map(b => [b.id, b]));
    const accepted: string[] = [], rejected: string[] = [], values: Prisma.Sql[] = [];
    for (const event of events) {
      const d = PROCESS_CATALOG[event.code], b = map.get(event.recordingId), c = event.context;
      if (!d || d.category === 'admin' || !b || !/^[a-zA-Z0-9_-]{10,100}$/.test(event.eventUid || '') || !c || !Number.isInteger(event.sequence) || event.sequence < 1 || event.sequence > 2147483647 || typeof event.sessionId !== 'string' || event.sessionId.length > 100 || !Number.isFinite(event.clientTs) || event.clientTs < b.startedAt.getTime() || event.clientTs > Date.now() + 60000 || b.stoppedAt && event.clientTs > b.stoppedAt.getTime()) { rejected.push(event.eventUid); continue; }
      if (!['student','system','auto_agent','platform_gate'].includes(event.origin)) { rejected.push(event.eventUid); continue; }
      const payload = JSON.stringify(event.payload || {}); if (payload.length > 900000) { rejected.push(event.eventUid); continue; }
      const end = Number.isFinite(event.clientEndTs) ? Math.max(event.clientTs, Math.min(event.clientEndTs!, b.stoppedAt?.getTime() ?? Date.now() + 60000)) : null;
      const duration = end === null ? null : Math.min(2147483647, Math.max(0, Math.round(end - event.clientTs)));
      const active = Number.isFinite(event.activeDurationMs) ? Math.min(duration ?? 2147483647, Math.max(0, Math.round(event.activeDurationMs!))) : null;
      const enriched = { ...event.payload, ...c, ...(event.clientEndTs && end !== event.clientEndTs ? { cutoffClipped: true, originalClientEndTs: event.clientEndTs } : {}), ...(user.username === 'Tony' ? { participantMode: 'admin_demo' } : {}) };
      accepted.push(event.eventUid);
      values.push(Prisma.sql`(${event.eventUid},${event.recordingId},${user.id},${user.username},${event.sessionId},${event.sequence},${'LITE_'+d.code},${d.code},${d.category},${d.subcategory},${String(c.stage || '').slice(0,80)},${c.workId ? String(c.workId).slice(0,100) : null},${['story','drama'].includes(c.workType || '') ? c.workType : 'platform'},${event.origin},${new Date(event.clientTs)},${end === null ? null : new Date(end)},${duration},${active},${JSON.stringify(enriched)}::jsonb)`);
    }
    if (values.length) await processDb().$executeRaw(Prisma.sql`INSERT INTO "ProcessEvent" ("eventUid","recordingId","userId","username","sessionId","sequence","eventId","functionalCode","category","subcategory","stage","workId","workType","origin","clientTs","clientEndTs","durationMs","activeDurationMs","payload") VALUES ${Prisma.join(values)} ON CONFLICT ("eventUid") DO NOTHING`);
    return NextResponse.json({ acknowledgedIds: accepted, rejectedIds: rejected });
  } catch { return NextResponse.json({ error: 'Recording upload unavailable. Your writing is unaffected.' }, { status: 503 }); }
}
