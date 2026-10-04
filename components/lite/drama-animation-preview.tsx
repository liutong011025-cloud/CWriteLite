'use client';
import {useEffect,useState} from 'react';
import {Download,Pause,Play,RotateCcw} from 'lucide-react';
import type {Story} from '@/lib/types';
import type {DramaVideoPlan} from '@/lib/drama-video-plan';
import {Modal} from './common';
import DramaScenePreview from './drama-scene-preview';

export default function DramaAnimationPreview({story,onClose}:{story:Story;onClose:()=>void}) {
    const [plan,setPlan]=useState<DramaVideoPlan|null>(null),[error,setError]=useState(''),[index,setIndex]=useState(0),[playing,setPlaying]=useState(false);

    useEffect(()=>{
        const controller=new AbortController();
        void fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({kind:'dramaVideoPlan',storyId:story.id,canvas:story.canvas})}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Please try again.');if(!controller.signal.aborted)setPlan(data.plan);}).catch(e=>{if(!controller.signal.aborted)setError(e.message);});
        return()=>controller.abort();
    },[story.id,story.canvas]);
    useEffect(()=>{
        if(!playing||!plan)return;const timer=setTimeout(()=>{if(index>=plan.beats.length-1)setPlaying(false);else setIndex(i=>i+1);},plan.beats[index].duration*1000);return()=>clearTimeout(timer);
    },[playing,index,plan]);
    const beat=plan?.beats[index],scene=plan?.scenes.find(s=>s.id===beat?.sceneId);
    function download(){if(!plan)return;const url=URL.createObjectURL(new Blob([JSON.stringify(plan,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='drama-animation-plan.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return <Modal title="Your scene in motion" wide onClose={onClose}>{!plan?<p role="status">{error||'Arranging your characters’ words into an animation…'}</p>:<div className="drama-animation-preview"><div className="drama-animation-picture" key={beat?.id}>{scene&&<DramaScenePreview scene={scene} characters={plan.characters} activeLineId={beat?.lineId} backgroundOnly={beat?.kind==='background'} hideWords={beat?.kind==='cast'}/>}</div><p className="drama-preview-caption">{beat?.kind==='background'?'First, the setting.':beat?.kind==='cast'?'Then, your characters.':plan.characters.find(c=>c.id===beat?.characterId)?.name+(beat?.kind==='thought'?' thinks…':' speaks…')}</p><div className="drama-animation-controls"><button className="outline-button" onClick={()=>setPlaying(p=>!p)}>{playing?<Pause size={18}/>:<Play size={18}/>} {playing?'Pause':'Preview'}</button><button className="icon-button" aria-label="Restart preview" onClick={()=>{setIndex(0);setPlaying(false);}}><RotateCcw size={20}/></button><label>Moment<input aria-label="Animation moment" type="range" min="0" max={plan.beats.length-1} value={index} onChange={e=>{setIndex(Number(e.target.value));setPlaying(false);}}/></label><span>{index+1}/{plan.beats.length}</span><button className="outline-button" onClick={download}><Download size={18}/>Save animation plan</button></div><p className="field-hint">This is a scene preview. Your words stay the same. Video export will be connected after deployment.</p></div>}</Modal>;
}
