import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/session';
import {publicVideoJob} from '@/lib/video-job';
import {directVideoJob,pollDirectVideo} from '@/lib/direct-video-job';
import {localPreviewEnabled} from '@/lib/local-preview';
export const preferredRegion='hkg1';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    const {id}=await context.params;
    const job=await prisma.videoJob.findFirst({where:{id,userId:user.id},include:{clips:{orderBy:{sequence:'asc'}}}});
    if(!job)return NextResponse.json({error:'Video not found.'},{status:404});
    if((job.plan as {mode?:string}).mode==='direct-v1'){
        try{return NextResponse.json({job:directVideoJob(localPreviewEnabled()?job:await pollDirectVideo(job))});}
        catch{return NextResponse.json({error:'The video status could not be checked. Your task is kept; try checking again.'},{status:502});}
    }
    return NextResponse.json({job:publicVideoJob(job)});
}
