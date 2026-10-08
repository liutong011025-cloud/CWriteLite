import { prisma } from './prisma';
import { sessionToken } from './session';
import type { Prisma } from '@prisma/client';

type StudentData = {
    user: { id: string; username: string; role: string };
    characters: Prisma.JsonValue[];
    stories: Prisma.JsonValue[];
    profile: Prisma.JsonValue;
    mapState: Prisma.JsonValue;
    vocabulary: Prisma.JsonValue;
};

/** One authenticated snapshot avoids four network round trips during a class login burst. */
export async function studentData() {
    const token = await sessionToken();
    if (!token) return null;
    const rows = await prisma.$queryRaw<{ data: StudentData }[]>`
        SELECT jsonb_build_object(
            'user',jsonb_build_object('id',u.id,'username',u.username,'role',u.role),
            'profile',u.profile,'mapState',u."mapState",'vocabulary',u.vocabulary,
            'characters',COALESCE((
                SELECT jsonb_agg(to_jsonb(c) || jsonb_build_object(
                    'createdAt',to_char(c."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                    'updatedAt',to_char(c."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
                    ORDER BY c."createdAt" DESC)
                FROM "Character" c WHERE c."userId"=u.id),'[]'::jsonb),
            'stories',COALESCE((
                SELECT jsonb_agg(to_jsonb(w) || jsonb_build_object(
                    'characterIds',COALESCE(to_jsonb(w."characterIds"),'[]'::jsonb),
                    'createdAt',to_char(w."createdAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
                    'updatedAt',to_char(w."updatedAt",'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
                    ORDER BY w."updatedAt" DESC)
                FROM "Story" w WHERE w."userId"=u.id),'[]'::jsonb)
        ) AS data
        FROM "Session" s JOIN "User" u ON u.id=s."userId"
        WHERE s.token=${token} AND s."expiresAt">(CURRENT_TIMESTAMP AT TIME ZONE 'UTC') LIMIT 1`;
    return rows[0]?.data || null;
}
