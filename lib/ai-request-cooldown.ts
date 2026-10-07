const requests = new Map<string, { any: number; kinds: Map<string, number> }>();
const specificKinds = new Set(['dramaTips', 'canvasReview', 'dramaReview', 'dramaVideoPlan']);

/** Keep the duplicate-click guard when optional database history is temporarily unavailable. */
export function claimAiRequest(userId: string, kind: string, now = Date.now()) {
    const previous = requests.get(userId);
    const last = specificKinds.has(kind) ? previous?.kinds.get(kind) : previous?.any;
    if (kind !== 'growth' && last !== undefined && now - last < 1500) return false;
    if (requests.size >= 10000) {
        for (const [id, value] of requests) if (now - value.any >= 1500) requests.delete(id);
        if (requests.size >= 10000) requests.delete(requests.keys().next().value!);
    }
    const entry = previous || { any: now, kinds: new Map<string, number>() };
    entry.any = now; entry.kinds.set(kind, now); requests.set(userId, entry);
    return true;
}
