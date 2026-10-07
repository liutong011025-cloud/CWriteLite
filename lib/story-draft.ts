import { randomUUID } from 'node:crypto';
import { Prisma, type Story } from '@prisma/client';
import { prisma } from './prisma';

type DraftData = {
    title: string; stage: string; characterIds: string[]; characterSnapshots: Prisma.InputJsonValue;
    canvas: Prisma.InputJsonValue; sections: Prisma.InputJsonValue; activeSection: number; content: string;
};

/** One atomic statement keeps the draft and its revision together without an interactive transaction queue. */
export async function saveDraft(userId: string, storyId: string, data: DraftData) {
    const ids = data.characterIds.length ? Prisma.sql`ARRAY[${Prisma.join(data.characterIds)}]::text[]` : Prisma.sql`ARRAY[]::text[]`;
    const sections = JSON.stringify(data.sections);
    const rows = await prisma.$queryRaw<Story[]>(Prisma.sql`
        WITH owned AS MATERIALIZED (
            SELECT id,sections FROM "Story" WHERE id=${storyId} AND "userId"=${userId} FOR UPDATE
        ), revision AS (
            INSERT INTO "Revision" (id,"storyId",sections,"createdAt")
            SELECT ${randomUUID()},id,${sections}::jsonb,(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
            FROM owned WHERE sections IS DISTINCT FROM ${sections}::jsonb RETURNING id
        )
        UPDATE "Story" s SET title=${data.title},status='draft',stage=${data.stage},
            "characterIds"=${ids},"characterSnapshots"=${JSON.stringify(data.characterSnapshots)}::jsonb,
            canvas=${JSON.stringify(data.canvas)}::jsonb,sections=${sections}::jsonb,
            "activeSection"=${data.activeSection},content=${data.content},"updatedAt"=(CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
        FROM owned WHERE s.id=owned.id RETURNING s.*`);
    return rows[0] || null;
}
