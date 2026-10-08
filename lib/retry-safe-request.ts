function safeToRepeat(path: string, body: unknown) {
    if (body === undefined) return path === '/api/auth' || path === '/api/data';
    if (!body || typeof body !== 'object') return false;
    const request = body as { action?: unknown; story?: { id?: unknown; status?: unknown; stage?: unknown } };
    return (path === '/api/auth' && request.action === 'login') ||
        (path === '/api/data' && request.action === 'saveStory' && typeof request.story?.id === 'string' && !!request.story.id &&
            request.story.status !== 'published' && request.story.stage !== 'finish' && request.story.stage !== 'drama-finish');
}

function networkFailure(error: unknown) {
    if (!(error instanceof Error)) return false;
    return (error.name === 'TypeError' || error.name === 'NetworkError') &&
        /failed to fetch|fetch failed|network ?error|network request failed|load failed|network connection was lost/i.test(error.message);
}

/** Retrying the same draft ID is safe. Creation, deletion and paid AI calls never repeat here. */
export async function retrySafeRequest<T>(path: string, body: unknown, send: () => Promise<T>,
    wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
    for (let attempt = 0; ; attempt++) {
        try { return await send(); }
        catch (error) {
            if (attempt >= 2 || !safeToRepeat(path, body) || !networkFailure(error)) throw error;
            await wait(600 * 2 ** attempt + Math.floor(Math.random() * 300));
        }
    }
}
