const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),load=Module._load,claims=new Map();
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
let state={},generated=0,removed=0,failure=false,user='owner';
const story={id:'story',userId:'owner',status:'published',chapterIndex:0,pin:{x:50,y:46},title:'Fox',content:'Fox helped Rabbit.',canvas:{nodes:[]}};
const prisma={story:{findFirst:async({where})=>where.userId===story.userId&&where.id===story.id?story:null,update:async()=>story},user:{findUniqueOrThrow:async()=>({mapState:structuredClone(state)}),update:async({data})=>{state=structuredClone(data.mapState);}},$queryRaw:async()=>[], $transaction:async fn=>fn(prisma)};
Module._load=function(request,parent,isMain){
 if(request==='@/lib/prisma')return {prisma};
 if(request==='@/lib/session')return {currentUser:async()=>user?{id:user}:null};
 if(request==='@/lib/fal-images')return {getFalKey:()=> 'fake-test-key',FAL_IMAGE_EDIT_MODEL:'fal-ai/nano-banana-2/edit',generateFalImage:async options=>{assert.equal(options.imageUrls.length,1);generated++;return {imageUrl:'https://fal.media/raw.webp',model:'fal-ai/nano-banana-2/edit',requestId:'request'};},removeBackground:async url=>{removed++;assert.match(url,/raw/);if(failure)throw new Error('Simulated failure');return 'https://fal.media/cutout.png';}};
 if(request==='@/lib/map-reference')return {mapReference:async()=> 'https://fal.media/reference.png'};
 if(request==='@/lib/local-preview')return {localPreviewEnabled:()=>false};
 if(request==='@/lib/asset-generation')return {claimAsset:async id=>{const old=claims.get(id);if(old&&old.status!=='failed')return {claimed:false,imageUrl:old.url||''};claims.set(id,{status:'processing'});return {claimed:true,imageUrl:''};},finishAsset:async(id,url)=>claims.set(id,{status:'ready',url}),failAsset:async id=>claims.set(id,{status:'failed'})};
 if(request.startsWith('@/'))request=path.join(root,request.slice(2));return load.call(this,request,parent,isMain);
};
process.env.NODE_ENV='test';
const route=require('../app/api/map-update/route.ts');
const post=async extra=>{const response=await route.POST(new Request('http://localhost',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({storyId:story.id,...extra})}));return {status:response.status,...await response.json()};};
async function main(){
 let r=await post();assert.equal(generated,1);assert.equal(removed,1);assert.equal(r.previewArt.backgroundRemoved,true);assert.equal(r.previewArt.originalImageUrl,'https://fal.media/raw.webp');assert.equal(r.previewArt.imageUrl,'https://fal.media/cutout.png');
 r=await post();assert.equal(r.reused,true);assert.equal(generated,1);assert.equal(removed,1);
 claims.clear();state.chapters[0].mapFlags[0].previewArt={imageUrl:'https://fal.media/legacy-raw.webp',version:'legacy',source:'fal'};
 r=await post({repairOnly:true});assert.equal(r.previewArt.backgroundRemoved,true);assert.equal(generated,1);assert.equal(removed,2);assert.equal(r.previewArt.version,'legacy');
 claims.clear();state.chapters[0].mapFlags[0].previewArt={imageUrl:'https://fal.media/legacy-raw.webp',version:'legacy',source:'fal'};failure=true;
 r=await post({repairOnly:true});assert.equal(r.error,'map_cutout_failed');assert.equal(r.previewArt.backgroundRemoved,false);assert.equal(r.previewArt.originalImageUrl,'https://fal.media/legacy-raw.webp');failure=false;
 r=await post({repairOnly:true});assert.equal(r.previewArt.backgroundRemoved,true);assert.equal(generated,1);
 state={};r=await post({repairOnly:true});assert.equal(r.skipped,true);assert.equal(generated,1);
 user='other';r=await post();assert.equal(r.error,'map_unavailable');assert.equal(generated,1);
 const {arrangeMapMarkers}=require('../lib/map-markers.ts');
 const markers=Array.from({length:8},(_,i)=>({id:String(i),x:400+i*15,y:200+i*10,width:142,height:44}));
 const arranged=arrangeMapMarkers(markers,1600,850);
 for(const a of arranged){assert.ok(a.x-a.width/2>=0&&a.x+a.width/2<=1600&&a.y-a.height>=0&&a.y<=850);for(const b of arranged)if(a.id!==b.id)assert.ok(a.x+a.width/2<=b.x-b.width/2||b.x+b.width/2<=a.x-a.width/2||a.y<=b.y-b.height||b.y<=a.y-a.height);}
 console.log('Passed: edit then background removal, separate caches, legacy cutout repair, failure/retry without regeneration, ownership, eight crowded titles stay apart. No paid API calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
