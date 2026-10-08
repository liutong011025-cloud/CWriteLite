'use client';
import { processFetch } from '@/lib/process-bus';

import {useEffect,useRef,useState} from 'react';
import type {DramaLine,DramaScene,Story} from '@/lib/types';
import WritingCoach from './writing-coach';

export default function DramaCoach({story,scene,line,suggesting=false}:{story:Story;scene:DramaScene;line?:DramaLine;suggesting?:boolean}){
    const [answer,setAnswer]=useState(''),[busy,setBusy]=useState(false);
    const name=story.characterSnapshots.find(c=>c.id===line?.characterId)?.name||story.characterSnapshots[0]?.name||'your character';
    const fallback=!scene.backgroundImageUrl?'Where will this scene happen? Describe the place, then make your background.':!scene.actors.length?'Open your purple character pack and choose who will be in this scene.':line?.kind==='thought'?`What does ${name} think but not say out loud?`:line?.kind==='action'?`How could ${name} show that feeling through an action?`:`What does ${name} want here, and how will another character respond?`;
    const context=JSON.stringify({id:scene.id,background:scene.backgroundPrompt,notes:scene.notes,actors:scene.actors.map(a=>a.characterId),lines:scene.lines,cast:story.characterSnapshots.map(c=>({name:c.name,traits:c.traits})),line});
    const latest=useRef(story);latest.current=story;
    useEffect(()=>{
        setAnswer('');setBusy(false);
        if(!scene.backgroundImageUrl)return;
        const controller=new AbortController();
        const timer=setTimeout(()=>{
            setBusy(true);
            void processFetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({kind:'coach',storyId:story.id,canvas:latest.current.canvas,sections:latest.current.sections,selectedNode:{sceneId:scene.id,lineId:line?.id}})}).then(async r=>{if(!r.ok)throw new Error();return r.json();}).then(r=>{if(!controller.signal.aborted)setAnswer(r.message);}).catch(()=>{}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
        },1800);
        return()=>{clearTimeout(timer);controller.abort();};
    },[context,story.id,scene.id,scene.backgroundImageUrl,line?.id]);
    return <section className="drama-coach drama-scene-coach" aria-label="Cagent scene coach"><WritingCoach message={answer||fallback} busy={busy||suggesting}/></section>;
}
