import { NextResponse } from 'next/server';
import { databaseUnavailable } from '@/lib/database-error';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { currentUser, publicUser } from '@/lib/session';
import { studentData } from '@/lib/student-data';
import { recordObservation } from '@/lib/research-log';
import { saveDraft } from '@/lib/story-draft';
import { chat } from '@/lib/deepseek';
import { approvedSections } from '@/lib/section-gate';
import type { Story } from '@/lib/types';
import { blankDramaScene, dramaProblems, dramaSections, isDrama, normalizeDrama, writingType } from '@/lib/drama';
import {mapWithoutDraft} from '@/lib/draft-recap';
import {freeMapPoint} from '@/lib/map-markers';
import {hostedPicture} from '@/lib/sprite';
import {removeBackground} from '@/lib/fal-images';
import {claimAsset,finishAsset,failAsset} from '@/lib/asset-generation';
import {localPreviewEnabled} from '@/lib/local-preview';
const json = (value: unknown) => value as Prisma.InputJsonValue;
type Context = {
    params: Promise<{
        resource: string;
    }>;
};
export async function GET(request: Request, context: Context) {
    try {
    const { resource } = await context.params;
    if (resource === 'data') {
        const data = await studentData();
        return data ? NextResponse.json(data) : NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    }
    const user = await currentUser();
    if (!user)
        return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const url = new URL(request.url);
    if (resource === 'user-profile') {
        const target = url.searchParams.get('user_id');
        const u = target && target !== user.username ? await prisma.user.findUnique({ where: { username: target } }) : user;
        const p = (u?.profile || {}) as Record<string, unknown>;
        const shared = u?.id === user.id ? p : { avatarUrl: p.avatarUrl, avatarEmoji: p.avatarEmoji, trees: p.trees, treeGrowthDetails: p.treeGrowthDetails };
        return NextResponse.json({ success: true, ...shared, username: u?.username, trees: p.trees || Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 })) });
    }
    if (resource === 'user-map-state') {
        const name = url.searchParams.get('user_id');
        const u = name && name !== user.username ? await prisma.user.findUnique({ where: { username: name } }) : user;
        return NextResponse.json({ success: true, state: u?.mapState || {}, mapState: u?.mapState || {} });
    }
    if (resource === 'user-works') {
        const name = url.searchParams.get('user_id') || user.username;
        const u = await prisma.user.findUnique({ where: { username: name } });
        const stories = u ? await prisma.story.findMany({ where: { userId: u.id, status:'published' }, orderBy: { updatedAt: 'desc' } }) : [];
        return NextResponse.json({ stories: stories.map(s => ({ ...s, workType:writingType(s as unknown as Story), character: { name: s.title }, timestamp: s.updatedAt, interactionId: s.id })), reviews: [], letters: [] });
    }
    if (resource === 'reviews') {
        const name = url.searchParams.get('user_id') || user.username;
        const reviews = await prisma.workReview.findMany({ where: { authorUsername: name }, orderBy: { createdAt: 'desc' } });
        return NextResponse.json({ reviews: reviews.map(r => ({ ...r, createdAt: r.createdAt.getTime(), readAt: r.readAt?.getTime() || null })), unreadCount: reviews.filter(r => !r.readAt).length });
    }
    if (resource === 'users') {
        const users = await prisma.user.findMany({ select: { username: true, profile: true }, where: { id: { not: user.id } } });
        return NextResponse.json({ users: users.map(u => { const p = u.profile as Record<string, unknown>; return { username: u.username, profile: { avatarUrl: p.avatarUrl, avatarEmoji: p.avatarEmoji } }; }) });
    }
    if (resource === 'research') {
        if (user.role !== 'teacher')
            return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
        return NextResponse.json({ events: await prisma.researchEvent.findMany({ orderBy: { createdAt: 'asc' }, take: 10000 }), stories: await prisma.story.findMany({ include: { revisions: true } }) });
    }
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
    } catch (error) {
        console.error('Lite data read failed', error instanceof Error ? error.message : 'error');
        return NextResponse.json({ error: 'Could not load. Please try again.', ...(databaseUnavailable(error) ? { code: 'DATABASE_UNAVAILABLE' } : {}) }, { status: databaseUnavailable(error) ? 503 : 500 });
    }
}
export async function POST(request: Request, context: Context) {
    try {
    const user = await currentUser();
    if (!user)
        return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const { resource } = await context.params;
        const b = await request.json();
        if (resource === 'data') {
            if (b.action === 'guideSeen' && b.screen === 'canvas') {
                const profile = await prisma.$transaction(async tx => {
                    const fresh = await tx.user.findUniqueOrThrow({ where: { id: user.id } });
                    const previous = (fresh.profile || {}) as Record<string, unknown>;
                    const guideSeen = (previous.guideSeen || {}) as Record<string, unknown>;
                    const next = { ...previous, guideSeen: { ...guideSeen, canvas: true } };
                    await tx.user.update({ where: { id: user.id }, data: { profile: json(next) } });
                    return next;
                });
                return NextResponse.json({ profile });
            }
            if (b.action === 'saveCharacter') {
                const d = b.character || {};
                const name = String(d.name || '').trim().slice(0, 80);
                if (!name)
                    return NextResponse.json({ error: 'Give your character a name.' }, { status: 400 });
                const spriteUrl = hostedPicture(String(d.spriteUrl || '')) ? String(d.spriteUrl) : '';
                const data = { name, species: String(d.species || '').slice(0, 60), age: String(d.age || '').slice(0, 20), appearance: String(d.appearance || '').slice(0, 1000), traits: String(d.traits || '').slice(0, 1000), background: String(d.background || '').slice(0, 1000), strength: String(d.strength || '').slice(0, 1000), challenge: String(d.challenge || '').slice(0, 1000), imageUrl: String(d.imageUrl || ''), spriteUrl, sketch: String(d.sketch || '') };
                if (data.sketch.length > 3000000)
                    return NextResponse.json({ error: 'Drawing is too large.' }, { status: 400 });
                if (data.imageUrl.length > 3000000 || data.imageUrl && !/^https:\/\//.test(data.imageUrl) && !/^\/dramacharacter\//.test(data.imageUrl) && !/^data:image\/png;base64,/.test(data.imageUrl))
                    return NextResponse.json({ error: 'Invalid portrait.' }, { status: 400 });
                if (d.id && !await prisma.character.findFirst({ where: { id: d.id, userId: user.id } }))
                    return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
                // A stable per-creation key makes double clicks and network retries safe.
                const key = String(b.creationKey || '').slice(0, 160);
                const pack = b.source === 'ideaPack' && data.imageUrl.startsWith('/dramacharacter/');
                // Reuse the adopted card even when the student has edited its traits.
                const existingPack = pack ? await prisma.character.findFirst({ where: { userId: user.id, name: data.name, imageUrl: { in: [data.imageUrl, encodeURI(data.imageUrl)] } }, orderBy: { createdAt: 'asc' } }) : null;
                const token = pack ? JSON.stringify(data) : key;
                const creationId = token ? 'card_' + createHash('sha256').update(user.id + ':' + token).digest('hex') : undefined;
                let character;
                try {
                    character = d.id ? await prisma.character.update({ where: { id: d.id }, data }) : existingPack || (creationId
                        ? await prisma.character.upsert({ where: { id: creationId }, update: {}, create: { id: creationId, ...data, userId: user.id } })
                        : await prisma.character.create({ data: { ...data, userId: user.id } }));
                } catch (error) {
                    // Prisma may emulate upsert: the losing concurrent insert reads the winner.
                    if (!d.id && creationId && error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
                        character = await prisma.character.findFirst({ where: { id: creationId, userId: user.id } });
                    if (!character) throw error;
                }
                return NextResponse.json({ character });
            }
            if (b.action === 'ensureSprite') {
                const character = await prisma.character.findFirst({ where: { id: String(b.id), userId: user.id } });
                if (!character) return NextResponse.json({ error: 'Character not found.' }, { status: 404 });
                if(localPreviewEnabled())return NextResponse.json({character,spriteStatus:'skipped',mock:true});
                if (character.spriteUrl) return NextResponse.json({ character, spriteStatus: 'ready' });
                if (!hostedPicture(character.imageUrl)) return NextResponse.json({ character, spriteStatus: 'skipped' });
                const claimId=`sprite:${user.id}:${character.id}:${createHash('sha256').update(character.imageUrl).digest('hex')}`;
                const claim=await claimAsset(claimId);
                if(!claim.claimed&&!claim.imageUrl)return NextResponse.json({character,spriteStatus:'processing'});
                try {
                    const spriteUrl = claim.imageUrl || await removeBackground(character.imageUrl);
                    if(claim.claimed)await finishAsset(claimId,spriteUrl);
                    await prisma.character.updateMany({ where: { id: character.id, userId: user.id, imageUrl:character.imageUrl, spriteUrl: '' }, data: { spriteUrl } });
                    const saved = await prisma.character.findFirst({ where: { id: character.id, userId: user.id } });
                    return NextResponse.json({ character: saved, spriteStatus: saved?.spriteUrl ? 'ready' : 'failed' });
                }
                catch (error) {
                    if(claim.claimed)await failAsset(claimId);
                    console.error('Sprite retry failed:', error instanceof Error ? error.message : 'error');
                    return NextResponse.json({ character, spriteStatus: 'failed' });
                }
            }
            if (b.action === 'deleteCharacter') {
                await prisma.character.deleteMany({ where: { id: String(b.id), userId: user.id } });
                return NextResponse.json({ success: true });
            }
            if (b.action === 'newStory') {
                const drama = b.writingType === 'drama';
                const pin = b.pin && Number.isFinite(b.pin.x) && Number.isFinite(b.pin.y) ? {x:Math.max(0,Math.min(100,b.pin.x)),y:Math.max(0,Math.min(100,b.pin.y))} : null;
                const story = await prisma.story.create({ data: { userId: user.id, characterIds:[], title:drama?'Untitled drama':'Untitled adventure', stage:drama?'drama-scenes':'characters', canvas:json(drama?{nodes:[],edges:[],writingType:'drama',drama:{mode:'tableau',scenes:[blankDramaScene(crypto.randomUUID())],activeScene:0}}:{nodes:[],edges:[],writingType:'story'}), pin: pin ? json(pin) : undefined, chapterIndex: Math.max(0, Number(b.chapterIndex) || 0) } });
                return NextResponse.json({ story });
            }
            if (b.action === 'saveStory') {
                const old = await prisma.story.findFirst({ where: { id: String(b.story?.id), userId: user.id } });
                if (!old)
                    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
                const d = b.story;
                const drama = isDrama(old as unknown as Story);
                const ids = Array.isArray(d.characterIds) ? d.characterIds.filter((x: unknown) => typeof x === 'string').slice(0, 20) : old.characterIds;
                const owned = ids.length ? await prisma.character.findMany({ where: { id: { in: ids }, userId: user.id } }) : [];
                const snapshots = (old.characterSnapshots as unknown as {
                    id: string;
                }[]);
                const characterSnapshots = ids.map((id: string) => snapshots.find(c => c.id === id) || owned.find(c => c.id === id)).filter(Boolean);
                const canvas = drama ? {...(old.canvas as object),writingType:'drama',drama:normalizeDrama(d.canvas?.drama,characterSnapshots)} : {...(d.canvas || old.canvas),writingType:'story',drama:undefined};
                // Prisma JSON cannot contain undefined; strip the incompatible branch.
                if(!drama) delete canvas.drama;
                const sections = drama ? dramaSections(canvas,characterSnapshots) : Array.from({ length: 5 }, (_, i) => String(d.sections?.[i] || '').slice(0, 30000));
                const data = { title: String(d.title ?? old.title).slice(0, 120), status: d.status === 'published' ? 'published' : 'draft', stage: (drama?['drama-scenes','drama-write','drama-finish']:['characters', 'canvas', 'mountain', 'write', 'finish']).includes(d.stage) ? d.stage : old.stage, characterIds: characterSnapshots.map((c: any) => c.id), characterSnapshots: json(characterSnapshots), canvas: json(canvas), sections: json(sections), activeSection: Math.min(4, Math.max(0, Number(d.activeSection) || 0)), content: sections.filter(Boolean).join('\n\n') };
                const candidate={title:data.title,sections,canvas,characterSnapshots} as unknown as Story;
                const needsApprovals=!drama && (data.activeSection>old.activeSection || data.status==='published' || data.stage==='finish');
                const approvals=needsApprovals?await prisma.researchEvent.findMany({where:{userId:user.id,storyId:old.id,type:'section_gate_passed'},select:{payload:true}}):[];
                const passed=approvedSections(candidate,approvals);
                if(!drama && data.activeSection>old.activeSection && passed.slice(0,data.activeSection).some(v=>!v))
                    return NextResponse.json({error:'Check each earlier part with Cagent before moving on.'},{status:409});
                const unchangedPublished=old.status==='published' && JSON.stringify(old.sections)===JSON.stringify(sections) && JSON.stringify(old.canvas)===JSON.stringify(d.canvas || old.canvas);
                if(!drama && (data.status==='published'||data.stage==='finish') && !unchangedPublished && passed.some(v=>!v))
                    return NextResponse.json({error:'Check all five story parts before finishing.'},{status:409});
                if(drama && (data.stage==='drama-finish'||data.stage==='drama-write'&&old.stage!=='drama-write')) {
                    const problems=dramaProblems(candidate,data.stage==='drama-finish'||data.status==='published');
                    if(problems.length) return NextResponse.json({error:problems[0]},{status:409});
                }
                if(drama && data.status==='published' && dramaProblems(candidate).length) return NextResponse.json({error:dramaProblems(candidate)[0]},{status:409});
                if(data.status==='draft') {
                    const story=await saveDraft(user.id,old.id,data);
                    return story?NextResponse.json({story}):NextResponse.json({error:'Story not found.'},{status:404});
                }
                const result = await prisma.$transaction(async (tx) => {
                    if (JSON.stringify(old.sections) !== JSON.stringify(sections))
                        await tx.revision.create({ data: { storyId: old.id, sections: json(sections) } });
                    const story=await tx.story.update({ where: { id: old.id }, data });
                    if(data.status!=='published') return {story};
                    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
                    const owner=await tx.user.findUniqueOrThrow({where:{id:user.id}});
                    const state=owner.mapState as any;
                    const chapters=Array.isArray(state?.chapters)?[...state.chapters]:[];
                    while(chapters.length<=story.chapterIndex) chapters.push({mapImageUrl:chapters.length?'/secondmap.webp':'/firstmap.webp',mapFlags:[],currentPin:null});
                    const chapter=chapters[story.chapterIndex];
                    const savedPin=story.pin as {x:number;y:number}|null;
                    const previous=(chapter.mapFlags||[]).find((flag:any)=>flag.id===story.id);
                    const occupied=(chapter.mapFlags||[]).filter((flag:any)=>flag.id!==story.id).map((flag:any)=>({x:Number(flag.x)||0,y:Number(flag.y)||0}));
                    const pin=savedPin&&Number.isFinite(savedPin.x)&&Number.isFinite(savedPin.y)?savedPin:freeMapPoint(occupied);
                    const placed=savedPin?story:await tx.story.update({where:{id:story.id},data:{pin:json(pin)}});
                    const localPreview=process.env.NODE_ENV==='development'&&process.env.CWRITE_LOCAL_MOCK_IMAGES==='true';
                    const flag={id:story.id,x:pin.x,y:pin.y,title:story.title,content:story.content,workType:drama?'drama':'story',...(previous?.previewArt?{previewArt:previous.previewArt}:{}),...(localPreview?{previewArt:{imageUrl:characterSnapshots[0]?.imageUrl||'',storyId:story.id,anchor:'bottom-center'}}:{})};
                    chapters[story.chapterIndex]={...chapter,currentPin:null,mapFlags:[...(chapter.mapFlags||[]).filter((f:any)=>f.id!==story.id),flag]};
                    const mapState={...state,chapters,activeChapterIndex:story.chapterIndex};
                    await tx.user.update({where:{id:user.id},data:{mapState:json(mapState)}});
                    return {story:placed,mapState};
                });
                return NextResponse.json(result);
            }
            if (b.action === 'deleteStory') {
                const result=await prisma.$transaction(async tx=>{
                    const id=String(b.id);
                    await tx.$queryRaw`SELECT id FROM "Story" WHERE id = ${id} AND "userId" = ${user.id} FOR UPDATE`;
                    const work=await tx.story.findFirst({where:{id,userId:user.id}});
                    if(!work)return {error:'Writing not found.',status:404};
                    if(work.status!=='draft')return {error:'Only unfinished writing can be deleted here.',status:409};
                    if(b.expectedUpdatedAt&&new Date(b.expectedUpdatedAt).getTime()!==work.updatedAt.getTime())return {error:'Your draft has changed. Please review its latest version before deleting it.',status:409};
                    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
                    const owner=await tx.user.findUniqueOrThrow({where:{id:user.id}});
                    const others=await tx.story.findMany({where:{userId:user.id,chapterIndex:work.chapterIndex,id:{not:id}},select:{pin:true}});
                    const mapState=mapWithoutDraft(owner.mapState,work,others.map(item=>item.pin));
                    await tx.researchEvent.deleteMany({where:{userId:user.id,storyId:id}});
                    await tx.story.delete({where:{id}});
                    await tx.user.update({where:{id:user.id},data:{mapState:json(mapState)}});
                    return {success:true,mapState};
                });
                return NextResponse.json(result,{status:'status' in result?result.status:200});
            }
            if (b.action === 'saveMap') {
                const mapState=await prisma.$transaction(async tx=>{
                    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id} FOR UPDATE`;
                    const owner=await tx.user.findUniqueOrThrow({where:{id:user.id}});
                    const current=(owner.mapState||{}) as any;
                    const incoming=b.state as any;
                    const chapters=Array.from({length:Math.max(current.chapters?.length||0,incoming?.chapters?.length||0)},(_,i)=>{
                        const saved=current.chapters?.[i],next=incoming?.chapters?.[i];
                        return {...saved,...next,mapFlags:saved?.mapFlags||[]};
                    });
                    const state={...current,...incoming,chapters};
                    await tx.user.update({where:{id:user.id},data:{mapState:json(state)}});
                    return state;
                });
                return NextResponse.json({ success: true, mapState });
            }
            if (b.action === 'event') {
                if (b.storyId && !await prisma.story.findFirst({ where: { id: String(b.storyId), userId: user.id } }))
                    return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
                if(String(b.type||'').startsWith('section_gate_'))
                    return NextResponse.json({error:'This event is reserved for story checks.'},{status:400});
                await recordObservation({ userId: user.id, storyId: b.storyId || null, type: String(b.type || 'event').slice(0, 80), payload: json(b.payload || {}) });
                return NextResponse.json({ success: true });
            }
            if (b.action === 'vocabulary') {
                if (user.role !== 'teacher')
                    return NextResponse.json({ error: 'Teacher access required.' }, { status: 403 });
                const words = (b.words || []).map((x: unknown) => String(x).slice(0, 80)).slice(0, 200);
                await prisma.user.update({ where: { username: String(b.username) }, data: { vocabulary: json(words) } });
                return NextResponse.json({ success: true });
            }
        }
        if (resource === 'user-profile') {
            const old = user.profile as Record<string, unknown>;
            const profile = { ...old };
            for (const key of ['avatarUrl', 'avatarEmoji', 'birthday', 'grade', 'gender', 'email'])
                if (key in b)
                    profile[key] = b[key] === null ? null : String(b[key]).slice(0, key === 'avatarUrl' ? 3000000 : 1000);
            await prisma.user.update({ where: { id: user.id }, data: { profile: json(profile) } });
            return NextResponse.json({ success: true, ...profile });
        }
        if (resource === 'reviews') {
            const author = await prisma.user.findUnique({ where: { username: String(b.author_username) } });
            if (!author)
                return NextResponse.json({ error: 'Writer not found.' }, { status: 404 });
            const story = await prisma.story.findFirst({ where: { userId: author.id, status: 'published', id: String(b.work_interaction_id) } });
            if (!story)
                return NextResponse.json({ error: 'Published story not found.' }, { status: 404 });
            if (!String(b.content || '').trim())
                return NextResponse.json({ error: 'Write some feedback first.' }, { status: 400 });
            await prisma.workReview.create({ data: { authorUsername: author.username, reviewerUsername: user.username, reviewerRole: user.role, workType:writingType(story as unknown as Story), workTitle: story.title, workContent: story.content, content: String(b.content).slice(0, 6000) } });
            return NextResponse.json({ success: true });
        }
        if (resource === 'dify-cagent-guide') {
            const answer = await chat({ messages: [{ role: 'system', content: 'You are Cagent, a warm writing coach for primary students. Reply briefly in English. Ask one thinking question. Explain the farm: Start writing opens the map; trees grow from reflection on values in completed stories; Writing Board shows stories and feedback. Never write story sentences for the student.' }, { role: 'user', content: String(b.userMessage || 'Welcome me to my writing farm.') }], maxTokens: 200 });
            return NextResponse.json({ message: answer });
        }
        return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    catch (error) {
        console.error('Lite data operation failed', error instanceof Error ? error.message : 'error');
        return NextResponse.json({ error: 'Could not save. Please try again.', ...(databaseUnavailable(error) ? { code: 'DATABASE_UNAVAILABLE' } : {}) }, { status: databaseUnavailable(error) ? 503 : 500 });
    }
}
export async function PATCH(request: Request, context: Context) {
    const user = await currentUser();
    if (!user)
        return NextResponse.json({ error: 'Please log in.' }, { status: 401 });
    const { resource } = await context.params;
    const b = await request.json();
    if (resource === 'user-works') {
        const story = await prisma.story.findFirst({ where: { id: String(b.work_id), userId: user.id } });
        if (!story)
            return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
        return NextResponse.json({ error: 'Edit this story in the five-part writing editor.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
}
