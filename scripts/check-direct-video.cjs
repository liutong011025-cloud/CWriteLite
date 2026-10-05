const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module'),sharp=require('sharp');
const root=path.resolve(__dirname,'..'),originalLoad=Module._load;
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
let userId='owner',story,jobs=[],submissions=0,providerFailure=false,providerStatus=500;
const {Prisma}=require('@prisma/client');
const copy=value=>value?structuredClone(value):null;
const find=where=>jobs.find(j=>where.id?j.id===where.id:j.storyId===where.storyId_revisionHash.storyId&&j.revisionHash===where.storyId_revisionHash.revisionHash);
const prisma={story:{findFirst:async({where})=>where.id===story.id&&where.userId==='owner'?copy(story):null},videoJob:{
    findUnique:async({where})=>copy(find(where)),findUniqueOrThrow:async({where})=>{const j=find(where);assert.ok(j);return copy(j);},
    findFirst:async({where})=>copy(jobs.find(j=>j.id===where.id&&j.userId===where.userId)),
    findMany:async({where})=>copy(jobs.filter(j=>j.storyId===where.storyId&&j.userId===where.userId&&j.plan.snapshotHash===where.plan.equals).reverse()),
    create:async({data})=>{if(jobs.some(j=>j.revisionHash===data.revisionHash))throw new Prisma.PrismaClientKnownRequestError('duplicate',{code:'P2002',clientVersion:'6'});const j={...data,id:'job-'+jobs.length,errorMessage:'',outputUrl:'',updatedAt:new Date(),clips:[{...data.clips.create,id:'clip-'+jobs.length,providerTaskId:'',sourceUrl:''}]};jobs.push(j);return copy(j);},
    update:async({where,data})=>{const j=find(where);if(where.status&&!(typeof where.status==='string'?j.status===where.status:where.status.in.includes(j.status)))throw new Prisma.PrismaClientKnownRequestError('changed',{code:'P2025',clientVersion:'6'});const {clips,...patch}=data;Object.assign(j,patch,{updatedAt:new Date()});if(clips)Object.assign(j.clips[0],clips.update.data);return copy(j);},
    updateMany:async({where,data})=>{const j=find(where);if(!j||where.status&&where.status!==j.status)return {count:0};Object.assign(j,data,{updatedAt:new Date()});return {count:1};}
}};
Module._load=function(request,parent,isMain){
    if(request==='@/lib/prisma'||request==='./prisma')return {prisma};
    if(request==='@/lib/session')return {currentUser:async()=>({id:userId})};
    if(request.startsWith('@/'))request=path.join(root,request.slice(2));
    return originalLoad.call(this,request,parent,isMain);
};
process.env.NODE_ENV='test';process.env.APP_BASE_URL='https://c-write-lite.vercel.app';process.env.ARK_API_KEY='test-only-not-a-real-key';process.env.ARK_VIDEO_MODEL='doubao-seedance-2-5-260628';
global.fetch=async(url,init)=>{
    assert.ok(url.startsWith('https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks'));
    if(init.method==='POST'){
        submissions++;const body=JSON.parse(init.body);
        assert.ok(body.callback_url.startsWith('https://c-write-lite.vercel.app/api/drama-video/callback?'));assert.equal(body.ratio,'adaptive');assert.equal(body.duration,5);assert.equal(body.generate_audio,false);assert.equal(body.content[1].role,'first_frame');assert.ok(body.content[1].image_url.url.startsWith('data:image/png;base64,'));
        const info=await sharp(Buffer.from(body.content[1].image_url.url.split(',')[1],'base64')).metadata();assert.equal(info.width,1280);assert.equal(info.height,880);
        if(providerFailure)return Response.json({error:{message:'test server failure'}},{status:providerStatus});
        return Response.json({id:'cgt-test-'+submissions});
    }
    return Response.json({status:'succeeded',content:{video_url:'https://example.volccdn.com/video.mp4'}});
};
async function main(){
    const image=async(width,height,color)=>'data:image/png;base64,'+(await sharp({create:{width,height,channels:4,background:color}}).png().toBuffer()).toString('base64');
    story={id:'story',title:'Helping',userId:'owner',characterSnapshots:[{id:'fox',name:'Fox',imageUrl:await image(100,180,'#f00')}],canvas:{writingType:'drama',drama:{scenes:[{id:'scene',name:'Garden',backgroundImageUrl:await image(640,440,'#fff'),backgroundPrompt:'Garden',actors:[{characterId:'fox',x:50,y:90,scale:1,flipped:false}],lines:[{characterId:'fox',kind:'thought',text:'I wonder who needs help.'}]}]}}};
    const reference=require('../lib/drama-video-reference.ts'),{dramaMotionPrompt}=require('../lib/drama-video-prompt.ts');
    const png=await reference.dramaVideoReference(story,story.canvas.drama.scenes[0]);
    const sample=async(buffer,x,y)=>[...(await sharp(buffer).extract({left:x,top:y,width:1,height:1}).removeAlpha().raw().toBuffer())];
    assert.deepEqual(await sample(png,640,700),[255,0,0]);assert.deepEqual(await sample(png,10,10),[255,255,255]);
    const bigger=copy(story);bigger.canvas.drama.scenes[0].actors[0].scale=1.6;
    assert.deepEqual(await sample(png,400,700),[255,255,255]);assert.deepEqual(await sample(await reference.dramaVideoReference(bigger,bigger.canvas.drama.scenes[0]),400,700),[255,0,0]);
    assert.match(dramaMotionPrompt(story,story.canvas.drama.scenes[0]),/thinks silently/);
    const route=require('../app/api/drama-video/route.ts'),poll=require('../app/api/drama-video/[id]/route.ts');
    const request=(prompt='Gentle movement',sceneId='scene')=>new Request('http://localhost/api/drama-video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({storyId:'story',sceneId,prompt,duration:15})});
    await Promise.all([route.POST(request()),route.POST(request())]);assert.equal(submissions,1);assert.equal(jobs.length,1);assert.equal(jobs[0].clips[0].providerTaskId,'cgt-test-1');
    await route.POST(request());assert.equal(submissions,1);
    const result=await (await poll.GET(new Request('http://localhost'),{params:Promise.resolve({id:jobs[0].id})})).json();assert.equal(result.job.status,'ready');assert.ok(result.job.outputUrl.endsWith('.mp4'));
    const restored=await (await route.GET(new Request('http://localhost/api/drama-video?storyId=story'))).json();assert.equal(restored.jobs[0].id,jobs[0].id);assert.equal(restored.scenes.length,1);
    userId='other';assert.equal((await poll.GET(new Request('http://localhost'),{params:Promise.resolve({id:jobs[0].id})})).status,404);assert.equal((await route.POST(request())).status,404);userId='owner';
    story.canvas.drama.scenes[0].notes='A different motion';providerFailure=true;await route.POST(request());assert.equal(jobs[1].status,'needs_confirmation');await route.POST(request());assert.equal(submissions,2);

    const callback=require('../app/api/drama-video/callback/route.ts');const {videoCallbackUrl}=require('../lib/video-callback.ts');
    const unknown=jobs[1],signed=videoCallbackUrl(unknown.id,unknown.revisionHash+'|'+unknown.plan.callbackNonce);
    const notify=url=>new Request(url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id:'cgt-test-lost',status:'succeeded',content:{video_url:'https://attacker.example/fake.mp4'}})});
    assert.equal((await callback.POST(notify(signed.replace(/token=[^&]+/,'token='+'0'.repeat(64))))).status,403);
    const countBefore=submissions;assert.equal((await callback.POST(notify(signed))).status,200);assert.equal(submissions,countBefore);assert.equal(jobs[1].status,'direct_generating');await poll.GET(new Request('http://localhost'),{params:Promise.resolve({id:jobs[1].id})});assert.equal(jobs[1].status,'ready');assert.equal(jobs[1].clips[0].providerTaskId,'cgt-test-lost');assert.equal(jobs[1].outputUrl,'https://example.volccdn.com/video.mp4');
    assert.equal((await callback.POST(notify(signed))).status,200);assert.equal(jobs[1].status,'ready');
    story.canvas.drama.scenes[0].notes='Retry a lost submission';await route.POST(request());const retryJob=jobs[2],oldSigned=videoCallbackUrl(retryJob.id,retryJob.revisionHash+'|'+retryJob.plan.callbackNonce);
    const retryRequest=()=>new Request('http://localhost/api/drama-video',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({storyId:'story',sceneId:'scene',noTaskConfirmed:true})});
    await route.POST(request());assert.equal(submissions,countBefore+1);providerFailure=false;await Promise.all([route.POST(retryRequest()),route.POST(retryRequest())]);assert.equal(submissions,countBefore+2);assert.equal(jobs[2].status,'direct_generating');assert.equal((await callback.POST(notify(oldSigned))).status,403);
    providerFailure=true;providerStatus=400;story.canvas.drama.scenes[0].notes='Rejected access';await route.POST(request());assert.equal(jobs[3].status,'failed');providerStatus=500;
    providerFailure=false;jobs=[];submissions=0;story.canvas.drama.scenes.push({...copy(story.canvas.drama.scenes[0]),id:'scene-2'});
    await Promise.all([route.POST(request()),route.POST(request('ignored','scene-2')),route.POST(request())]);assert.equal(submissions,2);assert.equal(jobs.length,2);assert.ok(jobs.every(j=>j.clips[0].duration===5));
    const batch=await (await route.GET(new Request('http://localhost/api/drama-video?storyId=story'))).json();assert.equal(batch.jobs.length,2);assert.equal(batch.scenes.length,2);
    console.log('Passed: stage composition / scale, first-frame data URI, adaptive aspect, silent animation, concurrent deduplication, polling, ownership and ambiguous submission recovery. No paid API calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
