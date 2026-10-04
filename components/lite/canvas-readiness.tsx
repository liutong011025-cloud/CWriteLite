'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronRight,Lightbulb} from 'lucide-react';
import type {Story} from '@/lib/types';
import {Modal} from './common';

export default function CanvasReadiness({story,onContinue,onEvent}:{story:Story;onContinue:()=>void;onEvent:(type:string,payload:unknown)=>void}){
    const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[review,setReview]=useState<{message:string;suggestions:string[]}|null>(null);
    const request=useRef<AbortController|null>(null),latest=useRef('');latest.current=JSON.stringify(story.canvas);
    useEffect(()=>()=>request.current?.abort(),[]);
    function close(){request.current?.abort();setOpen(false);setBusy(false);}
    function proceed(){close();onContinue();}
    async function check(){
        if(busy)return;const controller=new AbortController();request.current=controller;
        const signature=latest.current;setReview(null);setError('');setBusy(true);setOpen(true);
        try{
            const response=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({kind:'canvasReview',storyId:story.id,canvas:story.canvas})});
            const result=await response.json();if(!response.ok)throw new Error(result.error||'Please try again.');
            if(controller.signal.aborted)return;
            if(latest.current!==signature){setError('Your canvas changed. Check it again.');return;}
            onEvent('canvas_readiness_checked',{ready:result.ready,requestId:result.requestId});
            if(result.ready){proceed();return;}
            setReview({message:result.message,suggestions:result.suggestions});
        }catch(e){if(!controller.signal.aborted)setError((e as Error).message);}
        finally{if(!controller.signal.aborted)setBusy(false);}
    }
    return <><button className="purple-button" disabled={busy||!story.canvas.nodes.some(n=>n.type==='character')} onClick={()=>void check()}>{busy?'Checking your plan…':'Start writing'}<ChevronRight size={18}/></button>{open&&<Modal title="A quick look at your plan" onClose={close}><div className="canvas-readiness-note"><Lightbulb size={32}/>{busy?<p role="status">Cagent is checking how your ideas connect…</p>:<><p>{review?.message||'Cagent could not check the plan yet.'}</p>{review?.suggestions?.length?<ul>{review.suggestions.map(q=><li key={q}>{q}</li>)}</ul>:null}{error&&<p className="error-text" role="alert">{error}</p>}</>}</div><div className="canvas-readiness-actions"><button className="outline-button" onClick={close}>Keep planning</button><button className="purple-button" onClick={()=>{onEvent('canvas_readiness_skipped',{});proceed();}}>Write anyway<ChevronRight size={18}/></button></div></Modal>}</>;
}
