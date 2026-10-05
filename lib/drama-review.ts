import {sceneSettingText} from './drama';
import type {Character,StoryCanvas} from './types';

/** Keep places, cast identities and attributed contributions separate for the reviewer. */
export function dramaReviewScenes(canvas:StoryCanvas,characters:Character[]){
    return (canvas.drama?.scenes||[]).map((scene,index)=>({
        sceneId:scene.id,sceneNumber:index+1,sceneName:scene.name,
        location:sceneSettingText(scene),stageDirections:scene.notes,
        cast:scene.actors.map(actor=>{
            const character=characters.find(c=>c.id===actor.characterId);
            return {characterId:actor.characterId,name:character?.name||'',characterType:character?.species||''};
        }),
        contributions:scene.lines.filter(line=>line.text.trim()).map(line=>({
            lineId:line.id,kind:line.kind,speakerId:line.characterId,
            speakerName:characters.find(c=>c.id===line.characterId)?.name||'',text:line.text,
        })),
    }));
}
