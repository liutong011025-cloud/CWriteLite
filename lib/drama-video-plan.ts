import type {Character,DramaScene,Story} from './types';
import {arkVideoTarget,type DramaVideoTarget} from './ark-video-config';

export type DramaVideoBeat={id:string;sceneId:string;kind:'background'|'cast'|'dialogue'|'thought';lineId?:string;characterId?:string;text:string;duration:number;motion:string};
export type DramaVideoPlan={version:1;title:string;ratio:'16:9';beats:DramaVideoBeat[];scenes:DramaScene[];characters:Character[];generatedVideo:false;videoTarget:DramaVideoTarget};

/** AI can order existing lines, but cannot replace dialogue, add actors, or omit a line. */
export function dramaVideoPlan(story:Story,raw:unknown,videoTarget=arkVideoTarget()):DramaVideoPlan {
    const record=raw&&typeof raw==='object'?raw as {scenes?:unknown}:{};
    const orders=Array.isArray(record.scenes)?record.scenes:[];
    const scenes=story.canvas.drama?.scenes||[],beats:DramaVideoBeat[]=[];
    for(const scene of scenes){
        beats.push({id:scene.id+'-background',sceneId:scene.id,kind:'background',text:scene.backgroundPrompt,duration:2,motion:'Establish the background. Keep the camera steady.'});
        beats.push({id:scene.id+'-cast',sceneId:scene.id,kind:'cast',text:'Characters enter the picture.',duration:2,motion:'Reveal the existing cast at their saved positions.'});
        const lines=scene.lines.filter(l=>l.text.trim()&&l.kind!=='action');
        const proposed=orders.find((o:unknown)=>o&&typeof o==='object'&&(o as {sceneId?:unknown}).sceneId===scene.id) as {lineIds?:unknown;motions?:unknown}|undefined;
        const ids=Array.isArray(proposed?.lineIds)?proposed.lineIds:[];
        const valid=ids.length===lines.length&&new Set(ids).size===lines.length&&ids.every(id=>lines.some(l=>l.id===id));
        const ordered=valid?ids.map(id=>lines.find(l=>l.id===id)!):lines;
        for(const line of ordered){
            const actor=story.characterSnapshots.find(c=>c.id===line.characterId);
            // Exact student words and asset identities stay outside the model's output.
            const motion=line.kind==='thought'?'A gentle pause; show a thought bubble. Do not make the character speak.':'A small speaking gesture; other characters listen.';
            beats.push({id:line.id,sceneId:scene.id,kind:line.kind as 'dialogue'|'thought',lineId:line.id,characterId:line.characterId,text:line.text,duration:Math.max(4,Math.ceil(line.text.trim().split(/\s+/).length/2.2)),motion:(actor?.name?actor.name+': ':'')+motion});
        }
    }
    return {version:1,title:story.title,ratio:'16:9',beats,scenes,characters:story.characterSnapshots,generatedVideo:false,videoTarget};
}
