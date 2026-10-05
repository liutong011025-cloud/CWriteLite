import {NextResponse} from 'next/server';
import {prisma} from '@/lib/prisma';
import {validVideoCallback} from '@/lib/video-callback';
export const preferredRegion='hkg1';

/** The signed callback restores an accepted task even if its submission response was lost. */
export async function POST(request:Request){
    const url=new URL(request.url),jobId=url.searchParams.get('jobId')||'';
    const job=await prisma.videoJob.findUnique({where:{id:jobId},include:{clips:true}});
    const nonce=(job?.plan as {callbackNonce?:string}|undefined)?.callbackNonce;
    if(!job||!nonce||!process.env.ARK_API_KEY||!validVideoCallback(job.id,job.revisionHash+'|'+nonce,url.searchParams.get('token')||''))return NextResponse.json({error:'Invalid callback.'},{status:403});
    if((job.plan as {mode?:string}).mode!=='direct-v1')return NextResponse.json({error:'Invalid job.'},{status:409});
    const body=await request.json().catch(()=>({})),taskId=typeof body.id==='string'?body.id:'';
    if(!/^cgt-[a-zA-Z0-9-]+$/.test(taskId))return NextResponse.json({error:'Invalid task.'},{status:400});
    const clip=job.clips[0];
    if(!clip||clip.providerTaskId&&clip.providerTaskId!==taskId)return NextResponse.json({error:'Task does not match.'},{status:409});
    if(job.status==='ready'||job.status==='failed')return NextResponse.json({ok:true});
    try{
        await prisma.videoJob.update({where:{id:job.id,status:{in:['direct_submitting','needs_confirmation','direct_generating']}},data:{status:'direct_generating',errorCode:'',errorMessage:'',clips:{update:{where:{id:clip.id},data:{providerTaskId:taskId,status:'generating'}}}}});
    }catch(error){
        if(!(error instanceof Error)||!('code' in error)||error.code!=='P2025')throw error;
        return NextResponse.json({ok:true});
    }
    // Acknowledge within Ark's five-second window. Owner polling reads the authenticated
    // provider endpoint for the result; no output URL from this request is ever trusted.
    return NextResponse.json({ok:true});
}
