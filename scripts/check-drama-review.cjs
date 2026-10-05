const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),load=Module._load;
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);

const story={id:'story',title:'A visit',sections:['EdUHK: oo: Hi Tony, nice ride.'],characterSnapshots:[{id:'oo',name:'oo',species:'dog',traits:'brave'},{id:'tony',name:'Tony',species:'human'}],canvas:{writingType:'drama',drama:{activeScene:0,scenes:[{id:'school',name:'EdUHK',backgroundPrompt:'EdUHK campus',actors:[{characterId:'oo',x:30,y:90,scale:1},{characterId:'tony',x:70,y:90,scale:1}],lines:[{id:'hello',characterId:'oo',kind:'dialogue',text:'Hi Tony, nice ride.'},{id:'thought',characterId:'tony',kind:'thought',text:'I wonder where to park.'}]}]}}};
let reviewed=false;
Module._load=function(request,parent,isMain){
 if(request==='@/lib/session')return {currentUser:async()=>({id:'owner',vocabulary:[]})};
 if(request==='@/lib/local-preview')return {localPreviewEnabled:()=>false};
 if(request==='@/lib/prisma')return {prisma:{story:{findFirst:async()=>story},researchEvent:{findFirst:async()=>null,create:async()=>({id:'event'})}}};
 if(request==='@/lib/deepseek')return {chat:async options=>{
  const context=JSON.parse(options.messages[1].content);assert.equal(context.sections,undefined);assert.equal(context.canvas,undefined);
  const scene=context.reviewScenes[0];assert.equal(scene.location,'EdUHK campus');assert.equal(scene.sceneName,'EdUHK');
  assert.deepEqual(scene.cast,[{characterId:'oo',name:'oo',characterType:'dog'},{characterId:'tony',name:'Tony',characterType:'human'}]);
  assert.equal(scene.contributions[0].speakerName,'oo');assert.equal(scene.contributions[0].speakerId,'oo');assert.equal(scene.contributions[0].text,'Hi Tony, nice ride.');
  assert.equal(scene.contributions[1].kind,'thought');assert.equal(scene.contributions[1].speakerName,'Tony');assert.ok(!JSON.stringify(context).includes('brave'));
  reviewed=true;return JSON.stringify({ready:true,message:'Your characters share a clear moment on campus.',suggestions:[]});
 }};
 if(request.startsWith('@/'))request=path.join(root,request.slice(2));return load.call(this,request,parent,isMain);
};
process.env.NODE_ENV='test';
async function main(){const route=require('../app/api/ai/route.ts');const response=await route.POST(new Request('http://localhost/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'dramaReview',storyId:'story'})}));assert.equal(response.status,200);assert.equal((await response.json()).ready,true);assert.ok(reviewed);console.log('Passed: reviewer receives EdUHK as location, oo as a dog, every line with its speaker and thoughts distinguished; flattened sections and preset traits excluded. No paid calls.');}
main().catch(error=>{console.error(error);process.exitCode=1;});
