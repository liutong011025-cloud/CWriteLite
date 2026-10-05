'use client';

import {useState} from 'react';
import {Download,Play,Printer,RefreshCw,Theater} from 'lucide-react';
import {toast} from 'sonner';
import type {Story} from '@/lib/types';
import {dramaProblems,sceneSettingText,sceneTitle} from '@/lib/drama';
import {api,Bear,WoodTitle} from './common';
import DramaScenePreview from './drama-scene-preview';
import DramaAnimationPreview from './drama-animation-preview';
import DramaVideoPanel from './drama-video';
export {DramaEditor} from './drama-editor';

export function DramaFinish({story,onBack,onPublish,publishing}:{story:Story;onBack:()=>Promise<void>;onPublish:()=>Promise<void>;publishing:boolean}) {
    const [feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false),[animation,setAnimation]=useState(false);
    const problems=dramaProblems(story);
    const scenes=story.canvas.drama!.scenes;
    async function review(){setBusy(true);try{const r=await api('/api/ai',{kind:'feedback',storyId:story.id,canvas:story.canvas,sections:story.sections});setFeedback(r.message);}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
    function download(){const blob=new Blob([`${story.title}\n\n${story.content}`],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`${story.title.replace(/[^a-z0-9 -]/gi,'').slice(0,80)||'My drama'}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    return <div className="finish-page drama-finish"><WoodTitle>Your drama, ready for the stage</WoodTitle><div className="finish-layout"><article className="cream-panel story-paper drama-script-paper"><h2>{story.title}</h2><p className="story-byline">A drama by you · {scenes.length} scene{scenes.length===1?'':'s'}</p><p className="drama-cast-list"><b>Cast: </b>{story.characterSnapshots.map(c=>c.name).join(', ')}</p>{scenes.map((s,i)=><section key={s.id}><h3>{sceneTitle(i,s.name)}</h3><DramaScenePreview scene={s} characters={story.characterSnapshots}/>{sceneSettingText(s)&&<p className="drama-script-direction">{sceneSettingText(s)}</p>}{s.notes&&<p className="drama-script-direction">[{s.notes}]</p>}{s.lines.filter(l=>l.text.trim()).map(l=><p key={l.id} className={l.kind==='action'?'drama-script-direction':'drama-script-dialogue'}>{l.kind==='action'?`[${l.text}]`: <><b>{story.characterSnapshots.find(c=>c.id===l.characterId)?.name}{l.kind==='thought'?' thinks':' says'}: </b>{l.text}</>}</p>)}</section>)}</article><aside><Bear variant="review" pose="cagent-celebrate-v2.webp" responsePose="cagent-director-v2.webp" message={feedback||'Read your script aloud. Can the audience understand what each character wants?'} hints={['Does each character have a different voice?','Do their actions show a value, such as kindness or teamwork?']} busy={busy}/><section className="cream-panel final-check"><h3>Before the curtain rises</h3><p>Can we see where each scene happens?</p><p>Do characters respond to one another?</p><p>Do thoughts and actions help us understand them?</p><p>How does the drama end?</p>{problems.map(p=><p className="error-text" key={p}>{p}</p>)}<button className="outline-button" onClick={()=>void review()} disabled={busy}><RefreshCw size={16}/>Ask Cagent for a review</button><button className="outline-button" onClick={()=>setAnimation(true)}><Play size={16}/>Preview animation</button><DramaVideoPanel storyId={story.id}/><button className="outline-button" onClick={download}><Download size={16}/>Download script</button><button className="outline-button" onClick={()=>window.print()}><Printer size={16}/>Print script</button><button className="text-button" onClick={()=>void onBack().catch(e=>toast.error(e.message))}>← Keep editing</button><button className="purple-button" disabled={publishing||!!problems.length} onClick={()=>void onPublish()}><Theater size={17}/>{publishing?'Saving your drama…':'Save to My Writing Map'}</button></section></aside></div>{animation&&<DramaAnimationPreview story={story} onClose={()=>setAnimation(false)}/>}</div>;
}
