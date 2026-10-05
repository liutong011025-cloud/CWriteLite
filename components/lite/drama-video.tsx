'use client';
import {useEffect,useRef,useState} from 'react';
import {Clapperboard} from 'lucide-react';
import {api} from './common';
type Job={id:string;sceneId:string;status:string;errorMessage:string;outputUrl:string;prompt:string;duration:number};
type Scene={id:string;name:string;prompt:string};
type State={scenes:Scene[];jobs:Job[];mock?:boolean;configured?:boolean};
const pending=(status?:string)=>['preparing','submitting','generating'].includes(status||'');
export default function DramaVideoPanel({storyId}:{storyId:string}){
    const [state,setState]=useState<State>({scenes:[],jobs:[]}),[sceneId,setSceneId]=useState(''),[prompt,setPrompt]=useState(''),[duration,setDuration]=useState(8),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const selected=useRef(''),submitting=useRef(false);selected.current=sceneId;
    const job=state.jobs.find(j=>j.sceneId===sceneId),jobId=job?.id,jobStatus=job?.status;
    useEffect(()=>{
        let active=true;
        void api('/api/drama-video?storyId='+encodeURIComponent(storyId)).then((result:State)=>{if(!active)return;setState(result);const scene=result.scenes[0],saved=result.jobs.find(j=>j.sceneId===scene?.id);setSceneId(scene?.id||'');setPrompt(saved?.prompt||scene?.prompt||'');setDuration(saved?.duration||8);}).catch(e=>{if(active)setError(e.message);});
        return()=>{active=false;};
    },[storyId]);
    useEffect(()=>{
        if(!jobId||!pending(jobStatus))return;
        let active=true,timer:ReturnType<typeof setTimeout>;
        async function poll(){try{const r=await api('/api/drama-video/'+jobId);if(active){setState(s=>({...s,jobs:s.jobs.map(j=>j.id===jobId?r.job:j)}));setError('');}}catch(e){if(active)setError((e as Error).message);}finally{if(active)timer=setTimeout(poll,5000);}}
        timer=setTimeout(poll,5000);return()=>{active=false;clearTimeout(timer);};
    },[jobId,jobStatus]);
    function choose(id:string){const scene=state.scenes.find(s=>s.id===id),saved=state.jobs.find(j=>j.sceneId===id);setSceneId(id);setPrompt(saved?.prompt||scene?.prompt||'');setDuration(saved?.duration||8);setError('');}
    async function start(){
        if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
        const requestedScene=sceneId;
        try{const r=await api('/api/drama-video',{storyId,sceneId,prompt,duration,retry:job?.status==='failed'});setState(s=>({...s,jobs:[...s.jobs.filter(j=>j.sceneId!==requestedScene),r.job]}));}
        catch(e){if(selected.current===requestedScene)setError((e as Error).message);}
        finally{submitting.current=false;setBusy(false);}
    }
    const active=pending(jobStatus),unknown=jobStatus==='needs_confirmation';
    return <section className="drama-video-panel"><h3><Clapperboard size={20}/>Animate your scene</h3>
        {state.scenes.length>0&&<><label>Scene<select aria-label="Video scene" value={sceneId} disabled={busy} onChange={e=>choose(e.target.value)}>{state.scenes.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
        <label>Animation prompt<textarea aria-label="Animation prompt" value={prompt} maxLength={6000} rows={7} disabled={busy||active||unknown} onChange={e=>setPrompt(e.target.value)}/></label>
        <label>Length<select aria-label="Video length" value={duration} disabled={busy||active||unknown} onChange={e=>setDuration(Number(e.target.value))}>{[5,8,10,15].map(n=><option key={n} value={n}>{n} seconds</option>)}</select></label></>}
        {job?.outputUrl&&<><video src={job.outputUrl} controls playsInline preload="metadata" aria-label="Generated scene video"/><a className="outline-button" target="_blank" rel="noopener noreferrer" href={job.outputUrl}>Open / download video</a><p className="field-hint">Download your video while the link is available.</p></>}
        {(busy||active)&&<div className="drama-video-wait" role="status"><img src="/Cagentdraw.webp" alt=""/><p>{busy?'Preparing your stage…':'Making smooth moves for your scene…'}</p></div>}
        {state.mock&&<p className="field-hint">Local preview: edit your prompt here. Video generation is available on the live site.</p>}
        {state.configured===false&&!state.mock&&<p>The video API key needs to be connected.</p>}
        {job?.errorMessage&&<p className="error-text" role="alert">{job.errorMessage}</p>}{error&&<p className="error-text" role="alert">{error}</p>}
        <button className="suggestions-action" disabled={!sceneId||!prompt.trim()||busy||active||unknown||state.mock||!state.configured||Boolean(job?.outputUrl&&prompt===job.prompt&&duration===job.duration)} onClick={()=>void start()}>{busy||active?'Generating…':job?.outputUrl&&prompt===job.prompt&&duration===job.duration?'Video ready':jobStatus==='failed'?'Try again':'Generate video'}</button>
    </section>;
}
