import type { Character, DramaLine, DramaProject, DramaScene, Story, StoryCanvas } from './types';

export const MAX_DRAMA_SCENES = 6;
export const DRAMA_ACTOR_WIDTH = 26;
export const actorX = (x:number,scale:number) => Math.max(DRAMA_ACTOR_WIDTH*scale/2+1,Math.min(99-DRAMA_ACTOR_WIDTH*scale/2,x));
export const isDrama = (work: Pick<Story, 'canvas'>) => work.canvas?.writingType === 'drama';
export const writingType = (work: Pick<Story, 'canvas'>) => isDrama(work) ? 'drama' : 'story';
export function blankDramaScene(id: string, index = 0): DramaScene {
    return {id, name:`Scene ${index + 1}`, backgroundPrompt:'', backgroundImageUrl:'', notes:'', actors:[], lines:[]};
}
const safeText = (s: unknown, length = 2000) => String(s ?? '').slice(0, length);
const bounded = (n: unknown, min: number, max: number, fallback: number) => Number.isFinite(Number(n)) ? Math.min(max, Math.max(min, Number(n))) : fallback;
const safeImage = (s: unknown) => {
    const url = safeText(s, 3000000);
    return /^(?:https:\/\/|\/(?!\/)|data:image\/(?:png|webp);base64,)/.test(url) ? url : '';
};
/** The cast is owned by the work's user; unknown actors/speakers are discarded. */
export function normalizeDrama(input: unknown, cast: Character[]): DramaProject {
    const source = input as Partial<DramaProject> | undefined;
    const ids = new Set(cast.map(c => c.id));
    const seen = new Set<string>();
    const scenes:DramaScene[] = (Array.isArray(source?.scenes) ? source.scenes : []).slice(0, MAX_DRAMA_SCENES).map((s, index) => {
        const sceneId = safeText(s?.id, 100) || `scene-${index + 1}`;
        const id = seen.has(sceneId) ? `${sceneId}-${index}` : sceneId;
        seen.add(id);
        const actorIds = new Set<string>();
        const actors = (Array.isArray(s?.actors) ? s.actors : []).filter(a => ids.has(a?.characterId) && !actorIds.has(a.characterId) && !!actorIds.add(a.characterId)).slice(0, 8).map(a => {const scale=bounded(a.scale,.6,1.6,1);return {characterId:a.characterId, x:actorX(bounded(a.x,8,92,50),scale), y:bounded(a.y,35,96,89),scale,flipped:Boolean(a.flipped)};});
        const lineIds = new Set<string>();
        const lines = (Array.isArray(s?.lines) ? s.lines : []).slice(0, 80).filter(l => l?.kind === 'action' || actorIds.has(l?.characterId)).map((l, i) => {
            const initialId = safeText(l.id, 100) || `line-${i}`;
            const lineId = lineIds.has(initialId) ? `${initialId}-${i}` : initialId;
            lineIds.add(lineId);
            return {id:lineId, kind:(['dialogue','thought','action'].includes(l.kind) ? l.kind : 'dialogue') as 'dialogue'|'thought'|'action', characterId:actorIds.has(l.characterId) ? l.characterId : '', text:safeText(l.text, 1500)};
        });
        const archivedLines=(Array.isArray(s?.archivedLines)?s.archivedLines:[]).slice(0,160).filter(l=>l?.kind==='action'||actorIds.has(l?.characterId)).map(l=>({id:safeText(l.id,100),kind:(['dialogue','thought','action'].includes(l.kind)?l.kind:'dialogue') as DramaLine['kind'],characterId:actorIds.has(l.characterId)?l.characterId:'',text:safeText(l.text,1500)}));
        return {id, name:safeText(s?.name, 80) || `Scene ${index + 1}`, backgroundPrompt:safeText(s?.backgroundPrompt), settingDescription:safeText(s?.settingDescription, 500), backgroundImageUrl:safeImage(s?.backgroundImageUrl), notes:safeText(s?.notes), actors, lines,archivedLines};
    });
    if (!scenes.length) scenes.push(blankDramaScene('scene-1'));
    const project={scenes, activeScene:Math.floor(bounded(source?.activeScene, 0, scenes.length - 1, 0))};
    return source?.mode==='tableau'?tableauProject(project):project;
}
/** One visible contribution per actor. Legacy sequences are retained as archived draft data. */
export function tableauProject(project:DramaProject):DramaProject {
    return {...project,mode:'tableau',scenes:project.scenes.map(scene=>{
        const chosen=new Map<string,DramaLine>();
        for(const line of scene.lines)if(line.kind!=='action'&&scene.actors.some(a=>a.characterId===line.characterId)){
            if(line.text.trim()||!chosen.get(line.characterId)?.text.trim())chosen.set(line.characterId,line);
        }
        const lines=[...chosen.values()],ids=new Set(lines.map(l=>l.id));
        const archivedLines=[...(scene.archivedLines||[]),...scene.lines.filter(l=>!ids.has(l.id))];
        return {...scene,lines,...(archivedLines.length?{archivedLines}: {})};
    })};
}
export function actorContribution(scene:DramaScene,characterId:string,kind:'dialogue'|'thought',text?:string):DramaScene {
    const previous=scene.lines.find(l=>l.characterId===characterId&&l.kind!=='action');
    const line={id:previous?.id||crypto.randomUUID(),characterId,kind,text:text??previous?.text??''};
    return {...scene,lines:[...scene.lines.filter(l=>l.characterId!==characterId),line]};
}
export function sceneTitle(index: number, name: string) {
    const number = `Scene ${index + 1}`;
    const custom = name.trim().replace(new RegExp(`^scene\\s*${index + 1}\\s*[:\\-—]?\\s*`, 'i'), '').trim();
    if (!custom || custom.toLowerCase() === number.toLowerCase()) return number;
    return `${number} — ${custom}`;
}
export function sceneSettingText(scene: { backgroundPrompt?: string; settingDescription?: string }) {
    return (scene.settingDescription || scene.backgroundPrompt || '').replace(/\b(?:no characters?|no people(?: or animals)?|no animals|no text|no letters|do not include people)[^.]*/gi, '').replace(/\s+/g, ' ').trim();
}
export function dramaSections(canvas: StoryCanvas, cast: Character[]) {
    return (canvas.drama?.scenes || []).map((s, i) => {
        const actorName = (id: string) => cast.find(c => c.id === id)?.name || 'Stage';
        const setting = sceneSettingText(s);
        return [sceneTitle(i, s.name), setting, s.notes ? `[Stage directions: ${s.notes}]` : '', ...s.lines.filter(l => l.text.trim()).map(l => l.kind === 'action' ? `[${l.text}]` : `${actorName(l.characterId)} ${l.kind === 'thought' ? 'thinks' : 'says'}: ${l.text}`)].filter(Boolean).join('\n');
    });
}
export function withDrama(work: Story, drama: DramaProject): Story {
    const canvas = {...work.canvas, writingType:'drama' as const, drama};
    const sections = dramaSections(canvas, work.characterSnapshots);
    return {...work, canvas, sections, content:sections.join('\n\n')};
}
export function dramaProblems(work: Pick<Story, 'canvas'|'characterSnapshots'|'title'>, script = true) {
    const scenes = work.canvas.drama?.scenes || [];
    const problems: string[] = [];
    if (!scenes.length) return ['Create a scene first.'];
    if (script && !work.title.trim()) problems.push('Give your drama a title.');
    scenes.forEach((s, i) => {
        const prefix = `Scene ${i + 1}: `;
        if (!s.backgroundImageUrl || !s.backgroundPrompt.trim()) problems.push(prefix + 'describe and generate a background.');
        if (!s.actors.length) problems.push(prefix + 'place at least one character on stage.');
        if (!script) return;
        const tableau=work.canvas.drama?.mode==='tableau';
        const spoken = s.lines.filter(l => (tableau?l.kind!=='action':l.kind==='dialogue') && l.text.trim());
        if (tableau?s.actors.some(a=>!spoken.some(l=>l.characterId===a.characterId)):spoken.length<2) problems.push(prefix + (tableau?'give each character one speech or thought.':'write at least two dialogue lines.'));
        if(tableau&&(s.lines.some(l=>l.kind==='action')||new Set(s.lines.map(l=>l.characterId)).size!==s.lines.length))problems.push(prefix+'choose either Says or Thinks for each character.');
        if(tableau&&spoken.some(l=>l.text.includes('___')))problems.push(prefix+'fill the blanks with your own ideas.');
        if (s.lines.some(l => !l.text.trim())) problems.push(prefix + 'finish or remove empty lines.');
        const meaningful = s.lines.filter(l => l.text.trim());
        if (meaningful.some(l => ((l.text.match(/[a-z]+(?:'[a-z]+)?/gi) || []).length < 2 && !/^(?:hello|hi|yes|no|thanks|please|okay|sorry|help|stop|wait|bye)[.!?]*$/i.test(l.text.trim())) || /([a-z])\1{6,}/i.test(l.text))) problems.push(prefix + 'use a short, understandable phrase for each line.');
        if (s.actors.length > 1 && new Set(spoken.map(l => l.characterId)).size < 2) problems.push(prefix + 'let another character respond.');
        if (spoken.length >= 2 && new Set(spoken.map(l => l.text.trim().toLowerCase())).size < 2) problems.push(prefix + 'show a response instead of repeating the same line.');
    });
    return problems;
}
