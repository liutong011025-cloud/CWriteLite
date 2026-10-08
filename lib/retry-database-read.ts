/** Retry only failed connections before a read; never wrap writes or transactions. */
export async function retryDatabaseRead<T>(read: () => Promise<T>,
    wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
    for (let attempt = 0; ; attempt++) {
        try { return await read(); }
        catch (error) {
            const code = error && typeof error === 'object'
                ? (error as { code?: unknown; errorCode?: unknown }).code ?? (error as { errorCode?: unknown }).errorCode
                : undefined;
            if (attempt >= 2 || !['P1017', 'P1001', 'P1002'].includes(String(code))) throw error;
            // Cold function instances can race to establish their first connection.
            // Spread reconnections out; do not retry an exhausted query queue (P2024).
            const base = code === 'P1017' ? 150 : 700;
            await wait(base * 2 ** attempt + Math.floor(Math.random() * base));
        }
    }
}
