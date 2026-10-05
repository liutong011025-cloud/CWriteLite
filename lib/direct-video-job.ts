import type {VideoJob,VideoClip} from '@prisma/client';
import {prisma} from './prisma';
import {readSeedanceTask} from './ark-video';
export type DirectJob=VideoJob&{clips:VideoClip[]};
export function directVideoJob(job:DirectJob){
    return {id:job.id,sceneId:job.clips[0]?.sceneId,status:job.status.replace(/^direct_/,''),errorCode:job.errorCode,errorMessage:job.errorMessage,
        outputUrl:job.status==='ready'?job.outputUrl:'',prompt:(job.plan as {prompt?:string}).prompt||'',duration:job.clips[0]?.duration||5};
}
export async function pollDirectVideo(job:DirectJob){
    if(job.status==='direct_preparing'||job.status==='direct_submitting'){
        if(Date.now()-job.updatedAt.getTime()>180000){
            const changed=await prisma.videoJob.updateMany({where:{id:job.id,status:job.status,updatedAt:job.updatedAt},data:{status:'needs_confirmation',errorMessage:'Submission was interrupted. Check the Ark task history before submitting another video.'}});
            if(changed.count)return prisma.videoJob.findUniqueOrThrow({where:{id:job.id},include:{clips:true}});
        }
        return job;
    }
    if(job.status!=='direct_generating'||!job.clips[0]?.providerTaskId)return job;
    const clip=job.clips[0],result=await readSeedanceTask(clip.providerTaskId);
    if(result.status==='running')return job;
    if(result.status==='succeeded'&&!/^https:\/\//.test(result.videoUrl))throw new Error('The video is not available yet. Please try checking again.');
    return prisma.videoJob.update({where:{id:job.id},data:{status:result.status==='succeeded'?'ready':'failed',outputUrl:result.videoUrl,errorMessage:result.status==='failed'?(result.error||'This scene could not be generated. Please try again.'):'',clips:{update:{where:{id:clip.id},data:{status:result.status==='succeeded'?'ready':'failed',sourceUrl:result.videoUrl,error:result.error}}}},include:{clips:true}});
}
