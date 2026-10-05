'use client';
import { useEffect, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { api } from './common';

type VideoState = {
    status?: string;
    missing?: string[];
    message?: string;
    job?: { id: string; status: string; errorMessage: string; outputUrl: string; downloadUrl?:string; clipCount: number; storedClips: number; sceneLabel?: string };
};

export default function DramaVideoPanel({ storyId }: { storyId: string }) {
    const [state, setState] = useState<VideoState>({});
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function load() {
        const result = await api('/api/drama-video?storyId=' + encodeURIComponent(storyId));
        setState(result);
    }
    useEffect(() => { void load().catch(reason => setError((reason as Error).message)); }, [storyId]);
    const jobId=state.job?.id,jobStatus=state.job?.status;
    useEffect(()=>{
        if(!jobId||!['planning','generating','rendering','storing'].includes(jobStatus||''))return;
        let cancelled=false,timer:ReturnType<typeof setTimeout>;
        async function poll(){try{const result=await api('/api/drama-video/'+jobId);if(!cancelled)setState(current=>({...current,job:result.job}));}catch(reason){if(!cancelled)setError((reason as Error).message);}finally{if(!cancelled)timer=setTimeout(poll,5000);}}
        timer=setTimeout(poll,5000);return()=>{cancelled=true;clearTimeout(timer);};
    },[jobId,jobStatus]);
    async function start(confirmRetry = false) {
        setBusy(true);
        setError('');
        try {
            const result = await api('/api/drama-video', { storyId, confirmRetry });
            setState(result);
            if (result.job?.id && result.job.status === 'generating') {
                const follow = await api('/api/drama-video/' + result.job.id);
                setState(current => ({ ...current, job: follow.job }));
            }
        }
        catch (reason) { setError((reason as Error).message); }
        finally { setBusy(false); }
    }
    const job = state.job;
    const needsConfig = !job?.outputUrl&&(state.status === 'needs_configuration' || Boolean(state.missing?.length));
    const retry=job?.status==='failed'||job?.status==='needs_confirmation';
    const active=Boolean(job&&['planning','generating','rendering','storing'].includes(job.status));
    return <section className="cream-panel final-check drama-video-panel"><h3><Clapperboard size={18}/> Drama video</h3>
        {needsConfig?<p>{state.message}</p>:job?.outputUrl?<><video src={job.outputUrl} controls/><a className="outline-button" href={job.downloadUrl||job.outputUrl}>Download MP4</a></>:<p>{job?`${job.sceneLabel||'Video'} · ${job.status.replaceAll('_',' ')}`:'Make a video of your saved script. Original words appear as subtitles; the video has no spoken audio.'}</p>}
        {job?.errorMessage&&<p className="error-text" role="alert">{job.errorMessage}</p>}{error&&<p className="error-text" role="alert">{error}</p>}
        {retry&&<p>Retry keeps completed clips. Generating a failed or unconfirmed clip again may cost money. Check the provider history first if the submission result is unknown.</p>}
        {!job?.outputUrl&&<button className="outline-button" disabled={busy||Boolean(needsConfig)||active} onClick={()=>void start(Boolean(retry))}>{busy?'Checking…':active?'Making your video…':retry?'Retry failed clips (may cost money)':'Generate video'}</button>}
    </section>;
}
