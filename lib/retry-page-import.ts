/** Retry interrupted chunk downloads without reloading the student's draft. */
export async function retryPageImport<T>(load: () => Promise<T>, attempts = 3): Promise<T> {
    for (let attempt = 0; ; attempt++) {
        try { return await load(); }
        catch (error) {
            const interrupted = error instanceof Error && /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(error.name + ' ' + error.message);
            if (!interrupted || attempt + 1 >= attempts) throw error;
            await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
        }
    }
}
