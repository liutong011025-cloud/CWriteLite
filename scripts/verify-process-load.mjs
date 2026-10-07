import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';

// Deliberately fixed to the dedicated local test database; never accepts a production URL.
const db=new PrismaClient({datasources:{db:{url:'postgresql://cwrite_test@127.0.0.1:54348/postgres'}}});
const base='http://127.0.0.1:3031',runId='load-'+randomUUID(),users=[],cookies=[],storyIds=[];
let recordingId,adminCookie,adminToken;
const metrics=[];
async function call(path,cookie,body,expected=200){
 const started=performance.now();const response=await fetch(base+path,{headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});
 const text=await response.text();assert.equal(response.status,expected,path+': '+text.slice(0,300));
 metrics.push({path,ms:Math.round(performance.now()-started),status:response.status});return JSON.parse(text);
}
async function session(userId){const value=randomUUID()+randomUUID(),token=createHash('sha256').update(value).digest('hex');await db.session.create({data:{token,userId,expiresAt:new Date(Date.now()+3600000)}});return {cookie:'cwritel_session='+value,token};}
try{
 const root=await fetch(base);assert.equal(root.status,503);assert.equal(root.headers.get('x-cwrite-maintenance'),'front-door');
 await call('/api/process-recording',null,null,401);await call('/api/process-events',null,{events:[]},401);
 assert.equal(await db.processRecording.count({where:{stoppedAt:null}}),0,'Refuse to interrupt another local recording.');
 const admin=await db.user.findUniqueOrThrow({where:{username:'Tony'},select:{id:true}});
 const adminSession=await session(admin.id);adminCookie=adminSession.cookie;adminToken=adminSession.token;
 for(let i=0;i<100;i++){const id=runId+'-'+i;users.push(id);}
 await db.user.createMany({data:users.map((id,i)=>({id,username:runId+'-student-'+i,password:'local-load-test-only'}))});
 for(const id of users){cookies.push((await session(id)).cookie);const story=await db.story.create({data:{userId:id,title:'Local load fixture',stage:'write',characterIds:[]}});storyIds.push(story.id);}
 await db.session.updateMany({where:{userId:users[0]},data:{expiresAt:new Date(Date.now()-1000)}});
 await call('/api/process-recording',cookies[0],null,401);
 await db.session.updateMany({where:{userId:users[0]},data:{expiresAt:new Date(Date.now()+3600000)}});
 await call('/api/process-recording',cookies[0],{action:'start'},403);
 const start=await call('/api/process-recording',adminCookie,{action:'start'});recordingId=start.active.id;
 const statusRows=await Promise.all(cookies.map(cookie=>call('/api/process-recording?lastRecordingId='+recordingId,cookie)));
 for(let i=0;i<100;i++){assert.equal(statusRows[i].userId,users[i]);assert.equal(statusRows[i].active.id,recordingId);assert.equal(statusRows[i].recordings,undefined);}
 const events=users.map((ownerId,i)=>Array.from({length:50},(_,j)=>({eventUid:randomUUID(),recordingId,sessionId:runId+'-'+i,sequence:j+1,code:j%2?'REV_TEXT_EDIT':'RS_AI_ACCEPT',clientTs:Date.now(),origin:'student',context:{stage:'write',workId:storyIds[i],workType:'story'},payload:{beforeText:'Original '+j,afterText:'Changed '+j}})));
 const concurrentStart=performance.now();
 await Promise.all([
  ...users.map((ownerId,i)=>call('/api/process-events',cookies[i],{expectedUserId:ownerId,events:events[i]}).then(receipt=>assert.deepEqual(receipt.acknowledgedIds,events[i].map(e=>e.eventUid)))),
  ...users.map((ownerId,i)=>call('/api/data',cookies[i],{action:'saveStory',story:{id:storyIds[i],title:'Saved under recording load',stage:'write',status:'draft',characterIds:[],sections:['Student '+i+' writing survived concurrent recording.','','','',''],activeSection:0}})),
 ]);
 const concurrentMs=Math.round(performance.now()-concurrentStart);
 // Lost receipts / replay produce a second 100-request burst, not duplicate research rows.
 await Promise.all(users.map((ownerId,i)=>call('/api/process-events',cookies[i],{expectedUserId:ownerId,events:events[i]})));
 assert.equal(await db.processEvent.count({where:{recordingId,userId:{in:users}}}),5000);
 const written=await db.story.findMany({where:{id:{in:storyIds}},select:{userId:true,sections:true}});assert.equal(written.length,100);
 for(const s of written)assert.equal(s.sections[0],'Student '+users.indexOf(s.userId)+' writing survived concurrent recording.');
 const persisted=await db.processEvent.findMany({where:{recordingId,userId:users[0]},orderBy:{sequence:'asc'}});
 for(let j=0;j<50;j++){assert.equal(persisted[j].eventUid,events[0][j].eventUid);assert.equal(persisted[j].clientTs.getTime(),events[0][j].clientTs);assert.equal(persisted[j].payload.afterText,events[0][j].payload.afterText);}
 await call('/api/process-events',cookies[0],{expectedUserId:'different-owner',events:[events[0][0]]},409);
 const stopped=await call('/api/process-recording',adminCookie,{action:'stop'});assert.equal(stopped.active,null);
 const late={...events[0][0],eventUid:randomUUID(),sequence:51};const after={...late,eventUid:randomUUID(),sequence:52,clientTs:new Date(stopped.recording.stoppedAt).getTime()+1000};
 const receipt=await call('/api/process-events',cookies[0],{expectedUserId:users[0],events:[late,after]});assert.deepEqual(receipt.acknowledgedIds,[late.eventUid]);assert.deepEqual(receipt.rejectedIds,[after.eventUid]);assert.equal(receipt.rejectionReasons[after.eventUid],'outside_recording_window');
 const ended=await call('/api/process-recording?lastRecordingId='+recordingId,cookies[0]);assert.equal(ended.active,null);assert.equal(ended.ended.stoppedAt,stopped.recording.stoppedAt);
 await call('/api/process-export?recordingId='+recordingId,cookies[0],null,403);
 const exported=await fetch(base+'/api/process-export?format=csv&recordingId='+recordingId,{headers:{Cookie:adminCookie}});assert.equal(exported.status,200);assert.equal(exported.headers.get('x-process-event-count'),'5001');const csv=await exported.text();assert.equal(csv.trimEnd().split('\r\n').length,5002);
 const groups=Object.fromEntries(['/api/process-recording','/api/process-events','/api/data'].map(path=>{const rows=metrics.filter(r=>r.path.startsWith(path)&&r.status===200).map(r=>r.ms).sort((a,b)=>a-b);return [path,{requests:rows.length,p50Ms:rows[Math.floor(rows.length*.5)],p95Ms:rows[Math.floor(rows.length*.95)],maxMs:rows.at(-1)}];}));
 const report={participants:100,concurrentRecordingUploads:100,concurrentDraftSaves:100,eventsStored:5001,duplicateEvents:0,draftsVerified:100,concurrentMs,groups,scope:'Real HTTP / PostgreSQL integration against local production build. Not Vercel / paid AI capacity validation.'};
 fs.mkdirSync('outputs/process-load-20261007',{recursive:true});fs.writeFileSync('outputs/process-load-20261007/api-check.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{
 if(recordingId){await db.processEvent.deleteMany({where:{recordingId}});await db.processRecording.deleteMany({where:{id:recordingId}});}
 await db.user.deleteMany({where:{id:{in:users}}});if(adminToken)await db.session.deleteMany({where:{token:adminToken}});await db.$disconnect();
}
