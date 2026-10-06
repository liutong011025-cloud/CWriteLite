import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PrismaClient} from '@prisma/client';
import {chromium,request,expect} from '@playwright/test';
const base='http://127.0.0.1:3010',dbUrl='postgresql://cwrite_test@127.0.0.1:54348/postgres';
const db=new PrismaClient({datasources:{db:{url:dbUrl}}});
const admin=await request.newContext({baseURL:base}),student=await request.newContext({baseURL:base}),anon=await request.newContext({baseURL:base});
let userId,batchId,browser;
const output='outputs/process-verification';fs.mkdirSync(output,{recursive:true});
const username='ProcessCheck'+Date.now();
async function json(ctx,path,data){const r=await ctx.post(path,{data});assert.equal(r.status(),200,await r.text());return r.json();}
async function until(fn,ms=20000){const end=Date.now()+ms;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,250));}throw Error('Verification timed out');}
try{
 const setup=await (await anon.get('/api/local-setup')).json();assert.equal(setup.preview,true);assert.equal(setup.application,'cwrite-local-setup');
 await json(admin,'/api/auth',{username:'Tony',password:'123321'});
 const initial=await (await admin.get('/api/process-recording')).json();assert.equal(initial.active,null,'Leave any existing user recording untouched; run checks when recording is off.');
 const u=await json(student,'/api/auth',{action:'register',username,password:'ProcessOnly123321'});userId=u.user.id;
 assert.equal((await anon.get('/api/process-recording')).status(),401);
 assert.equal((await student.post('/api/process-recording',{data:{action:'start'}})).status(),403);
 assert.equal((await student.get('/api/process-export?recordingId=none')).status(),403);
 const starts=await Promise.all([json(admin,'/api/process-recording',{action:'start'}),json(admin,'/api/process-recording',{action:'start'})]);batchId=starts[0].active.id;assert.equal(starts[1].active.id,batchId);
 console.log('Passed recording controls: authenticated Tony only; concurrent starts share one batch.');
 const item={eventUid:crypto.randomUUID(),recordingId:batchId,sessionId:'api-check',sequence:1,code:'REV_TEXT_EDIT',clientTs:Date.now(),origin:'student',context:{stage:'write',workType:'story'},payload:{beforeText:'cat',afterText:'dog'}};
 assert.equal((await student.post('/api/process-events',{data:{expectedUserId:'wrong-owner',events:[item]}})).status(),409);
 const ack=await json(student,'/api/process-events',{expectedUserId:userId,events:[item]});if(!ack.acknowledgedIds.length)console.log({batch:starts[0].active.startedAt,clientTs:new Date(item.clientTs).toISOString(),ack});assert.deepEqual(ack.acknowledgedIds,[item.eventUid]);
 await json(student,'/api/process-events',{expectedUserId:userId,events:[item]});
 const duplicate=await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "ProcessEvent" WHERE "eventUid"=${item.eventUid}`;assert.equal(duplicate[0].n,1);
 const invalid=await json(student,'/api/process-events',{expectedUserId:userId,events:[{...item,eventUid:crypto.randomUUID(),code:'ADM_RECORD_START'}]});assert.equal(invalid.rejectedIds.length,1);
 const template=await db.story.findUniqueOrThrow({where:{id:'local-preview-story'}}),dramaTemplate=await db.story.findUniqueOrThrow({where:{id:'local-preview-drama'}});
 const story=await db.story.create({data:{userId,title:'Process check story',status:'published',stage:'write',characterIds:template.characterIds,characterSnapshots:template.characterSnapshots,canvas:template.canvas,sections:template.sections,content:template.content}});
 const drama=await db.story.create({data:{userId,title:'Process check drama',status:'published',stage:'drama-finish',characterIds:dramaTemplate.characterIds,characterSnapshots:dramaTemplate.characterSnapshots,canvas:dramaTemplate.canvas,sections:dramaTemplate.sections,content:dramaTemplate.content}});
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const studentBrowser=await browser.newContext({storageState:await student.storageState(),viewport:{width:1440,height:1000}}),adminBrowser=await browser.newContext({storageState:await admin.storageState(),viewport:{width:1440,height:1000}});
 const page=await studentBrowser.newPage(),tony=await adminBrowser.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));tony.on('pageerror',e=>errors.push(e.message));
 
 
 await tony.goto(base);await tony.locator('main[data-stage=farm]').waitFor({timeout:60000});await tony.getByRole('button',{name:'Behavior records'}).click();await tony.getByRole('button',{name:'Stop recording',exact:true}).waitFor();
 await tony.screenshot({path:output+'/tony-controls.png',fullPage:false});
 await page.goto(base);await page.locator('main[data-stage=farm]').waitFor({timeout:60000});assert.equal(await page.getByRole('button',{name:'Behavior records'}).count(),0);
 await page.locator('[data-farm-guide=board]').click();await page.locator('li').filter({hasText:'Process check story'}).getByRole('button',{name:'Edit',exact:true}).click();await page.locator('main[data-stage=write]').waitFor();
 const area=page.getByRole('textbox',{name:/Write .*Introduction/});const editor=await area.count()?area:page.locator('.writing-editor textarea');
 await editor.click();await editor.press('End');await editor.pressSequentially(' Extra check.',{delay:40});
 await until(async()=>{const s=await db.story.findUnique({where:{id:story.id}});return s.sections[0].endsWith(' Extra check.');});
 await page.route('**/api/process-events',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"test recording outage"}'}));
 await editor.pressSequentially(' Saves during recording outage.',{delay:15});
 await until(async()=>{const s=await db.story.findUnique({where:{id:story.id}});return s.sections[0].endsWith(' Saves during recording outage.');});
 await page.waitForTimeout(3100);await page.unroute('**/api/process-events');
 await until(async()=>{const r=await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "ProcessEvent" WHERE "recordingId"=${batchId} AND "userId"=${userId} AND "payload"->>'afterText' LIKE '%Saves during recording outage.'`;return r[0].n>0;});
 await page.waitForTimeout(10500);await editor.pressSequentially(' After a pause.');await page.waitForTimeout(3100);
 await until(async()=>{const r=await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "ProcessEvent" WHERE "recordingId"=${batchId} AND "userId"=${userId} AND "functionalCode"='PAUSE_INPUT_GAP' AND "durationMs">=10000`;return r[0].n>0;});
 await page.getByRole('button',{name:'Characters',exact:true}).click();await page.locator('.new-character-card').click();await page.locator('main[data-stage=studio]').waitFor();
 await page.getByRole('textbox',{name:'Character name',exact:true}).fill('Process drawing check');await page.getByRole('button',{name:'Character type: Fox',exact:true}).click();
 const sketch=page.locator('canvas[data-process-sketch]');await sketch.scrollIntoViewIfNeeded();const box=await sketch.boundingBox();assert.ok(box);
 await page.mouse.move(box.x+box.width*.2,box.y+box.height*.2);await page.mouse.down();await page.mouse.move(box.x+box.width*.6,box.y+box.height*.6,{steps:100});await page.mouse.up();await page.waitForTimeout(5700);
 const beforeErasing=await sketch.evaluate(canvas=>canvas.toDataURL());
 await page.getByRole('button',{name:'Eraser',exact:true}).click();await page.mouse.move(box.x+box.width*.3,box.y+box.height*.3);await page.mouse.down();await page.mouse.move(box.x+box.width*.45,box.y+box.height*.45,{steps:100});await page.mouse.up();await page.waitForTimeout(5700);
 await until(async()=>{const r=await db.$queryRaw`SELECT COUNT(*)::int AS n FROM "ProcessEvent" WHERE "recordingId"=${batchId} AND "userId"=${userId} AND "functionalCode" IN ('PW_DRAW_EPISODE','REV_DRAW_EPISODE')`;return r[0].n===2;});
 const drawing=await db.$queryRaw`SELECT "functionalCode","payload" FROM "ProcessEvent" WHERE "recordingId"=${batchId} AND "userId"=${userId} AND "functionalCode" IN ('PW_DRAW_EPISODE','REV_DRAW_EPISODE')`;assert.equal(drawing.find(r=>r.functionalCode==='PW_DRAW_EPISODE').payload.penStrokeCount,1);assert.equal(drawing.find(r=>r.functionalCode==='REV_DRAW_EPISODE').payload.eraserStrokeCount,1);
 await page.getByRole('button',{name:'Undo drawing',exact:true}).click();await until(async()=>await sketch.evaluate(canvas=>canvas.toDataURL())===beforeErasing);
 await page.getByRole('button',{name:'Generate portrait',exact:true}).click();await page.getByRole('button',{name:'Save character & continue',exact:true}).waitFor();await expect(page.getByRole('button',{name:'Save character & continue',exact:true})).toBeEnabled({timeout:30000});await page.getByRole('button',{name:'Save character & continue',exact:true}).click();await page.locator('main[data-stage=detail]').waitFor();
 assert.ok(await db.character.findFirst({where:{userId,name:'Process drawing check'}}));console.log('Passed actual drawing: 200 pointer movements become two episodes, pen / eraser counts correct; portrait generation and character saving work.');
 await page.getByRole('button',{name:'CWrite Lite home'}).click();await page.locator('main[data-stage=farm]').waitFor();await page.locator('[data-farm-guide=board]').click();await page.locator('li').filter({hasText:'Process check drama'}).getByRole('button',{name:'Edit',exact:true}).click();await page.locator('main[data-stage=drama-write]').waitFor();
 await page.getByRole('button',{name:'Review my drama',exact:true}).click();await page.getByRole('button',{name:'Continue anyway',exact:true}).click();await page.locator('main[data-stage=drama-finish]').waitFor();
 assert.equal(await page.getByText('Drama video',{exact:true}).count(),0);assert.equal(await page.getByRole('button',{name:'Generate video',exact:true}).count(),0);
 await page.getByRole('button',{name:'Download script',exact:true}).waitFor();await page.getByRole('button',{name:'Print script',exact:true}).waitFor();
 await page.screenshot({path:output+'/drama-video-hidden.png',fullPage:true});
 console.log('Passed browser flow: student controls hidden; typing autosaves during log-upload failure; cached records retry; actual 10-second pause captured; video hidden and script downloads retained.');
 await tony.getByRole('button',{name:'Stop recording',exact:true}).click();await tony.getByRole('button',{name:'Start recording',exact:true}).waitFor();
 const stopped=await (await admin.get('/api/process-recording')).json();assert.equal(stopped.active,null);await page.waitForTimeout(3500);
 const late={...item,eventUid:crypto.randomUUID(),clientTs:Date.now()+1000};const reject=await json(student,'/api/process-events',{expectedUserId:userId,events:[late]});assert.equal(reject.rejectedIds.length,1);
 // Isolated synthetic fixture checks complete pagination beyond the former 10,000-row export cap.
 await db.$executeRaw`INSERT INTO "ProcessEvent" ("eventUid","recordingId","userId","username","sessionId","sequence","eventId","functionalCode","category","subcategory","stage","workType","origin","clientTs","payload") SELECT ${batchId}||'-bulk-'||n::text,${batchId},${userId},${username},'bulk-check',n,'LITE_REV_TEXT_EDIT','REV_TEXT_EDIT','revision','修改','write','story','student',${new Date(item.clientTs)},'{"beforeText":"=1+1","afterText":"中文 export check"}'::jsonb FROM generate_series(1,10025) n`;
 const csv=await admin.get('/api/process-export?recordingId='+batchId+'&format=csv'),csvText=await csv.text();assert.equal(csv.status(),200);assert.ok(Number(csv.headers()['x-process-event-count'])>=10025);assert.ok(csvText.includes(batchId+'-bulk-10025'));assert.ok(csvText.includes('"\'=1+1"'));
 const xlsx=await admin.get('/api/process-export?recordingId='+batchId+'&format=xlsx');assert.equal(xlsx.status(),200);fs.writeFileSync(output+'/full-export-check.xlsx',await xlsx.body());fs.writeFileSync(output+'/export-expected-count.json',JSON.stringify({count:Number(xlsx.headers()['x-process-event-count'])}));
 assert.deepEqual(errors,[]);console.log('Passed deduplication, account isolation, stop cutoff, full 10,025+ row CSV / XLSX export and formula-safe cells.');
}finally{
 if(browser)await browser.close();
 if(batchId){await admin.post('/api/process-recording',{data:{action:'stop'}}).catch(()=>{});await db.$executeRaw`DELETE FROM "ProcessEvent" WHERE "recordingId"=${batchId}`;await db.$executeRaw`DELETE FROM "ProcessRecording" WHERE "id"=${batchId}`;}
 if(userId)await db.user.delete({where:{id:userId}});
 await Promise.all([admin.dispose(),student.dispose(),anon.dispose(),db.$disconnect()]);
}
