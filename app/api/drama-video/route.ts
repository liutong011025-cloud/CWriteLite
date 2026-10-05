import {NextResponse} from 'next/server';
import {createHash,randomUUID} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/session';
import type {Story} from '@/lib/types';
import {isDrama,sceneTitle} from '@/lib/drama';
import {dramaRevisionHash} from '@/lib/video-pipeline';
import {SEEDANCE_VIDEO_MODEL} from '@/lib/ark-video-config';
import {localPreviewEnabled} from '@/lib/local-preview';
import {dramaStoryboard,DRAMA_VIDEO_VERSION} from '@/lib/drama-video-prompt';
import {dramaVideoReference} from '@/lib/drama-video-reference';
import {directVideoJob} from '@/lib/direct-video-job';
import {ArkVideoError,createSeedanceTask,videoFailureMessage,videoDurationLimit} from '@/lib/ark-video';
import {videoCallbackUrl} from '@/lib/video-callback';
export const maxDuration=120;
export const preferredRegion='hkg1';
const model=()=>process.env.ARK_VIDEO_MODEL?.trim()||SEEDANCE_VIDEO_MODEL;
const legacySnapshot=(story:Story)=>dramaRevisionHash(story,model()+'|direct-five-second-v2');
const snapshot=(story:Story)=>createHash('sha256').update(JSON.stringify({revision:dramaRevisionHash(story,model()+'|direct-storyboard-v3'),cast:story.characterSnapshots.map(c=>({id:c.id,name:c.name,species:c.species}))})).digest('hex');
export async function GET(request:Request){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    const saved=await prisma.story.findFirst({where:{id:new URL(request.url).searchParams.get('storyId')||'',userId:user.id}});
    if(!saved||!isDrama(saved as unknown as Story))return NextResponse.json({error:'Drama not found.'},{status:404});
    const story=saved as unknown as Story,snapshotHash=snapshot(story);
    const jobs=await prisma.videoJob.findMany({where:{storyId:story.id,userId:user.id,OR:[snapshotHash,legacySnapshot(story)].map(hash=>({plan:{path:['snapshotHash'],equals:hash}}))},include:{clips:true},orderBy:{createdAt:'desc'},take:60});
    const latest=new Map<string,ReturnType<typeof directVideoJob>>();
    for(const job of jobs)if(!latest.has(job.clips[0]?.sceneId))latest.set(job.clips[0]?.sceneId,directVideoJob(job));
    return NextResponse.json({status:'idle',renderVersion:DRAMA_VIDEO_VERSION,mock:localPreviewEnabled(),configured:Boolean(process.env.ARK_API_KEY?.trim()),scenes:story.canvas.drama!.scenes.map((s,i)=>({id:s.id,name:sceneTitle(i,s.name)})),jobs:[...latest.values()]});
}
export async function POST(request:Request){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    if(localPreviewEnabled())return NextResponse.json({error:'Local preview does not submit paid video tasks.'},{status:409});
    if(!process.env.ARK_API_KEY?.trim())return NextResponse.json({error:'The video API key needs to be connected.'},{status:503});
    const body=await request.json().catch(()=>({}));
    const saved=await prisma.story.findFirst({where:{id:String(body.storyId||''),userId:user.id}});
    if(!saved||!isDrama(saved as unknown as Story))return NextResponse.json({error:'Drama not found.'},{status:404});
    const story=saved as unknown as Story,scene=story.canvas.drama!.scenes.find(s=>s.id===body.sceneId);
    if(!scene?.backgroundImageUrl||!scene.actors.length)return NextResponse.json({error:'Choose a scene with a background and characters.'},{status:409});
    let storyboard:ReturnType<typeof dramaStoryboard>;
    try{storyboard=dramaStoryboard(story,scene,videoDurationLimit(model()));}
    catch(error){return NextResponse.json({error:error instanceof Error?error.message:'This scene is too long for one video.'},{status:409});}
    const {prompt,duration}=storyboard;
    const selectedModel=model(),snapshotHash=snapshot(story);
    const revisionHash=createHash('sha256').update(JSON.stringify({mode:'direct-v1',snapshotHash,sceneId:scene.id,prompt,duration})).digest('hex');
    let job=await prisma.videoJob.findUnique({where:{storyId_revisionHash:{storyId:story.id,revisionHash}},include:{clips:true}}),claimed=false;
    if(!job){try{
        job=await prisma.videoJob.create({data:{userId:user.id,storyId:story.id,revisionHash,model:selectedModel,status:'direct_preparing',plan:{mode:'direct-v1',snapshotHash,...storyboard,callbackNonce:randomUUID()},clips:{create:{sceneId:scene.id,sequence:0,duration,status:'preparing'}}},include:{clips:true}});claimed=true;
    }catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'))throw error;job=await prisma.videoJob.findUniqueOrThrow({where:{storyId_revisionHash:{storyId:story.id,revisionHash}},include:{clips:true}});}}
    if(job&&(job.status==='failed'&&body.retry===true||job.status==='needs_confirmation'&&body.noTaskConfirmed===true)){
        const result=await prisma.videoJob.updateMany({where:{id:job.id,status:job.status},data:{status:'direct_preparing',errorMessage:'',errorCode:'',outputUrl:'',plan:{...(job.plan as Prisma.JsonObject),callbackNonce:randomUUID()}}});
        claimed=Boolean(result.count);
        if(claimed)job=await prisma.videoJob.update({where:{id:job.id},data:{clips:{update:{where:{id:job.clips[0].id},data:{status:'preparing',providerTaskId:'',sourceUrl:'',error:''}}}},include:{clips:true}});
    }
    if(!job)return NextResponse.json({error:'Please try again.'},{status:503});
    if(!claimed)return NextResponse.json({job:directVideoJob(job)},{status:202});
    let submitting=false,taskId='';
    try{
        const frame=await dramaVideoReference(story,scene);
        await prisma.videoJob.update({where:{id:job.id},data:{status:'direct_submitting'}});submitting=true;
        taskId=await createSeedanceTask(prompt,'data:image/png;base64,'+frame.toString('base64'),duration,selectedModel,videoCallbackUrl(job.id,job.revisionHash+'|'+(job.plan as {callbackNonce?:string}).callbackNonce),true);
        const current=await prisma.videoJob.findUniqueOrThrow({where:{id:job.id},include:{clips:true}});
        if(current.status==='ready'||current.status==='failed')return NextResponse.json({job:directVideoJob(current)},{status:202});
        job=await prisma.videoJob.update({where:{id:job.id,status:'direct_submitting'},data:{status:'direct_generating',clips:{update:{where:{id:job.clips[0].id},data:{providerTaskId:taskId,status:'generating'}}}},include:{clips:true}});
        console.info('drama_video_submitted',{jobId:job.id,model:selectedModel,taskId});
    }catch(error){
        console.error('drama_video_provider_error',{jobId:job.id,model:selectedModel,phase:submitting?'submission':'reference',providerStatus:error instanceof ArkVideoError?error.status:undefined,providerCode:error instanceof ArkVideoError?error.code:undefined,requestId:error instanceof ArkVideoError?error.requestId:undefined,message:error instanceof Error?error.message.slice(0,500):'Unknown failure',taskId:taskId||undefined});
        const current=await prisma.videoJob.findUniqueOrThrow({where:{id:job.id},include:{clips:true}});
        if(current.status==='ready'||current.clips[0]?.providerTaskId)return NextResponse.json({job:directVideoJob(current)},{status:202});
        if(taskId){
            job=await prisma.videoJob.update({where:{id:job.id},data:{status:'direct_generating',clips:{update:{where:{id:job.clips[0].id},data:{providerTaskId:taskId,status:'generating'}}}},include:{clips:true}});
            return NextResponse.json({job:directVideoJob(job)},{status:202});
        }
        const uncertain=submitting&&(!(error instanceof ArkVideoError)||error.code==='needs_confirmation'||error.status>=500);
        job=await prisma.videoJob.update({where:{id:job.id},data:{status:uncertain?'needs_confirmation':'failed',errorCode:uncertain?'needs_confirmation':error instanceof ArkVideoError?error.code:'generation_failed',errorMessage:uncertain?'Submission result is unknown. Check the Ark task history before generating another video.':submitting?videoFailureMessage(error):'The stage picture could not be prepared. Check the saved background and character pictures.'},include:{clips:true}});
        console.error('drama_video_failed',{jobId:job.id,phase:submitting?'submission':'reference',code:job.errorCode});
    }
    return NextResponse.json({job:directVideoJob(job)},{status:202});
}
