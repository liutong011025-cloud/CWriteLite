import type {Character,DramaLine,StoryCanvas} from './types';

export type DramaSuggestion={characterId:string;kind:DramaLine['kind'];prompt:string;keywords:string[];frame:string};
const words=(value:unknown)=>Array.isArray(value)?value.filter((w):w is string=>typeof w==='string'&&w.trim().length>0&&w.length<55&&w.trim().split(/\s+/).length<=4&&!/[.!?]/.test(w)).slice(0,6):[];
/** A suggestion may only refer to a character actually placed in this scene. */
export function dramaSuggestions(value:unknown,canvas:StoryCanvas,cast:Character[],sceneId:string,selection?:{characterId?:string;kind?:string}){
    const result=value as {suggestions?:unknown[];keywords?:unknown;question?:unknown};
    const scene=canvas.drama?.scenes.find(s=>s.id===sceneId)||canvas.drama?.scenes[canvas.drama.activeScene];
    const ids=new Set(scene?.actors.map(a=>a.characterId).filter(id=>cast.some(c=>c.id===id))||[]);
    const suggestions=(Array.isArray(result?.suggestions)?result.suggestions:[]).flatMap(item=>{
        const s=item as Partial<DramaSuggestion>;
        if(!s||!ids.has(String(s.characterId))||typeof s.prompt!=='string'||!s.prompt.trim()||!['dialogue','thought'].includes(String(s.kind)))return [];
        if(selection?.characterId&&s.characterId!==selection.characterId||selection?.kind&&selection.kind!=='scene'&&s.kind!==selection.kind)return [];
        if(typeof s.frame!=='string'||!s.frame.includes('___')||s.frame.split(/\s+/).length>14)return [];
        return [{characterId:String(s.characterId),kind:s.kind!,prompt:s.prompt.trim().slice(0,240),keywords:words(s.keywords),frame:typeof s.frame==='string'&&s.frame.includes('___')&&s.frame.split(/\s+/).length<=14?s.frame.slice(0,180):''}];
    }).slice(0,3);
    return {suggestions,keywords:words(result?.keywords),question:typeof result?.question==='string'?result.question.slice(0,300):''};
}
