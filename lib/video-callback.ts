import {createHmac,timingSafeEqual} from 'node:crypto';

export function videoCallbackToken(jobId:string,revisionHash:string){
    const key=process.env.ARK_API_KEY?.trim();
    if(!key)throw new Error('Video API is not configured.');
    return createHmac('sha256',key).update('drama-video-callback|'+jobId+'|'+revisionHash).digest('hex');
}
export function validVideoCallback(jobId:string,revisionHash:string,token:string){
    if(!/^[a-f0-9]{64}$/.test(token))return false;
    return timingSafeEqual(Buffer.from(token,'hex'),Buffer.from(videoCallbackToken(jobId,revisionHash),'hex'));
}
export function videoCallbackUrl(jobId:string,revisionHash:string){
    const base=process.env.APP_BASE_URL|| (process.env.VERCEL_PROJECT_PRODUCTION_URL?'https://'+process.env.VERCEL_PROJECT_PRODUCTION_URL:'');
    if(!base||!base.startsWith('https://'))return undefined;
    const url=new URL('/api/drama-video/callback',base);
    url.searchParams.set('jobId',jobId);url.searchParams.set('token',videoCallbackToken(jobId,revisionHash));
    return url.toString();
}
