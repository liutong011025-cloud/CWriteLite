import { PROCESS_PARAMETERS, pauseBand, textDifference, textCode, type ProcessContext, type ProcessOrigin, type ProcessRecord } from './process-coding';

type TextSegment = { field: string; before: string; after: string; start: number; last: number; inputType: string; code?: string; source: string; context: ProcessContext; episodeId: string; segmentIndex: number; precedingGapMs: number };
type DrawSegment = { tool: string; color: string; targetId: string; start: number; last: number; activeMs: number; count: number; context: ProcessContext; episodeId: string; segmentIndex: number };
const uid = () => globalThis.crypto.randomUUID();
const words = (text: string) => text.trim() ? text.trim().split(/\s+/).length : 0;

/** Browser-independent aggregation. Never changes the student's content or interaction. */
export class ProcessEngine {
  context: ProcessContext = { stage: 'farm', workType: 'platform' };
  recordingId: string | null = null;
  waitingRequests = new Set<string>();
  lastActivity: number;
  private lastCode: string | null = null;
  private sequence = 0;
  private hiddenAt: number | null = null;
  private text = new Map<string, TextSegment>();
  private draw: DrawSegment | null = null;
  private strokeAt: number | null = null;
  private strokeMoved = false;
  private strokeAccumulatedAt: number | null = null;
  get drawingActive() { return this.draw !== null; }
  constructor(public sessionId: string, private emit: (event: ProcessRecord) => void, private now = Date.now) { this.lastActivity = now(); }
  start(id: string, at = this.now()) { if (this.recordingId === id) return; this.stop('batch_changed', at); this.recordingId = id; this.lastActivity = at; this.lastCode = null; this.waitingRequests.clear(); }
  stop(reason = 'recording_stopped', cutoff = this.now()) { if (!this.recordingId) return; this.flushAll(reason, cutoff); if (this.hiddenAt !== null) this.put('PAUSE_BACKGROUND', { endReason: reason }, 'student', this.hiddenAt, cutoff); else this.finishPause(null, cutoff); this.recordingId = null; this.hiddenAt = null; }
  private put(code: string, payload: Record<string, unknown>, origin: ProcessOrigin, start: number, end?: number, context = this.context, active?: number) {
    if (!this.recordingId) return;
    this.emit({ eventUid: uid(), recordingId: this.recordingId, sessionId: this.sessionId, sequence: ++this.sequence, code, clientTs: start, ...(end !== undefined ? { clientEndTs: end, durationMs: Math.max(0, end - start) } : {}), ...(active !== undefined ? { activeDurationMs: Math.max(0, active) } : {}), origin, context: { ...context }, payload });
  }
  private finishPause(following: string | null, at: number) {
    if (this.hiddenAt !== null) return;
    const gap = at - this.lastActivity;
    if (gap >= PROCESS_PARAMETERS.pauseMinMs) this.put('PAUSE_INPUT_GAP', { band: pauseBand(gap), precedingEvent: this.lastCode, followingEvent: following, interpretation: 'visible_no_input', waitingRequestIds: [...this.waitingRequests] }, 'student', this.lastActivity, at);
  }
  activity(code: string, at = this.now()) { if (!this.recordingId) return 0; const gap = Math.max(0, at - this.lastActivity); this.finishPause(code, at); this.lastActivity = at; this.lastCode = code; return gap; }
  interval(code: string, payload: Record<string, unknown>, start: number, end: number, origin: ProcessOrigin = 'system') { this.put(code, payload, origin, start, end); }
  event(code: string, payload: Record<string, unknown> = {}, origin: ProcessOrigin = 'student', at = this.now()) {
    if (!this.recordingId) return;
    if (origin === 'student') this.flushAll('next_action', at);
    const gap = origin === 'student' ? this.activity(code, at) : undefined;
    this.put(code, { ...payload, ...(gap !== undefined ? { precedingGapMs: gap } : {}) }, origin, at);
  }
  setContext(next: ProcessContext) {
    const previous = this.context;
    if (JSON.stringify(previous) === JSON.stringify(next)) return;
    this.flushAll('context_changed');
    this.context = { ...next };
    if (previous.stage !== next.stage || previous.workId !== next.workId) this.event('NAV_PAGE', { from: previous.stage, to: next.stage, fromWorkId: previous.workId, toWorkId: next.workId });
  }
  input(field: string, before: string, after: string, options: { inputType?: string; code?: string; source?: string } = {}, at = this.now()) {
    if (!this.recordingId || before === after) return;
    const old = this.text.get(field);
    const gap = this.activity(options.code || textCode(before, after, options.inputType), at);
    if (old && (old.source !== (options.source || 'student_typed') || old.inputType === 'insertFromPaste' || options.inputType === 'insertFromPaste')) this.flushText(field, 'input_source_changed');
    const current = this.text.get(field);
    if (current) { current.after = after; current.last = at; if (options.inputType?.startsWith('delete')) current.inputType = 'deleteContent'; }
    else this.text.set(field, { field, before, after, start: at, last: at, inputType: options.inputType || '', code: options.code, source: options.source || 'student_typed', context: { ...this.context }, episodeId: uid(), segmentIndex: 0, precedingGapMs: gap });
    if (options.inputType === 'insertFromPaste') this.flushText(field, 'paste_completed', at);
  }
  flushText(field: string, reason: string, cutoff = this.now(), continued = false) {
    const s = this.text.get(field); if (!s) return;
    this.text.delete(field);
    if (s.before !== s.after) this.put(s.code || textCode(s.before, s.after, s.inputType, s.source === 'ai_generated'||s.source==='mixed_ai_student'), { field: s.field, beforeText: s.before, afterText: s.after, ...textDifference(s.before, s.after), beforeWords: words(s.before), afterWords: words(s.after), contentSource: s.inputType === 'insertFromPaste' ? 'paste_unknown' : s.source, inputType: s.inputType, episodeId: s.episodeId, segmentIndex: s.segmentIndex, precedingGapMs: s.precedingGapMs, endReason: reason, ...(s.last > cutoff ? {cutoffClipped:true,contentExtendsBeyondCutoff:true,originalClientEndTs:s.last} : {}) }, 'student', s.start, Math.min(s.last, cutoff), s.context);
    // A later keystroke starts a new statistical segment, with the same episode when continuous.
    if (continued) this.text.set(field, { ...s, before: s.after, after: s.after, start: cutoff, last: cutoff, segmentIndex: s.segmentIndex + 1, precedingGapMs: 0 });
  }
  strokeStart(tool: string, color: string, targetId: string, at = this.now()) {
    if (!this.recordingId) return;
    if (this.draw && (this.draw.tool !== tool || this.draw.color !== color || this.draw.targetId !== targetId || at - this.draw.last >= PROCESS_PARAMETERS.drawingIdleMs)) this.flushDraw('drawing_boundary', at);
    this.activity(tool === 'eraser' ? 'REV_DRAW_EPISODE' : 'PW_DRAW_EPISODE', at);
    if (!this.draw) this.draw = { tool, color, targetId, start: at, last: at, activeMs: 0, count: 0, context: { ...this.context }, episodeId: uid(), segmentIndex: 0 };
    this.strokeAt = at; this.strokeAccumulatedAt = at; this.strokeMoved = false;
  }
  strokeMove(at = this.now()) { if (!this.recordingId || this.strokeAt === null || !this.draw) return; this.strokeMoved = true; this.draw.last = at; this.lastActivity = at; }
  strokeEnd(cancelled = false, at = this.now()) {
    if (!this.draw || this.strokeAt === null) return;
    if (this.strokeMoved) { this.draw.count++; this.draw.activeMs += Math.max(0, at - (this.strokeAccumulatedAt ?? at)); this.draw.last = at; this.lastActivity = at; }
    this.strokeAt = null; this.strokeAccumulatedAt = null; this.strokeMoved = false;
    if (cancelled) this.flushDraw('pointer_cancelled', at);
  }
  flushDraw(reason: string, cutoff = this.now(), continued = false) {
    const s = this.draw; if (!s) return;
    if (this.strokeAt !== null && this.strokeMoved) { s.activeMs += Math.max(0, cutoff - (this.strokeAccumulatedAt ?? cutoff)); this.strokeAccumulatedAt = cutoff; s.last = Math.min(cutoff, this.now()); }
    if (s.count || s.activeMs) this.put(s.tool === 'eraser' ? 'REV_DRAW_EPISODE' : 'PW_DRAW_EPISODE', { targetId: s.targetId, tool: s.tool, color: s.color, penStrokeCount: s.tool === 'eraser' ? 0 : s.count, eraserStrokeCount: s.tool === 'eraser' ? s.count : 0, continuingStroke: this.strokeAt !== null, episodeId: s.episodeId, segmentIndex: s.segmentIndex, endReason: reason }, 'student', s.start, Math.min(s.last, cutoff), s.context, s.activeMs);
    if (continued) this.draw = { ...s, start: cutoff, last: cutoff, count: 0, activeMs: 0, segmentIndex: s.segmentIndex + 1 };
    else { this.draw = null; this.strokeAt = null; this.strokeAccumulatedAt = null; this.strokeMoved = false; }
  }
  tick(at = this.now()) {
    for (const [key, s] of this.text) {
      if (at - s.last >= PROCESS_PARAMETERS.inputIdleMs) this.flushText(key, 'input_idle', at);
      else if (at - s.start >= PROCESS_PARAMETERS.inputSegmentMs) this.flushText(key, 'segment_limit', at, true);
    }
    if (this.draw) {
      if (this.strokeAt === null && at - this.draw.last >= PROCESS_PARAMETERS.drawingIdleMs) this.flushDraw('drawing_idle', at);
      else if (at - this.draw.start >= PROCESS_PARAMETERS.drawingSegmentMs) this.flushDraw('segment_limit', at, true);
    }
  }
  visibility(hidden: boolean, at = this.now()) {
    if (!this.recordingId) return;
    this.flushAll(hidden ? 'page_hidden' : 'page_visible', at);
    if (hidden && this.hiddenAt === null) { this.finishPause('PAUSE_BACKGROUND', at); this.hiddenAt = at; }
    if (!hidden && this.hiddenAt !== null) { this.put('PAUSE_BACKGROUND', { endReason: 'page_visible' }, 'student', this.hiddenAt, at); this.hiddenAt = null; this.lastActivity = at; }
  }
  flushAll(reason = 'flush', at = this.now()) { for (const key of this.text.keys()) this.flushText(key, reason, at); this.flushDraw(reason, at); }
}
