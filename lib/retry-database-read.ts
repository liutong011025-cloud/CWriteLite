/** A closed pooled connection can be replaced on the next read. Never wrap writes or transactions. */
export async function retryDatabaseRead<T>(read: () => Promise<T>,
    wait: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))) {
    for (let attempt = 0; ; attempt++) {
        try { return await read(); }
        catch (error) {
            const code = error && typeof error === 'object'
                ? (error as { code?: unknown; errorCode?: unknown }).code ?? (error as { errorCode?: unknown }).errorCode
                : undefined;
            if (attempt >= 2 || code !== 'P1017') throw error;
            await wait(150 * 2 ** attempt + Math.floor(Math.random() * 150));
        }
    }
}
