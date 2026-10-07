const assert=require('node:assert/strict'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {ProcessDelivery,PROCESS_DELIVERY}=require('../lib/process-delivery.ts');
const {ProcessEngine}=require('../lib/process-engine.ts');
function queue(){const pending=new Map(),recovery=new Map();return {pending,recovery,async read(){return [...pending.values()].slice(0,50);},async count(){return pending.size;},async settle(ids,rejected){for(const r of rejected)recovery.set(r.eventUid,r);for(const id of [...ids,...rejected.map(r=>r.eventUid)])pending.delete(id);}};}
async function run(){
 let clock=100000,requests=0,oldRequests=0,lostResponses=0,oldNext=clock+2500;
 const participants=Array.from({length:100},(_,i)=>{
  const q=queue(),stored=new Map(),expected=new Map(),oldQueue=new Map();let calls=0;
  const delivery=new ProcessDelivery(q,async rows=>{
   requests++;calls++;for(const row of rows)stored.set(row.eventUid,structuredClone(row));
   // Server commits, then the response is lost. Retrying must preserve IDs and deduplicate.
   if(i%10===0&&calls===2){lostResponses++;throw Error('connection lost after commit');}
   return {acknowledgedIds:rows.map(r=>r.eventUid),rejectedIds:[]};
  },()=>{},()=>clock,()=>i/100);
  const engine=new ProcessEngine('student-'+i,event=>{const row={...event,ownerId:'student-'+i};expected.set(row.eventUid,structuredClone(row));q.pending.set(row.eventUid,row);oldQueue.set(row.eventUid,row);},()=>clock);
  engine.context={stage:'write',workType:'story'};engine.start('recording');
  return {q,delivery,engine,stored,expected,oldQueue};
 });
 // Three minutes of simultaneous writing, revisions, canvas planning, AI use and background time.
 for(let step=0;step<=360;step++){
  clock=100000+step*500;
  for(const {engine} of participants){
   if(step%6===0&&step<350)engine.input('paragraph',step?'Old sentence':'','Sentence '+step);
   if(step===20)engine.event('PW_CANVAS_CONNECT',{from:'Luna',to:'Key',relation:'wants'});
   if(step===100)engine.event('RS_WRITE_TIPS_REQUEST',{requestId:'help'});
   if(step===110)engine.event('RS_AI_ACCEPT',{requestId:'help',suggestion:'motive'});
   if(step===200)engine.visibility(true);
   if(step===230)engine.visibility(false);
   engine.tick();
  }
  if(clock>=oldNext){for(const p of participants){if(p.oldQueue.size){oldRequests++;p.oldQueue.clear();}}oldNext+=2500;}
  await Promise.all(participants.map(p=>p.delivery.flush()));
 }
 for(const p of participants){p.engine.stop();if(p.oldQueue.size)oldRequests++;}
 for(let step=0;step<180&&participants.some(p=>p.q.pending.size);step++){
  clock+=1000;await Promise.all(participants.map(p=>p.delivery.flush()));
 }
 let total=0;
 for(const p of participants){assert.equal(p.q.pending.size,0);assert.deepEqual([...p.stored.keys()].sort(),[...p.expected.keys()].sort());for(const [id,row]of p.expected)assert.deepEqual(p.stored.get(id),row);total+=p.expected.size;}
 assert.equal(lostResponses,10);assert.ok(requests<oldRequests/3);
 // Receipt validation and a rejected row's recovery copy; no unrelated UID may clear the queue.
 const q=queue(),row=structuredClone(participants[0].expected.values().next().value);q.pending.set(row.eventUid,row);let receipt='foreign';
 const d=new ProcessDelivery(q,async()=>receipt==='foreign'?{acknowledgedIds:['another-event'],rejectedIds:[]}:{acknowledgedIds:[],rejectedIds:[row.eventUid],rejectionReasons:{[row.eventUid]:'outside_recording_window'}},()=>{},()=>clock,()=>0);
 await d.flush('resume');assert.equal(q.pending.size,1);receipt='reject';clock+=5000;await d.flush('resume');assert.equal(q.pending.size,0);assert.equal(q.recovery.get(row.eventUid).rejectedReason,'outside_recording_window');assert.equal(q.recovery.get(row.eventUid).clientTs,row.clientTs);
 // Closing a tab with a large payload retains it; a regular retry can still upload it.
 const large=queue();large.pending.set(row.eventUid,{...row,payload:{afterText:'a'.repeat(70000)}});let largeCalls=0;
 const largeDelivery=new ProcessDelivery(large,async rows=>{largeCalls++;return {acknowledgedIds:rows.map(r=>r.eventUid),rejectedIds:[]};},()=>{},()=>clock,()=>0);
 await largeDelivery.flush('exit');assert.equal(large.pending.size,1);assert.equal(largeCalls,0);await largeDelivery.flush('resume');assert.equal(large.pending.size,0);
 // A full backlog drains in bounded batches without a tight retry loop.
 const backlog=queue();for(let i=0;i<125;i++){const id=crypto.randomUUID();backlog.pending.set(id,{...row,eventUid:id});}const sizes=[];
 const drain=new ProcessDelivery(backlog,async rows=>{sizes.push(rows.length);return {acknowledgedIds:rows.map(r=>r.eventUid),rejectedIds:[]};},()=>{},()=>clock,()=>0);
 await drain.flush('resume');await drain.flush();assert.deepEqual(sizes,[50]);clock+=2000;await drain.flush();clock+=15000;await drain.flush();assert.deepEqual(sizes,[50,50,25]);assert.equal(backlog.pending.size,0);
 const report={participants:100,activitySeconds:180,events:total,eventsDelivered:total,eventLoss:0,lostResponsesRecovered:lostResponses,previousUploads:oldRequests,newUploads:requests,reductionPercent:Math.round((1-requests/oldRequests)*10000)/100,delivery:PROCESS_DELIVERY,scope:'Deterministic transport / aggregation simulation; not a production capacity test.'};
 fs.mkdirSync('outputs/process-load-20261007',{recursive:true});fs.writeFileSync('outputs/process-load-20261007/transport-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
