import {sceneSettingText} from './drama';
import type {DramaScene,Story} from './types';

/** Bind each name to the composed first frame, then give a continuous five-second motion brief. */
export function dramaMotionPrompt(story:Story,scene:DramaScene){
    const cast=scene.actors.map(a=>{
        const character=story.characterSnapshots.find(c=>c.id===a.characterId);
        return `${character?.name||'Character'}${character?.species?' ('+character.species+')':''}: the existing figure centered ${Math.round(a.x)}% from the left, feet ${Math.round(a.y)}% from the top of the first frame`;
    });
    const lines=scene.lines.filter(l=>l.text.trim()).map(l=>{
        const name=story.characterSnapshots.find(c=>c.id===l.characterId)?.name||'Stage';
        return l.kind==='action'?`Action context: ${l.text}`:l.kind==='thought'?`${name} thinks silently: ${JSON.stringify(l.text)}.`:`${name}'s dialogue intent: ${JSON.stringify(l.text)}.`;
    });
    return ['Create a five-second illustrated animation from this first-frame image in one continuous, fixed wide shot.',
        'First-frame binding: preserve its illustration style, background, clothing, relative character sizes and starting positions.',
        `Location: ${sceneSettingText(scene)||scene.name}.`, 'Cast mapping in the first-frame image:',...cast,
        scene.notes?`Stage directions: ${scene.notes}`:'',...lines,
        '0–1s: begin with the supplied composition; characters blink and breathe naturally.',
        '1–4s: show one small, connected exchange through natural gestures and attentive reactions based on the above words. Thoughts stay private and appear only in subtle facial expressions. Fit the exchange into five seconds rather than rushing through every line.',
        '4–5s: let the gestures settle naturally while holding the same shot.',
        'Keep the existing cast and scene throughout, with smooth continuous movement and stable faces. Silent animation; no subtitles, written words, speech bubbles or background music.'].filter(Boolean).join('\n').slice(0,6000);
}
