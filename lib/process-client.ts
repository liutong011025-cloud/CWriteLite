'use client';
import { ProcessEngine } from './process-engine';
import { subscribeProcess } from './process-bus';
import { compactProcessPayload } from './process-payload';
import { type ProcessContext, type ProcessRecord } from './process-coding';

type Queued = ProcessRecord & { ownerId: string };
type Status = { pending: number; error: string; activeId: string | null; dropped: number };
let currentStatus: Status = { pending: 0, error: '', activeId: null, dropped: 0 };
const statusListeners = new Set<(s: Status) => void>();
export function subscribeProcessStatus(fn: (s: Status) => void) { statusListeners.add(fn); fn(currentStatus); return () => { statusListeners.delete(fn); }; }
function status(patch: Partial<Status>) { currentStatus = { ...currentStatus, ...patch }; for (const fn of statusListeners) { try { fn(currentStatus); } catch {} } }
function openQueue(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('cwrite-lite-process-v1', 1);
    req.onupgradeneeded = () => { const store = req.result.createObjectStore('events', { keyPath: 'eventUid' }); store.createIndex('ownerId', 'ownerId'); };
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); req.onblocked = () => reject(new Error('Recording cache is blocked.'));
  });
}
function queueWrite(db: IDBDatabase, rows: Queued[], remove: string[] = []) {
  return new Promise<void>((resolve, reject) => { const tx = db.transaction('events', 'readwrite'), store = tx.objectStore('events'); for (const row of rows) store.put(row); for (const id of remove) store.delete(id); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error); });
}
function queueRead(db: IDBDatabase, owner: string) {
  return new Promise<Queued[]>((resolve, reject) => { const req=db.transaction('events').objectStore('events').index('ownerId').getAll(owner, 50); req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error); });
}
const eventMap: Record<string,string> = { idea_pack_opened:'NAV_LIBRARY_VIEW', idea_pack_character_saved:'PROD_CHARACTER_SAVE', canvas_node_added:'PW_CANVAS_NODE_ADD', canvas_connection_created:'PW_CANVAS_CONNECT', canvas_element_removed:'REV_ELEMENT_REMOVE', suggestion_accepted:'RS_AI_ACCEPT', suggestion_rejected:'RS_AI_REJECT', suggestions_dismissed:'RS_AI_DISMISS', section_changed:'NAV_PAGE', canvas_readiness_skipped:'NAV_UI_ACTION' };
const aiCodes: Record<string,string> = { image:'RS_IMAGE_REQUEST', characterTips:'RS_CHAR_TIPS_REQUEST', canvas:'RS_CANVAS_IDEAS_REQUEST', tips:'RS_WRITE_TIPS_REQUEST', dramaTips:'RS_DRAMA_TIPS_REQUEST', chat:'RS_CHAT_REQUEST', canvasReview:'RS_REVIEW_REQUEST', dramaReview:'RS_REVIEW_REQUEST', dramaVideoPlan:'RS_REVIEW_REQUEST', coach:'SYS_COACH_REQUEST', growth:'SYS_GROWTH_RESULT' };
const value = (v: unknown) => v && typeof v === 'object' ? v as Record<string, any> : {};

