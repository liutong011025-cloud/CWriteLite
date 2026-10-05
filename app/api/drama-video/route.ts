import {NextResponse} from 'next/server';
import {Prisma} from '@prisma/client';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/session';
import type {Story} from '@/lib/types';
import {isDrama,dramaProblems} from '@/lib/drama';
import {dramaVideoPlan} from '@/lib/drama-video-plan';
import {dramaRevisionHash,groupVideoBeats,missingVideoConfig} from '@/lib/video-pipeline';
import {SEEDANCE_VIDEO_MODEL} from '@/lib/ark-video-config';
import {publicVideoJob,workerReady} from '@/lib/video-job';
import {localPreviewEnabled} from '@/lib/local-preview';
export const maxDuration=30;
const json=(value:unknown)=>value as Prisma.InputJsonValue;
const CONFIG_MESSAGE='Your script is saved. Video storage and the video service still need to be connected.';
export async function GET(request:Request){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    const storyId=new URL(request.url).searchParams.get('storyId')||'';
    const story=await prisma.story.findFirst({where:{id:storyId,userId:user.id}});
    if(!story||!isDrama(story as unknown as Story))return NextResponse.json({error:'Drama not found.'},{status:404});
    if(localPreviewEnabled())return NextResponse.json({status:'needs_configuration',message:'Local preview uses animation only. No paid video task will be created.',mock:true});
    const hash=dramaRevisionHash(story as unknown as Story,process.env.ARK_VIDEO_MODEL?.trim()||SEEDANCE_VIDEO_MODEL);
    const job=await prisma.videoJob.findFirst({where:{storyId,userId:user.id,revisionHash:hash},include:{clips:{orderBy:{sequence:'asc'}}}});
    const missing=missingVideoConfig();
    return NextResponse.json({status:missing.length?'needs_configuration':'idle',missing,message:missing.length?CONFIG_MESSAGE:'',job:job?publicVideoJob(job):undefined});
}
export async function POST(request:Request){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    if(localPreviewEnabled())return NextResponse.json({status:'needs_configuration',message:'Local preview uses animation only. No paid video task will be created.',mock:true});
    const body=await request.json().catch(()=>({}));
    const saved=await prisma.story.findFirst({where:{id:String(body.storyId||''),userId:user.id}});
    if(!saved||!isDrama(saved as unknown as Story))return NextResponse.json({error:'Drama not found.'},{status:404});
    const story=saved as unknown as Story;
    const problems=dramaProblems(story,true);if(problems.length)return NextResponse.json({error:problems[0]},{status:409});
    const missing=missingVideoConfig();if(missing.length)return NextResponse.json({status:'needs_configuration',missing,message:CONFIG_MESSAGE});
    if(!await workerReady())return NextResponse.json({error:'The video service is offline. Your script is saved; try again later.'},{status:503});
    const model=process.env.ARK_VIDEO_MODEL?.trim()||SEEDANCE_VIDEO_MODEL,revisionHash=dramaRevisionHash(story,model);
    const plan=dramaVideoPlan(story,{scenes:[]});
    let groups;try{groups=groupVideoBeats(plan.beats);}catch(error){return NextResponse.json({error:(error as Error).message},{status:409});}
    let job=await prisma.videoJob.findUnique({where:{storyId_revisionHash:{storyId:story.id,revisionHash}},include:{clips:{orderBy:{sequence:'asc'}}}});
    if(job&&['failed','needs_confirmation'].includes(job.status)&&body.confirmRetry===true){
        await prisma.$transaction(async tx=>{
            await tx.$queryRaw`SELECT id FROM "VideoJob" WHERE id = ${job!.id} FOR UPDATE`;
            const current=await tx.videoJob.findUniqueOrThrow({where:{id:job!.id}});
            if(!['failed','needs_confirmation'].includes(current.status))return;
            await tx.videoClip.updateMany({where:{jobId:current.id,status:{in:['failed','submitting','needs_confirmation']}},data:{status:'planned',providerTaskId:'',error:''}});
            await tx.videoJob.update({where:{id:current.id},data:{status:'planning',leaseUntil:null,errorCode:'',errorMessage:''}});
        });
        job=await prisma.videoJob.findUnique({where:{id:job.id},include:{clips:{orderBy:{sequence:'asc'}}}});
    }
    if(!job){try{
        job=await prisma.videoJob.create({data:{userId:user.id,storyId:story.id,revisionHash,model,status:'planning',plan:json({story,groups}),clips:{create:groups.map(group=>({sceneId:group.sceneId,sequence:group.sequence,duration:Math.max(4,Math.ceil(group.duration)),subtitle:json({beats:group.beats})}))}},include:{clips:{orderBy:{sequence:'asc'}}}});
    }catch(error){if(!(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002'))throw error;job=await prisma.videoJob.findUnique({where:{storyId_revisionHash:{storyId:story.id,revisionHash}},include:{clips:{orderBy:{sequence:'asc'}}}});}}
    return NextResponse.json({job:job?publicVideoJob(job):undefined},{status:202});
}
