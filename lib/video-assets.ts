import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';

function publicAddress(ip:string){
    if(ip.includes(':'))return !/^(?:\:\:|fc|fd|fe80|ff)/i.test(ip)&&!ip.includes('::ffff:');
    const [a,b]=ip.split('.').map(Number);
    return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&b===168||a===100&&b>=64&&b<=127);
}
export async function videoAsset(url:string,maxBytes=20*1024*1024):Promise<Buffer>{
    if(url.startsWith('/')&&!url.startsWith('//')){
        const root=resolve('public'),path=resolve(root,'.'+url);
        if(!path.startsWith(root+sep))throw new Error('Invalid local asset.');
        const data=await readFile(path);if(data.length>maxBytes)throw new Error('Asset is too large.');return data;
    }
    if(/^data:image\/(png|webp);base64,/.test(url)){const data=Buffer.from(url.split(',')[1],'base64');if(data.length>maxBytes)throw new Error('Asset is too large.');return data;}
    const parsed=new URL(url);
    const domains=['fal.media','fal.ai','volces.com','volccdn.com','bytecdn.cn',...(process.env.VIDEO_MEDIA_HOSTS||'').split(',').filter(Boolean)];
    if(process.env.APP_BASE_URL)domains.push(new URL(process.env.APP_BASE_URL).hostname);
    if(parsed.protocol!=='https:'||parsed.username||parsed.password||isIP(parsed.hostname)||!domains.some(host=>parsed.hostname===host||parsed.hostname.endsWith('.'+host)))throw new Error('Asset host is not allowed.');
    const addresses=await lookup(parsed.hostname,{all:true});
    if(!addresses.length||addresses.some(item=>!publicAddress(item.address)))throw new Error('Asset host is not public.');
    const response=await fetch(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
    if(!response.ok||!response.body)throw new Error('Asset download failed.');
    const chunks:Buffer[]=[];let size=0;
    const reader=response.body.getReader();
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes){await reader.cancel();throw new Error('Asset is too large.');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
    return Buffer.concat(chunks);
}
