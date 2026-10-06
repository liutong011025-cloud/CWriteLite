'use client';
import { processFetch, trackProcess } from '@/lib/process-bus';

import {useEffect,useRef,useState} from 'react';
import {Send} from 'lucide-react';
import {toast} from 'sonner';
import type {DramaLine,DramaScene,Story} from '@/lib/types';
import {api,Bear} from './common';

export default function DramaCoach({story,scene,line,script,suggesting=false}:{story:Story;scene:DramaScene;line?:DramaLine;script:boolean;suggesting?:boolean}){
    const [answer,setAnswer]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
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
    async function ask(){if(!message.trim()||busy)return;setBusy(true);try{const r=await api('/api/ai',{kind:'chat',storyId:story.id,canvas:story.canvas,sections:story.sections,selectedNode:{sceneId:scene.id,lineId:line?.id},message});setAnswer(r.message);setMessage('');}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
    return <section className="drama-coach" aria-label="Cagent scene coach"><h2>Cagent</h2><Bear variant="drawing" pose={script?'cagent-director-v2.webp':'cagent-planning-v2.webp'} responsePose={script?'cagent-celebrate-v2.webp':'cagent-director-v2.webp'} busy={busy||suggesting} showHelp={false} responding={busy||suggesting} message={answer||fallback}/>{busy&&<p className="drama-coach-status" role="status">Reading your latest scene…</p>}<form className="drama-coach-input" onSubmit={e=>{e.preventDefault();void ask();}}><input aria-label="Ask Cagent about this scene" placeholder="Ask about your scene…" value={message} onChange={e=>setMessage(e.target.value)} maxLength={1200}/><button className="icon-button" aria-label="Send message to Cagent" disabled={busy||!message.trim()}><Send size={20}/></button></form></section>;
}
