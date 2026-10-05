'use client';
import {useEffect,useRef,useState} from 'react';
import {Clapperboard} from 'lucide-react';
import {api} from './common';
type Job={id:string;sceneId:string;status:string;errorCode?:string;errorMessage:string;outputUrl:string};
type Scene={id:string;name:string};
type State={scenes:Scene[];jobs:Job[];mock?:boolean;configured?:boolean};
const pending=(status?:string)=>['preparing','submitting','generating'].includes(status||'');
export default function DramaVideoPanel({storyId}:{storyId:string}){
    const [state,setState]=useState<State>({scenes:[],jobs:[]}),[busy,setBusy]=useState(false),[error,setError]=useState('');
    const submitting=useRef(false),mounted=useRef(true);
    const [retrying,setRetrying]=useState('');
    useEffect(()=>{
        mounted.current=true;let active=true;
        void api('/api/drama-video?storyId='+encodeURIComponent(storyId)).then((result:State)=>{if(active)setState(result);}).catch(e=>{if(active)setError(e.message);});
        return()=>{active=false;mounted.current=false;};
    },[storyId]);
    const pendingIds=state.jobs.filter(j=>pending(j.status)||j.status==='needs_confirmation').map(j=>j.id).sort().join('|');
    useEffect(()=>{
        if(!pendingIds)return;
        let active=true,timer:ReturnType<typeof setTimeout>;
        async function poll(){
            const results=await Promise.allSettled(pendingIds.split('|').map(id=>api('/api/drama-video/'+id)));
            if(!active)return;
            const updates=results.flatMap(result=>result.status==='fulfilled'?[result.value.job as Job]:[]);
            setState(s=>({...s,jobs:s.jobs.map(j=>updates.find(update=>update.id===j.id)||j)}));
            const failure=results.find(result=>result.status==='rejected');
            setError(failure?.status==='rejected'?'Checking your videos again shortly…':'');
            timer=setTimeout(poll,5000);
        }
        timer=setTimeout(poll,5000);return()=>{active=false;clearTimeout(timer);};
    },[pendingIds]);
    async function start(){
        if(submitting.current)return;submitting.current=true;setBusy(true);setError('');
        const scenes=state.scenes.filter(scene=>{const job=state.jobs.find(j=>j.sceneId===scene.id);return !job||job.status==='failed';});
        // Submit every scene immediately. Ark renders independently; the page only polls task IDs.
        const results=await Promise.allSettled(scenes.map(async scene=>{
            const r=await api('/api/drama-video',{storyId,sceneId:scene.id,retry:state.jobs.some(j=>j.sceneId===scene.id&&j.status==='failed')});
            if(mounted.current)setState(s=>({...s,jobs:[...s.jobs.filter(j=>j.sceneId!==scene.id),r.job]}));
        }));
        if(mounted.current){if(results.some(r=>r.status==='rejected'))setError('Some scenes could not start. Please try the remaining scenes again.');setBusy(false);}
        submitting.current=false;
    }
    async function retryUnsubmitted(sceneId:string){
        if(submitting.current)return;submitting.current=true;setRetrying(sceneId);setError('');
        try{
            const r=await api('/api/drama-video',{storyId,sceneId,noTaskConfirmed:true});
            if(mounted.current)setState(s=>({...s,jobs:[...s.jobs.filter(j=>j.sceneId!==sceneId),r.job]}));
        }catch(e){if(mounted.current)setError((e as Error).message);}
        finally{submitting.current=false;if(mounted.current)setRetrying('');}
    }
    const active=state.jobs.some(j=>pending(j.status)),remaining=state.scenes.some(s=>{const j=state.jobs.find(j=>j.sceneId===s.id);return !j||j.status==='failed';});
    const allReady=state.scenes.length>0&&state.scenes.every(s=>state.jobs.some(j=>j.sceneId===s.id&&Boolean(j.outputUrl)));
    return <section className="drama-video-panel"><h3><Clapperboard size={20}/>Drama video</h3>
        {(busy||active)&&<div className="drama-video-wait" role="status"><img src="/Cagentdraw.webp" alt=""/><p>Making your scenes come to life…</p></div>}
        {state.scenes.map(scene=>{const job=state.jobs.find(j=>j.sceneId===scene.id);return job?<div className="drama-video-result" key={scene.id}><h4>{scene.name}</h4>
            {job.outputUrl&&<><video src={job.outputUrl} controls playsInline preload="metadata" aria-label={scene.name+' video'}/><a className="outline-button" target="_blank" rel="noopener noreferrer" href={job.outputUrl}>Open / download video</a></>}
            {pending(job.status)&&<p role="status">Generating…</p>}{job.errorMessage&&<p className="error-text" role="alert">{job.errorMessage}</p>}
            {job.errorCode==='ModelNotOpen'&&<a className="outline-button" target="_blank" rel="noopener noreferrer" href="https://ark.volcengine.com/region:cn-beijing/openManagement?advancedActiveKey=model&projectName=default&tab=ComputerVision">Enable Seedance 2.5 in Ark</a>}
            {job.status==='needs_confirmation'&&<button className="outline-button" disabled={!!retrying||busy||active||state.mock} onClick={()=>void retryUnsubmitted(scene.id)}>{retrying===scene.id?'Submitting…':'I checked Ark: no task. Try again'}</button>}
        </div>:null;})}
        {error&&<p className="error-text" role="alert">{error}</p>}
        <button className="suggestions-action" disabled={!state.scenes.length||busy||!!retrying||active||state.mock||!state.configured||!remaining} onClick={()=>void start()}>{busy||active||retrying?'Generating…':allReady?'Videos ready':'Generate video'}</button>
    </section>;
}
