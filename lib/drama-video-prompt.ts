import {sceneSettingText} from './drama';
import type {DramaScene,Story} from './types';

/** Derive an editable motion brief from the student's saved stage and words. */
export function dramaMotionPrompt(story:Story,scene:DramaScene){
    const cast=scene.actors.map(a=>story.characterSnapshots.find(c=>c.id===a.characterId)?.name||'Character');
    const lines=scene.lines.filter(l=>l.text.trim()).map(l=>{
        const name=story.characterSnapshots.find(c=>c.id===l.characterId)?.name||'Stage';
        return l.kind==='action'?`Action: ${l.text}`:l.kind==='thought'?`${name} thinks silently: ${l.text}. Show a thoughtful expression; no speaking.`:`${name} says: ${l.text}. Show a natural speaking gesture and attentive reactions.`;
    });
    return [`Animate this illustrated stage as one smooth, continuous shot. Keep the same characters, clothing, art style, background and starting positions as the reference image.`,
        `Setting: ${sceneSettingText(scene)||scene.name}. Cast: ${cast.join(', ')}.`,scene.notes?`Stage directions: ${scene.notes}`:'',...lines,
        'Use gentle, fluid character movement, natural blinking and expressive gestures that fit the scene. Keep the camera steady. No new characters, no cuts, no text or speech bubbles. Silent animation.'].filter(Boolean).join('\n').slice(0,6000);
}
