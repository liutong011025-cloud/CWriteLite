import {TosClient} from '@volcengine/tos-sdk';
import {createReadStream} from 'node:fs';
import {stat} from 'node:fs/promises';

function client() {
    return new TosClient({accessKeyId:process.env.TOS_ACCESS_KEY_ID!,accessKeySecret:process.env.TOS_SECRET_ACCESS_KEY!,region:process.env.TOS_REGION!,endpoint:process.env.TOS_ENDPOINT!.replace(/^https:\/\//,'')});
}
export async function storeVideoFile(key:string,path:string,contentType:string) {
    const size=(await stat(path)).size;
    await client().putObject({bucket:process.env.TOS_BUCKET!,key,body:createReadStream(path),contentLength:size,contentType});
    return `tos://${process.env.TOS_BUCKET}/${key}`;
}
export function videoAccessUrl(reference:string,download=false) {
    if(!reference.startsWith('tos://')) return '';
    const parsed=new URL(reference);
    if(parsed.hostname!==process.env.TOS_BUCKET) throw new Error('Invalid video storage reference.');
    return client().getPreSignedUrl({bucket:parsed.hostname,key:decodeURIComponent(parsed.pathname.slice(1)),expires:3600,response:download?{contentDisposition:'attachment; filename="My-drama.mp4"'}:undefined});
}
