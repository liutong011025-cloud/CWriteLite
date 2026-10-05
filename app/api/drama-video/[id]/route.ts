import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {currentUser} from '@/lib/session';
import {publicVideoJob} from '@/lib/video-job';
export async function GET(_request:Request,context:{params:Promise<{id:string}>}){
    const user=await currentUser();if(!user)return NextResponse.json({error:'Please log in.'},{status:401});
    const {id}=await context.params;
    const job=await prisma.videoJob.findFirst({where:{id,userId:user.id},include:{clips:{orderBy:{sequence:'asc'}}}});
    if(!job)return NextResponse.json({error:'Video not found.'},{status:404});
    return NextResponse.json({job:publicVideoJob(job)});
}
