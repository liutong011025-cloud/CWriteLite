import {sceneSettingText} from './drama';
import type {DramaLine,DramaScene,Story} from './types';

export const DRAMA_VIDEO_VERSION=3;
export type VideoCaption={start:number;end:number;name:string;kind:'dialogue'|'thought';text:string};
const seconds=(text:string)=>{
    const cjk=(text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g)||[]).length;
    const words=text.replace(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g,' ').trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1.2,words/2.5+cjk/4.5+.35);
};

/** Keep every line; allow enough time for voices, actions and motivated shots. */
export function dramaStoryboard(story:Story,scene:DramaScene,limit=30){
    const cast=scene.actors.map(a=>{
        const character=story.characterSnapshots.find(c=>c.id===a.characterId);
        return `${character?.name||'Character'}${character?.species?' ('+character.species+')':''}: the existing figure centered ${Math.round(a.x)}% from the left, feet ${Math.round(a.y)}% from the top of the first frame`;
    });
    const lines=scene.lines.filter(line=>line.text.trim());
    const name=(line:DramaLine)=>story.characterSnapshots.find(c=>c.id===line.characterId)?.name||'Character';
    const lengths=lines.map(line=>line.kind==='action'?Math.max(1.5,seconds(line.text)*.5):seconds(line.text));
    const duration=Math.max(5,Math.ceil(1.2+lengths.reduce((a,b)=>a+b,0)));
    if(duration>limit)throw new Error(`This scene needs about ${duration} seconds of dialogue and action. Split it into shorter scenes (up to ${limit} seconds each).`);
    const captions:VideoCaption[]=[],shots:string[]=[];
    let cursor=.6;
    for(const [index,line] of lines.entries()){
        const end=cursor+lengths[index],actor=name(line),stamp=`[${cursor.toFixed(2)}–${end.toFixed(2)}s]`;
        if(line.kind==='action')shots.push(`${stamp} Action shot: track the existing characters carrying out this stage direction: ${JSON.stringify(line.text)}. Show anticipation, the action and its consequence with connected movement.`);
        else{
            captions.push({start:cursor,end,name:actor,kind:line.kind,text:line.text});
            shots.push(line.kind==='thought'
                ?`${stamp} Thought close-up of ${actor}: their eyes shift toward the subject of this thought, expression changes; a brief soft-edged, wordless thought vignette visualizes its meaning. ${actor}'s inner voice says exactly ${JSON.stringify(line.text)} in its original language. Their lips remain still; other characters do not hear or answer this private thought.`
                :`${stamp} ${index%2?'Over-the-shoulder / reverse angle':'Medium close-up'} on ${actor}. ${actor} says exactly ${JSON.stringify(line.text)} in its original language, with synchronized mouth movement and expressive body acting. Show the addressed character's immediate listening reaction; follow any action implied by the line.`);
        }
        cursor=end;
    }
    const prompt=[`Direct a lively ${duration}-second illustrated mini-film from the supplied first-frame image. Build a visual story with setup, action and a satisfying reaction, using varied shot sizes and motivated camera movement.`,
        'Preserve the reference art style, character identities, clothing, relative sizes and location. The first frame establishes the spatial layout; later shots may reframe and follow their movement.',
        `Location: ${sceneSettingText(scene)||scene.name}.`, 'Cast mapping:',...cast,
        scene.notes?`Stage directions (context, never spoken): ${JSON.stringify(scene.notes)}`:'',
        'Choose interesting actions and reactions from the actual script and visible setting. Keep motivations grounded in these words; do not impose personality traits, add dialogue, new characters or unrelated events.',
        '[0–0.60s] Start on the supplied wide composition with a purposeful push-in toward the first active character. Bring visible environmental details to life.',
        ...shots,
        !lines.length?`[0.60–${duration-.6}s] Use the stage directions to create a small visual event. Track the lead character in a medium shot, then show an expressive reaction close-up. With no written action, let the cast notice one visible detail and respond playfully to each other.`:'',
        `[${(lines.length?cursor:duration-.6).toFixed(2)}–${duration}s] End on an expressive reaction or shared two-shot that resolves the exchange.`,
        'Use match-on-action cuts, shot / reverse-shot, subtle parallax and fluid character acting. Keep screen direction and character identity consistent across shots; render one full-screen film, not a storyboard grid.',
        'Sound: generate clear, distinct, consistent voices for each named character. Dialogue is spoken by its assigned character; thoughts use the same character\'s softer inner voice. Keep exact words and their order; let only one voice speak at a time. Gentle scene-appropriate sound effects and a quiet playful musical bed stay below voices.',
        'Words are provided as a separate timed caption track by the player. Keep faces unobstructed; thought imagery is wordless. Do not draw random lettering, title cards or extra text.'].filter(Boolean).join('\n');
    if(prompt.length>18000)throw new Error('This scene has too much text for one video. Split it into shorter scenes.');
    return {prompt,duration,captions,renderVersion:DRAMA_VIDEO_VERSION};
}

export function dramaMotionPrompt(story:Story,scene:DramaScene){return dramaStoryboard(story,scene).prompt;}

/** Escaped, exact student words; native captions also work in fullscreen. */
export function dramaCaptionTrack(captions:VideoCaption[]){
    const time=(seconds:number)=>new Date(Math.round(seconds*1000)).toISOString().slice(11,23);
    const clean=(text:string)=>text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/[\r\n]+/g,' ');
    return 'WEBVTT\n\n'+captions.map((cue,index)=>`${index+1}\n${time(cue.start)} --> ${time(cue.end)}\n${clean(cue.name)} ${cue.kind==='thought'?'thinks':'says'}: ${clean(cue.text)}\n`).join('\n');
}
