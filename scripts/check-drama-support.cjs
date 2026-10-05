const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),Module=require('node:module');
const root=path.resolve(__dirname,'..'),load=Module._load;
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const story={id:'story',title:'At the park',characterSnapshots:[{id:'zhu-id',name:'Zhu',traits:'brave',strength:'ride fast',challenge:'fear'},{id:'friend-id',name:'Friend',traits:'kind'}],canvas:{writingType:'drama',drama:{mode:'tableau',activeScene:1,scenes:[{id:'earlier',actors:[{characterId:'friend-id'}],lines:[],backgroundPrompt:'A classroom'},{id:'current',actors:[{characterId:'zhu-id',scale:1,x:30,y:90},{characterId:'friend-id',scale:1,x:70,y:90}],lines:[{id:'line',characterId:'friend-id',kind:'dialogue',text:'Can we wait here?'}],backgroundPrompt:'A park',notes:'The friends wait near a tree.'}]}}};
let calls=0,alwaysWrong=false;
Module._load=function(request,parent,isMain){
 if(request==='@/lib/session')return {currentUser:async()=>({id:'owner',vocabulary:''})};
 if(request==='@/lib/local-preview')return {localPreviewEnabled:()=>false};
 if(request==='@/lib/prisma')return {prisma:{story:{findFirst:async()=>story},researchEvent:{findFirst:async()=>null,create:async()=>({id:'event'})}}};
 if(request==='@/lib/deepseek')return {chat:async options=>{
   calls++;const context=JSON.parse(options.messages[1].content);
   assert.deepEqual(context.characters,[{id:'zhu-id',name:'Zhu'},{id:'friend-id',name:'Friend'}]);
   assert.equal(context.canvas.drama.scenes.length,1);assert.equal(context.canvas.drama.scenes[0].id,'current');
   assert.equal(context.selectedNode.characterId,'zhu-id');assert.deepEqual(context.requestedContribution,{characterId:'zhu-id',kind:'dialogue'});assert.deepEqual(context.sections,[]);assert.equal(context.character,undefined);
   assert.ok(!JSON.stringify(context).includes('brave'));assert.ok(!JSON.stringify(context).includes('ride fast'));
   return JSON.stringify({suggestions:[{characterId:alwaysWrong||calls%2?'friend-id':'Zhu',kind:'Says',prompt:'What could Zhu say about waiting?',frame:'Could we wait near ___?',keywords:['wait','nearby','together']}],question:'Where could they wait?'});
 }};
 if(request.startsWith('@/'))request=path.join(root,request.slice(2));return load.call(this,request,parent,isMain);
};
process.env.NODE_ENV='test';
async function main(){
 const route=require('../app/api/ai/route.ts');
 const request=()=>new Request('http://localhost/api/ai',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({kind:'dramaTips',storyId:'story',canvas:story.canvas,selectedNode:{sceneId:'current',characterId:'zhu-id'},focus:'dialogue',character:{traits:'brave'}})});
 let response=await route.POST(request()),result=await response.json();assert.equal(response.status,200);assert.equal(calls,2);assert.equal(result.suggestions[0].characterId,'zhu-id');
 alwaysWrong=true;response=await route.POST(request());result=await response.json();assert.equal(response.status,422);assert.equal(calls,4);assert.ok(result.error);
 console.log('Passed: scene-only AI context, no cast traits or fixed roles, invalid response automatically retried, unique speaker name resolves to ID, persistent mismatch never inserts another actor\'s line. No paid AI calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
