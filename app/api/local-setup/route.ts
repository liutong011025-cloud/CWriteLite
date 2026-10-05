import {NextResponse} from 'next/server';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const keys=['DEEPSEEK_API_KEY','FAL_KEY','ARK_API_KEY','ARK_VIDEO_MODEL'] as const;
function local(request:Request){
    const url=new URL(request.url);
    if(process.env.NODE_ENV!=='development'||!['localhost','127.0.0.1'].includes(url.hostname))return false;
    const origin=request.headers.get('origin');
    return request.method==='GET'||origin===url.origin;
}
export async function GET(request:Request){
    if(!local(request))return NextResponse.json({error:'Not found.'},{status:404});
    return NextResponse.json({application:'cwrite-local-setup',preview:process.env.CWRITE_LOCAL_PREVIEW==='true',configured:Object.fromEntries(keys.map(key=>[key,Boolean(process.env[key])]))},{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request){
    if(!local(request))return NextResponse.json({error:'Not found.'},{status:404});
    if(!request.headers.get('content-type')?.startsWith('application/json'))return NextResponse.json({error:'Invalid request.'},{status:400});
    const body=await request.json();const updates:Record<string,string>={};
    for(const key of keys){const value=String(body[key]||'').trim();if(!value)continue;if(value.length>1000||/[\r\n\0]/.test(value))return NextResponse.json({error:'Invalid setting.'},{status:400});updates[key]=value;}
    const path=resolve('.env.local');const old=await readFile(path,'utf8').catch(()=> '');
    const lines=old.split(/\r?\n/).filter(line=>!Object.keys(updates).some(key=>line.startsWith(key+'=')));
    await writeFile(path,lines.filter(Boolean).join('\n')+'\n'+Object.entries(updates).map(([key,value])=>`${key}=${JSON.stringify(value)}`).join('\n')+'\n',{mode:0o600});
    for(const [key,value] of Object.entries(updates))process.env[key]=value;
    return NextResponse.json({saved:true,configured:Object.fromEntries(keys.map(key=>[key,Boolean(process.env[key])]))},{headers:{'Cache-Control':'no-store'}});
}
