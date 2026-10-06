'use client';
import { processFetch, trackProcess } from '@/lib/process-bus';
import {useEffect,useState} from 'react';
import {ChevronRight,Lightbulb} from 'lucide-react';
import type {Story} from '@/lib/types';
import {Modal} from './common';

export default function DramaReadiness({story,onClose,onContinue}:{story:Story;onClose:()=>void;onContinue:()=>Promise<void>}) {
    const [busy,setBusy]=useState(true),[moving,setMoving]=useState(false),[message,setMessage]=useState(''),[questions,setQuestions]=useState<string[]>([]),[error,setError]=useState('');
    useEffect(()=>{
        const controller=new AbortController();
        void processFetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({kind:'dramaReview',storyId:story.id,canvas:story.canvas})})
            .then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error||'Please try again.');if(!controller.signal.aborted){setMessage(data.message);setQuestions(data.suggestions);}})
            .catch(e=>{if(!controller.signal.aborted)setError(e.message);}).finally(()=>{if(!controller.signal.aborted)setBusy(false);});
        return()=>controller.abort();
    },[story.id,story.canvas]);
    async function proceed(){if(moving)return;setMoving(true);try{await onContinue();}catch(e){setError((e as Error).message);setMoving(false);}}
    return <Modal title="One look at your scene" onClose={onClose}><div className="canvas-readiness-note"><Lightbulb size={32}/>{busy?<p role="status">Cagent is checking how your scene fits together…</p>:<><p>{message||'You can still continue while Cagent is unavailable.'}</p>{questions.length>0&&<ul>{questions.map(q=><li key={q}>{q}</li>)}</ul>}{error&&<p role="alert" className="error-text">{error}</p>}</>}</div><div className="canvas-readiness-actions"><button className="outline-button" disabled={moving} onClick={onClose}>Keep adding</button><button className="purple-button" disabled={moving} onClick={()=>void proceed()}>{moving?'Opening…':'Continue anyway'}<ChevronRight size={18}/></button></div></Modal>;
}
