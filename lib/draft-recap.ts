import type {Story} from './types';
import {isDrama} from './drama';

export function draftRecap(work:Story) {
    const drama=isDrama(work),scenes=work.canvas.drama?.scenes||[];
    const text=drama?scenes.flatMap(scene=>scene.lines).filter(line=>line.text.trim()).map(line=>`${work.characterSnapshots.find(c=>c.id===line.characterId)?.name||'Action'}: ${line.text}`).join(' '):work.sections.filter(section=>section.trim()).join(' ');
    const excerpt=text.replace(/\s+/g,' ').trim();
    return {
        type:drama?'Drama':'Story',
        cast:work.characterSnapshots.map(c=>c.name).join(', ')||'No characters chosen yet',
        setting:drama?scenes.map(scene=>scene.backgroundPrompt.trim()).filter(Boolean).join(' · '):work.canvas.nodes.filter(node=>node.type==='setting').map(node=>node.label).join(' · '),
        progress:drama?`${scenes.length} scene${scenes.length===1?'':'s'} · ${scenes.reduce((count,scene)=>count+scene.lines.filter(line=>line.text.trim()).length,0)} written lines`:`${work.sections.filter(section=>section.trim()).length} of 5 story parts started`,
        excerpt:excerpt.length>240?`${excerpt.slice(0,237)}…`:excerpt,
    };
}

/** Remove only this work's map references, preserving every other chapter and pin. */
export function mapWithoutDraft(state:any,work:{id:string;chapterIndex:number;pin:unknown},remainingPins:unknown[]) {
    if(!state||!Array.isArray(state.chapters))return state||{};
    const samePin=(a:any,b:any)=>a&&b&&a.x===b.x&&a.y===b.y;
    return {...state,chapters:state.chapters.map((chapter:any,index:number)=>({...chapter,
        mapFlags:(Array.isArray(chapter.mapFlags)?chapter.mapFlags:[]).filter((flag:any)=>flag.id!==work.id),
        currentPin:index===work.chapterIndex&&samePin(chapter.currentPin,work.pin)&&!remainingPins.some(pin=>samePin(pin,chapter.currentPin))?null:chapter.currentPin,
    }))};
}
