import {videoAccessUrl} from './video-storage';
export function publicVideoJob(job:{id:string;status:string;errorCode:string;errorMessage:string;outputUrl:string;clips:{id:string;sceneId:string;sequence:number;status:string;error:string;storedUrl:string}[]}){
    const pending=job.clips.findIndex(clip=>!clip.storedUrl);
    return {id:job.id,status:job.status,errorCode:job.errorCode,errorMessage:job.errorMessage,outputUrl:job.status==='ready'?videoAccessUrl(job.outputUrl):'',downloadUrl:job.status==='ready'?videoAccessUrl(job.outputUrl,true):'',clipCount:job.clips.length,storedClips:job.clips.filter(c=>c.storedUrl).length,sceneLabel:`Clip ${pending<0?job.clips.length:pending+1} of ${job.clips.length}`,clips:job.clips.map(c=>({id:c.id,sceneId:c.sceneId,sequence:c.sequence,status:c.status,error:c.error}))};
}
export async function workerReady(){
    try{
        const base=new URL(process.env.VIDEO_WORKER_URL!);if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))return false;
        const response=await fetch(new URL('/health',base),{headers:{Authorization:`Bearer ${process.env.VIDEO_WORKER_SECRET}`},signal:AbortSignal.timeout(4000),cache:'no-store'});
        const result=await response.json();return response.ok&&result.ready===true&&result.version===1;
    }catch{return false;}
}
