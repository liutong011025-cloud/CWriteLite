import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { processDb } from './process-store';

type Observation = { userId: string; storyId?: string | null; type: string; payload: Prisma.InputJsonValue };

/** Optional telemetry uses the recording pool and cannot turn a successful student action into an error. */
export async function recordObservation(data: Observation) {
    const id = randomUUID();
    try {
        await processDb().researchEvent.create({ data: { ...data, id } });
    } catch (error) {
        console.warn('optional_research_event_failed', {
            type: data.type,
            code: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'unavailable',
        });
    }
    return { id };
}