export function startProcessClient(ownerId: string, initial: ProcessContext) {
  let disposed=false, uploading=false, checking=false, lastSuccess=0, semanticAt=0, clockOffset=0;
  const now = () => Date.now()+clockOffset;
  let sketchBefore: string|undefined;
  const memory = new Map<string,Queued>();
  let sessionId: string;
  try { sessionId=sessionStorage.getItem('cwrite-process-session:'+ownerId)||crypto.randomUUID();sessionStorage.setItem('cwrite-process-session:'+ownerId,sessionId); } catch { sessionId=crypto.randomUUID(); }
  // Each mounted observer has its own unique session; reloads keep queued records with their original identity.
  sessionId += '_'+crypto.randomUUID().slice(0,8);
  const dbPromise=openQueue(); dbPromise.catch(()=>status({error:'Local recording cache unavailable; records will retry while this page stays open.'}));
  let persistence=Promise.resolve();
  const engine=new ProcessEngine(sessionId,event=>{
    if(memory.size>=300){status({error:'Recording buffer is full. Some records could not be cached. Writing is unaffected.',dropped:currentStatus.dropped+1});return;}
    const queued={...event,ownerId};
    if((event.code==='PW_DRAW_EPISODE'||event.code==='REV_DRAW_EPISODE')) {
      const canvas=document.querySelector<HTMLCanvasElement>('canvas[data-process-sketch]');
      if(canvas) { try { const sketchAfter=canvas.toDataURL('image/jpeg',0.75);queued.payload={...queued.payload,sketchBefore,sketchAfter};sketchBefore=sketchAfter; } catch {} }
    }
    queued.payload=compactProcessPayload(queued.payload);
    memory.set(event.eventUid,queued);status({pending:memory.size});
    persistence=persistence.then(async()=>{try{const db=await dbPromise;await queueWrite(db,[queued]);memory.delete(event.eventUid);}catch{ /* Keep in memory for a retry; do not interrupt writing. */ }});
  }, now);
  engine.context=initial;
  const inputValues=new WeakMap<HTMLInputElement|HTMLTextAreaElement,string>();
  const inputFields=new WeakMap<HTMLInputElement|HTMLTextAreaElement,string>();
  const aiFields=new Set<string>();
  let activeInput: HTMLInputElement|HTMLTextAreaElement|null=null;
  let drag: { el:HTMLElement; code:string; before:string; at:number; x:number; y:number; context:ProcessContext }|null=null;
  const requests=new Map<string,{context:ProcessContext;started:number;code:string;recordingId:string}>();
  const ignored=(el:Element)=>!!el.closest('[data-process-ignore]');
  function inputTarget(target: EventTarget|null) {
    if(!(target instanceof HTMLInputElement||target instanceof HTMLTextAreaElement)||ignored(target)||target.disabled)return null;
    if(target instanceof HTMLInputElement && !['text','search','number',''].includes(target.type))return null;
    const label=target.getAttribute('aria-label')||target.name||target.closest('label')?.textContent?.trim().slice(0,100)||target.placeholder;
    if(/password|secret|token|api.?key|email/i.test(label||''))return null;
    return {el:target,label:label||'text_field'};
  }
  function fieldFor(el:HTMLInputElement|HTMLTextAreaElement,label:string) {
    const field=[engine.context.workId||engine.context.characterId||'platform',engine.context.stage,engine.context.sceneId??engine.context.sectionIndex??'',label].join(':');inputFields.set(el,field);return field;
  }
  function inputCode(el:HTMLInputElement|HTMLTextAreaElement,label:string) {
    if(el.dataset.processCode)return el.dataset.processCode;
    const stage=engine.context.stage;
    if(/search|find a|find your/i.test(label))return 'NAV_LIBRARY_VIEW';
    if(/title/i.test(label))return 'REV_TITLE_EDIT';
    if(stage==='studio')return engine.context.characterId?'REV_CHAR_EDIT':/character type/i.test(label)?'PW_CHAR_TYPE':'PW_CHAR_DETAILS';
    if(stage==='canvas')return 'PW_CANVAS_LABEL';
    if(stage.startsWith('drama')&&/scene name|directions|background|setting/i.test(label))return 'DR_SCENE_SETUP';
    if(stage==='write'||stage==='drama-write'||stage==='drama-scenes'&&el.closest('.drama-bubble-editor'))return undefined;
    return 'NAV_UI_ACTION';
  }
  function focus(e:Event) {const t=inputTarget(e.target);if(t){inputValues.set(t.el,t.el.value);activeInput=t.el;fieldFor(t.el,t.label);}}
  function input(e:Event) {
    if(!engine.recordingId)return;const t=inputTarget(e.target);if(!t)return;
    const ev=e as InputEvent;if(ev.isComposing)return;
    const before=inputValues.get(t.el)??'',after=t.el.value;inputValues.set(t.el,after);activeInput=t.el;
    const code=inputCode(t.el,t.label),source=aiFields.has(fieldFor(t.el,t.label))?'mixed_ai_student':'student_typed';
    engine.input(fieldFor(t.el,t.label),before,after,{inputType:ev.inputType||'',code,source});
  }
  function blur(e:Event){const t=inputTarget(e.target);if(t){engine.flushText(fieldFor(t.el,t.label),'field_blur');if(activeInput===t.el)activeInput=null;}}
  function markAIFields() { requestAnimationFrame(()=>{if(disposed)return;for(const el of document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input,textarea')){const t=inputTarget(el);if(t&&inputValues.has(el)&&inputValues.get(el)!==el.value){aiFields.add(fieldFor(el,t.label));inputValues.set(el,el.value);}}}); }
  function pointerDown(e:PointerEvent){
    if(!engine.recordingId||e.button!==0||!(e.target instanceof Element)||ignored(e.target))return;
    const canvas=e.target.closest<HTMLCanvasElement>('canvas[data-process-sketch]');
    if(canvas){if(!engine.drawingActive){try{sketchBefore=canvas.toDataURL('image/jpeg',0.75);}catch{}}engine.strokeStart(canvas.dataset.processTool||'pencil',canvas.dataset.processColor||'',canvas.dataset.processTarget||'sketch');return;}
    const el=e.target.closest<HTMLElement>('[data-process-drag]');if(el) {engine.activity(el.dataset.processDrag!);drag={el,code:el.dataset.processDrag!,before:el.dataset.processState||'',at:Date.now(),x:e.clientX,y:e.clientY,context:{...engine.context}};}
  }
  function pointerMove(e:PointerEvent){if(!engine.recordingId)return;if(e.target instanceof Element&&e.target.closest('canvas[data-process-sketch]'))engine.strokeMove();if(drag)engine.lastActivity=now();}
  function pointerUp(e:PointerEvent){engine.strokeEnd(e.type==='pointercancel');if(drag){const d=drag;drag=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>3){setTimeout(()=>{const after=d.el.dataset.processState||'';if(!disposed&&after!==d.before)engine.event(d.code,{targetId:d.el.dataset.processTarget,beforeState:d.before,afterState:after,elapsedMs:Date.now()-d.at});},0);}}}
  function click(e:MouseEvent) {
    if(!engine.recordingId||!(e.target instanceof Element)||ignored(e.target))return;
    const el=e.target.closest<HTMLElement>('button,a,[role="button"]');if(!el||el.hasAttribute('disabled')||el.getAttribute('aria-disabled')==='true')return;
    const label=el.getAttribute('aria-label')||el.getAttribute('title')||el.innerText?.trim().slice(0,200)||el.dataset.processCode||'control',at=Date.now(),stage=engine.context.stage;
    if(el.dataset.processCode){engine.event(el.dataset.processCode,{control:label,targetId:el.dataset.processTarget,contentSource:el.dataset.processSource});semanticAt=at;return;}
    // Request/semantic handlers in this same interaction take precedence over a generic click.
    setTimeout(()=>{if(disposed||semanticAt>=at)return;let code='NAV_UI_ACTION';if(/growth record/i.test(label)||el.matches('.farm-soil-label'))code='FARM_TREE_VIEW';else if(el.closest('.ai-suggestions,.connection-suggestions,.drama-suggestion-results,.tips-box'))code='RS_AI_PANEL_INSPECT';else if(/examples|example-tab/i.test(label))code='NAV_EXAMPLE_VIEW';else if(el.closest('.page-guide,.farm-guide'))code='NAV_GUIDE_VIEW';else if(/download|print|save animation plan|open \/ download/i.test(label))code='PROD_WORK_EXPORT';else if(/Says|Thinks/.test(label)&&el.closest('.drama-bubble-kinds'))code='DR_LINE_MODE';engine.event(code,{control:label,targetId:el.dataset.processTarget,stageAtClick:stage,href:el instanceof HTMLAnchorElement?el.getAttribute('href'):undefined});},0);
  }
  function keyboard(e:KeyboardEvent){if(!engine.recordingId||!(e.target instanceof Element)||ignored(e.target))return;if(e.key.startsWith('Arrow')){engine.activity('NAV_UI_ACTION');const el=e.target.closest<HTMLElement>('[data-process-drag]');if(el){const before=el.dataset.processState;setTimeout(()=>{if(el.dataset.processState!==before)engine.event(el.dataset.processDrag!,{targetId:el.dataset.processTarget,beforeState:before,afterState:el.dataset.processState,inputMethod:'keyboard'});},0);}}}
  const unsubscribe=subscribeProcess(message=>{
    if(message.kind==='context'){engine.setContext(message.context);return;}
    if(!engine.recordingId)return;
    if(message.kind==='event'){semanticAt=Date.now();engine.event(message.code,typeof message.payload==='function'?message.payload():message.payload,message.origin);if(message.code==='RS_AI_ACCEPT')markAIFields();return;}
    const b=value(message.body);
    if(message.kind==='request') {
      if(message.path.startsWith('/api/ai')||message.path==='/api/dify-cagent-guide'){const code=message.path==='/api/dify-cagent-guide'?'RS_CHAT_REQUEST':aiCodes[b.kind||'chat'];if(code){semanticAt=Date.now();const origin=['coach','growth'].includes(b.kind)?'auto_agent':'student';engine.event(code,{requestId:message.id,kind:b.kind,question:b.message||b.userMessage,description:b.description,focus:b.focus,selectedNode:b.selectedNode,sectionIndex:b.section,contentSource:'unknown',status:'requested'},origin);requests.set(message.id,{context:{...engine.context},started:now(),code,recordingId:engine.recordingId!});engine.waitingRequests.add(message.id);}}
      else if(message.path==='/api/data'&&b.action==='event'){const code=eventMap[b.type];if(code){semanticAt=Date.now();engine.event(code,value(b.payload));if(code==='RS_AI_ACCEPT')markAIFields();}}
      else if(b.action&&['saveCharacter','newStory','deleteStory','deleteCharacter'].includes(b.action)||message.path==='/api/reviews'||message.path==='/api/section-gate'||message.path==='/api/drama-video') {semanticAt=Date.now();engine.flushAll('request');if(message.path==='/api/section-gate')engine.event('PROD_SECTION_COMMIT',{requestId:message.id,sectionIndex:b.section,constraintType:'required_gate',status:'requested'});else if(message.path==='/api/drama-video')engine.event('RS_VIDEO_REQUEST',{requestId:message.id,sceneId:b.sceneId,retry:b.retry});}
      return;
    }
    const r=value(message.result),p=requests.get(message.id);
    if(p){requests.delete(message.id);engine.waitingRequests.delete(message.id);if(p.recordingId!==engine.recordingId)return;engine.interval('PAUSE_AI_WAIT',{requestId:message.id,kind:b.kind,status:message.error?'failed':'received'},p.started,now());engine.event(b.kind==='image'?'SYS_IMAGE_READY':'SYS_AI_RESULT',{requestId:message.id,serverRequestId:r.requestId,kind:b.kind,status:message.error?'failed':'received',error:message.error,result:b.kind==='image'?{imageUrl:r.imageUrl,spriteStatus:r.spriteStatus}:r,latencyMs:Math.max(0,now()-p.started),mocked:!!r.mock,requestContext:p.context},'system');return;}
    const success=!message.error;
    if(message.path==='/api/data') {
      const codes:Record<string,string>={saveCharacter:'PROD_CHARACTER_SAVE',newStory:'PW_WORK_CREATE',deleteStory:'PROD_DRAFT_DELETE',deleteCharacter:'REV_ELEMENT_REMOVE'};
      const code=codes[b.action]||(b.action==='saveStory'?(b.story?.status==='published'?'PROD_WORK_SAVE':'SYS_AUTO_SAVE'):undefined);
      if(code)engine.event(code,{requestId:message.id,status:success?'success':'failed',error:message.error,targetId:r.character?.id||r.story?.id||b.id,workId:r.story?.id,workType:b.writingType,character:b.action==='saveCharacter'?r.character:undefined,version:r.story?.updatedAt},code==='SYS_AUTO_SAVE'?'system':'student');
    } else if(message.path==='/api/reviews')engine.event('SOC_FEEDBACK_SEND',{requestId:message.id,status:success?'success':'failed',...b,error:message.error});
    else if(message.path==='/api/section-gate')engine.event('SYS_AI_RESULT',{requestId:message.id,kind:'section_gate',constraintType:'required_gate',result:r,status:success?'received':'failed',latencyMs:Date.now()-message.at},'platform_gate');
    else if(message.path==='/api/drama-video')engine.event('SYS_VIDEO_RESULT',{requestId:message.id,result:r,status:success?'received':'failed',error:message.error},'system');
  });
  async function flush(unload=false) {
    if(disposed||uploading)return;uploading=true;
    try {
      await persistence;
      let db:IDBDatabase|null=null;try{db=await dbPromise;}catch{}
      const saved=db?await queueRead(db,ownerId):[],rows=[...saved,...memory.values()].filter((r,i,all)=>all.findIndex(s=>s.eventUid===r.eventUid)===i).slice(0,50);
      if(!rows.length){status({pending:0});return;}
      const batch:Queued[]=[];let bytes=0;
      for(const row of rows){const size=new TextEncoder().encode(JSON.stringify(row)).length;if(batch.length&&bytes+size>900000)break;batch.push(row);bytes+=size;}
      const body=JSON.stringify({expectedUserId:ownerId,events:batch});
      if(unload&&new TextEncoder().encode(body).length>60000)return; // Persisted records resume on the next visit.
      const response=await fetch('/api/process-events',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:unload,signal:AbortSignal.timeout(5000)});
      if(!response.ok)throw new Error('Behavior uploads will retry in the background.');
      const result=await response.json(),remove=[...(result.acknowledgedIds||[]),...(result.rejectedIds||[])];
      if(db)await queueWrite(db,[],remove);for(const id of remove)memory.delete(id);
      status({pending:Math.max(0,rows.length-remove.length),error:currentStatus.dropped?'Some records could not be cached. See delivery status.':''});
    } catch {status({error:'Behavior uploads will retry in the background. Writing is unaffected.'});} finally{uploading=false;if(disposed)void dbPromise.then(db=>db.close()).catch(()=>{});}
  }
  async function check() {
    if(disposed||checking)return;checking=true;
    try{
      const sent=Date.now(),response=await fetch('/api/process-recording'+(engine.recordingId?'?lastRecordingId='+encodeURIComponent(engine.recordingId):''),{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!response.ok)throw new Error();const result=await response.json();if(disposed)return;
      if(result.userId!==ownerId)return;
      lastSuccess=Date.now();
      // Calibrate once per observer to avoid local clock skew; do not move an ongoing interval's clock.
      if(!engine.recordingId)clockOffset=result.serverNow-(sent+Date.now())/2;
      if(engine.recordingId&&result.ended?.stoppedAt)engine.stop('recording_stopped',new Date(result.ended.stoppedAt).getTime());
      if(result.active) {if(engine.recordingId!==result.active.id){engine.start(result.active.id);engine.event('NAV_SESSION',{action:'recording_joined',serverStartedAt:result.active.startedAt,clientJoinedAt:new Date().toISOString(),controlLatencyMs:Date.now()-sent});}status({activeId:result.active.id});}
      else {engine.stop();status({activeId:null});}
    }catch{if(lastSuccess&&Date.now()-lastSuccess>30000){engine.stop('control_unavailable');status({activeId:null,error:'Recording control is unavailable. Writing is unaffected.'});}}finally{checking=false;}
  }
  function visibility(){engine.visibility(document.hidden);if(!document.hidden)void check();else void flush(true);}
  function leave(){engine.visibility(true);engine.flushAll('page_exit');void flush(true);}
  const refresh=()=>{void check();};window.addEventListener('cwrite-process-control',refresh);
  const handlers:[string,EventListener][]=[['focusin',focus],['input',input],['compositionend',input],['focusout',blur],['pointerdown',pointerDown as EventListener],['pointermove',pointerMove as EventListener],['pointerup',pointerUp as EventListener],['pointercancel',pointerUp as EventListener],['click',click as EventListener],['keydown',keyboard as EventListener]];
  // Passive capture observers cannot cancel, delay, or replace the platform's own handlers.
  const safeHandlers=handlers.map(([type,fn])=>{const safe:EventListener=e=>{try{fn(e);}catch{}};document.addEventListener(type,safe,{capture:true,passive:true});return [type,safe] as const;});
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);
  const tick=setInterval(()=>{try{engine.tick();}catch{}},500),poll=setInterval(()=>{if(!document.hidden)void check();},2000),upload=setInterval(()=>{void flush();},2500);
  void check();void flush();
  return ()=>{engine.stop('observer_unmounted');for(const [type,fn]of safeHandlers)document.removeEventListener(type,fn,true);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('cwrite-process-control',refresh);clearInterval(tick);clearInterval(poll);clearInterval(upload);unsubscribe();void persistence.then(()=>flush()).finally(()=>{disposed=true;if(!uploading)void dbPromise.then(db=>db.close()).catch(()=>{});});};
}
