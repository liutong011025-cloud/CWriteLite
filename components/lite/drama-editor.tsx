'use client';

import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {ChevronRight,Cloud,FlipHorizontal,ImagePlus,MessageCircle,Plus,Search,Sparkles,Theater,Trash2,UsersRound} from 'lucide-react';
import {toast} from 'sonner';
import type {Character,DramaActor,DramaProject,DramaScene,Story} from '@/lib/types';
import {actorContribution,tableauProject,actorX,blankDramaScene,sceneTitle,removeDramaScene,DRAMA_ACTOR_WIDTH,dramaProblems,MAX_DRAMA_SCENES,withDrama} from '@/lib/drama';
import {type DramaSuggestion,dramaSuggestions} from '@/lib/drama-suggestions';
import {api,IdeaPackButton,Modal} from './common';
import CharacterPackCard from './character-pack-card';
import DramaBubble from './drama-bubble';
import DramaCoach from './drama-coach';
import DramaConnector from './drama-connector';
import DramaReadiness from './drama-readiness';
import DramaResizeHandles from './drama-resize-handles';
import {actorImage} from '@/lib/sprite';
import {placeDramaBubble,dramaBubbleSize,type Rect} from '@/lib/drama-bubble-layout';

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(Math.max(min,max),n));
type Support=ReturnType<typeof dramaSuggestions>;
const EMPTY_SUPPORT:Support={suggestions:[],keywords:[],question:''};

export function DramaEditor({story,characters,onChange,onCreateCharacter,onDeleteCharacter,onContinue,onBack,script=false}:{story:Story;characters:Character[];onChange:(s:Story)=>void;onCreateCharacter:()=>void;onDeleteCharacter?:(character:Character)=>void;onContinue:()=>Promise<void>;onBack:()=>Promise<void>;script?:boolean}){
    const project=tableauProject(story.canvas.drama!);
    const scene=project.scenes[project.activeScene]||project.scenes[0];
    const [selected,setSelected]=useState(''),[search,setSearch]=useState(''),[castOpen,setCastOpen]=useState(false);
    const [generating,setGenerating]=useState<string|null>(null),[support,setSupport]=useState<Support>(EMPTY_SUPPORT),[tipBusy,setTipBusy]=useState(false),[tipError,setTipError]=useState('');
    const [insertion,setInsertion]=useState(0),[deleteScene,setDeleteScene]=useState<string|null>(null),[stageSize,setStageSize]=useState({width:600,height:400});
    const stage=useRef<HTMLDivElement>(null),latest=useRef(story),actorNodes=useRef(new Map<string,HTMLDivElement>()),suggestionRequest=useRef<AbortController|null>(null);
    const bubbleNodes=useRef(new Map<string,HTMLDivElement>()),[measureVersion,setMeasureVersion]=useState(0),[reviewOpen,setReviewOpen]=useState(false);
    const drag=useRef<{id:string;pointerId:number;x:number;y:number;actor:DramaActor}|null>(null);
    latest.current=story;
    const line=scene.lines.find(l=>l.characterId===selected);
    const actor=scene.actors.find(a=>a.characterId===selected);
    const selectionKey=scene.id+'|'+(line?selected:'')+'|'+(line?.kind||'scene');
    const currentSelection=useRef(selectionKey);currentSelection.current=selectionKey;
    const deck=characters.filter(c=>`${c.name} ${c.species||''}`.toLowerCase().includes(search.toLowerCase()));

    useLayoutEffect(()=>{const el=stage.current;if(!el)return;const measure=()=>setStageSize({width:el.clientWidth,height:el.clientHeight});const observer=new ResizeObserver(measure);observer.observe(el);measure();return()=>observer.disconnect();},[]);
    useEffect(()=>{suggestionRequest.current?.abort();setSelected('');setSupport(EMPTY_SUPPORT);setTipBusy(false);setTipError('');},[scene.id]);
    useEffect(()=>()=>suggestionRequest.current?.abort(),[]);
    useEffect(()=>{suggestionRequest.current?.abort();setSupport(EMPTY_SUPPORT);setTipBusy(false);setTipError('');},[selected,line?.kind]);

    useLayoutEffect(()=>{const observer=new ResizeObserver(()=>setMeasureVersion(v=>v+1));actorNodes.current.forEach(n=>observer.observe(n));bubbleNodes.current.forEach(n=>observer.observe(n));return()=>observer.disconnect();},[scene.id,scene.actors.length,selected,scene.lines.length]);

    function commit(next:Story){latest.current=next;onChange(next);}
    function editProject(fn:(p:DramaProject)=>DramaProject){commit(withDrama(latest.current,fn(tableauProject(latest.current.canvas.drama!))));}
    function editScene(id:string,fn:(s:DramaScene)=>DramaScene){editProject(p=>({...p,scenes:p.scenes.map(s=>s.id===id?fn(s):s)}));}
    function sceneChange(patch:Partial<DramaScene>){editScene(scene.id,s=>({...s,...patch}));}
    function addActor(c:Character){
        if(!scene.backgroundImageUrl){toast.info('Make your scene background first, then choose a character.');return;}
        const work=latest.current,current=work.canvas.drama!.scenes.find(s=>s.id===scene.id)!;
        if(current.actors.length>=8&&!current.actors.some(a=>a.characterId===c.id)){toast.info('Use up to eight characters in one scene. You can add another scene.');return;}
        const cast=work.characterSnapshots.some(x=>x.id===c.id)?work.characterSnapshots:[...work.characterSnapshots,c];
        commit(withDrama({...work,characterSnapshots:cast,characterIds:cast.map(x=>x.id)}, {...tableauProject(work.canvas.drama!),scenes:tableauProject(work.canvas.drama!).scenes.map(s=>s.id!==scene.id||s.actors.some(a=>a.characterId===c.id)?s:{...s,actors:[...s.actors,{characterId:c.id,x:s.actors.length===0?30:s.actors.length===1?68:15+(s.actors.length*19%72),y:90,scale:1,flipped:false}]})}));
        setSelected(c.id);
        if (c.id && !c.spriteUrl && c.imageUrl.startsWith('https://')) void api('/api/data', { action: 'ensureSprite', id: c.id }).then(result => {
            if (!result.character?.spriteUrl) {toast.info(result.spriteStatus==='processing'?'Your stage picture is being made. Choose the card again shortly.':'Your card is saved. The transparent stage picture needs another try; choose this card again to retry.');return;}
            const work = latest.current;
            commit({ ...work, characterSnapshots: work.characterSnapshots.map(item => item.id === c.id ? { ...item, spriteUrl: result.character.spriteUrl } : item) });
        }).catch(() => toast.info('Your card is saved. Choose it again to retry the stage picture.'));
    }
    function actorChange(id:string,patch:Partial<DramaActor>){editScene(scene.id,s=>({...s,actors:s.actors.map(a=>{if(a.characterId!==id)return a;const next={...a,...patch};const height=(actorNodes.current.get(id)?.offsetHeight||0)*(next.scale/a.scale);return {...next,x:actorX(next.x,next.scale),y:clamp(next.y,Math.min(94,height/stageSize.height*100+3),96)};})}));}
    function removeActor(id:string){editScene(scene.id,s=>({...s,actors:s.actors.filter(a=>a.characterId!==id),lines:s.lines.filter(l=>l.characterId!==id)}));setSelected('');}
    function chooseMode(kind:'dialogue'|'thought',id=selected,text?:string){editScene(scene.id,s=>actorContribution(s,id,kind,text));}
    function removeWords(){editScene(scene.id,s=>({...s,lines:s.lines.filter(l=>l.characterId!==selected)}));}
    function actorRect(a:DramaActor):Rect {
        const node=actorNodes.current.get(a.characterId),width=stageSize.width*DRAMA_ACTOR_WIDTH*a.scale/100,height=node?.offsetWidth?node.offsetHeight*width/node.offsetWidth:180*a.scale;
        return {left:a.x/100*stageSize.width-width/2,top:a.y/100*stageSize.height-height,width,height};
    }
    const placements=new Map<string,ReturnType<typeof placeDramaBubble>>();
    const actorRects=scene.actors.map(actorRect),occupied:Rect[]=[];
    // Reserve the editor first, then find clear places for the remaining word bubbles.
    for(const a of [...scene.actors].sort((a,b)=>Number(b.characterId===selected)-Number(a.characterId===selected))){
        const expanded=a.characterId===selected;
        if(!expanded&&!scene.lines.some(l=>l.characterId===a.characterId&&l.text.trim()))continue;
        const height=bubbleNodes.current.get(a.characterId)?.offsetHeight||(expanded?260:115);
        const p=placeDramaBubble(actorRect(a),{width:dramaBubbleSize(actorRect(a),stageSize,expanded).width,height},stageSize,actorRects,occupied);
        placements.set(a.characterId,p);occupied.push(p);
    }
    void measureVersion;
    async function background(){if(generating||!scene.backgroundPrompt.trim())return;const id=scene.id,description=scene.backgroundPrompt;setGenerating(id);try{const r=await api('/api/ai',{kind:'image',storyId:story.id,elementType:'setting',description,drama:true});if(latest.current.canvas.drama?.scenes.find(s=>s.id===id)?.backgroundPrompt===description){editScene(id,s=>({...s,backgroundImageUrl:r.imageUrl}));toast.success('Your scene background is ready.');}else toast.info('Your description changed. Generate again for the new idea.');}catch(e){toast.error((e as Error).message);}finally{setGenerating(null);}}
    async function suggest(){
        if(tipBusy)return;const key=currentSelection.current;const controller=new AbortController();suggestionRequest.current=controller;setTipBusy(true);setTipError('');
        try{const r=await fetch('/api/ai',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({kind:'dramaTips',storyId:story.id,canvas:story.canvas,sections:story.sections,selectedNode:{sceneId:scene.id,lineId:line?.id,characterId:line?selected:''},focus:line?.kind||'scene',shuffle:!!support.suggestions.length})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Please try again.');if(!controller.signal.aborted&&key===currentSelection.current){const result=dramaSuggestions(data,latest.current.canvas,latest.current.characterSnapshots,scene.id,{characterId:line?selected:'',kind:line?.kind||'scene'});setSupport(result);if(!result.suggestions.length)setTipError('No matching idea yet. Please try again.');}}
        catch(e){if(!controller.signal.aborted)setTipError((e as Error).message);}
        finally{if(!controller.signal.aborted)setTipBusy(false);}
    }
    function chooseIdea(idea:DramaSuggestion){if(idea.kind==='action'||!scene.actors.some(a=>a.characterId===idea.characterId)||line&&(idea.characterId!==selected||idea.kind!==line.kind))return;const previous=scene.lines.find(l=>l.characterId===idea.characterId)?.text.trim();chooseMode(idea.kind,idea.characterId,previous?previous+'\n'+idea.frame:idea.frame);setSelected(idea.characterId);setInsertion(i=>i+1);}
    async function next(){const candidate=withDrama(latest.current,tableauProject(latest.current.canvas.drama!));const problems=dramaProblems(candidate,script);if(problems.length){toast.info(problems[0]);return;}commit(candidate);if(script){setReviewOpen(true);return;}try{await onContinue();}catch(e){toast.error((e as Error).message);}}

    return <div className="drama-page drama-workbench drama-tableau">
        <div className="drama-workbench-meta"><span><Theater size={20}/>Scene {project.activeScene+1} of {project.scenes.length}</span><label className="drama-title-field">Title<input aria-label="Drama title" value={story.title} onChange={e=>commit({...latest.current,title:e.target.value})} maxLength={120}/></label></div>
        <div className="drama-workspace">
            <aside className="drama-cast"><header><UsersRound size={22}/><h2>My Cast</h2></header><div className="deck-pack-corner drama-cast-pack"><IdeaPackButton onClick={()=>setCastOpen(true)}/></div><div className="drama-chosen-cast">{scene.actors.map(a=>{const c=story.characterSnapshots.find(c=>c.id===a.characterId);return c?<div className="drama-cast-member" key={c.id}><button onClick={()=>{setSelected(c.id);}} aria-pressed={selected===c.id} aria-label={`Select ${c.name}`}><img src={actorImage(c)} alt=""/><b>{c.name}</b></button><button type="button" className="drama-cast-remove" aria-label={`Remove ${c.name} from this scene`} title="Remove from scene" onClick={()=>removeActor(c.id)}><Trash2 size={17}/></button></div>:null;})}</div><button className="outline-button" onClick={onCreateCharacter}><Plus size={18}/>Create a character</button></aside>
            <section className="drama-stage-column">
                <div className="drama-background-controls"><label>Scene background<textarea aria-label="Scene background description" placeholder="Where does this scene happen?" value={scene.backgroundPrompt} onChange={e=>sceneChange({backgroundPrompt:e.target.value,backgroundImageUrl:''})} maxLength={2000}/></label><button className="purple-button" onClick={()=>void background()} disabled={!scene.backgroundPrompt.trim()||!!generating}><ImagePlus size={19}/>{generating===scene.id?'Making…':'Generate Background'}</button></div>
                <div className={"drama-stage "+(selected?"has-word-editor":"")} ref={stage} onPointerDown={e=>{if(!(e.target as Element).closest('.drama-actor,.drama-bubble-anchor.is-editing,.drama-stage-add'))setSelected('');}} aria-label={`Stage for ${scene.name}`} style={scene.backgroundImageUrl?{backgroundImage:`linear-gradient(#fff9ec12,#fff9ec12),url(${JSON.stringify(scene.backgroundImageUrl)})`}:undefined}>
                    {!scene.backgroundImageUrl&&<div className="drama-stage-empty"><Theater size={48}/><h3>Your stage starts here</h3><p>Make a background, then choose a character card.</p></div>}
                    {scene.actors.map(a=>{const c=story.characterSnapshots.find(c=>c.id===a.characterId);if(!c)return null;return <div className={`drama-actor ${selected===a.characterId?'selected':''}`} key={a.characterId} ref={node=>{if(node)actorNodes.current.set(a.characterId,node);else actorNodes.current.delete(a.characterId);}} style={{left:`${a.x}%`,top:`${a.y}%`,width:`${DRAMA_ACTOR_WIDTH*a.scale}%`}}><button className="drama-actor-grip" aria-label={`Move ${c.name}`} onKeyDown={e=>{const dx=e.key==='ArrowLeft'?-2:e.key==='ArrowRight'?2:0,dy=e.key==='ArrowUp'?-2:e.key==='ArrowDown'?2:0;if(dx||dy){e.preventDefault();actorChange(a.characterId,{x:a.x+dx,y:a.y+dy});}else if(e.key==='Enter')setSelected(a.characterId);}} onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();setSelected(a.characterId);e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:a.characterId,pointerId:e.pointerId,x:e.clientX,y:e.clientY,actor:a};}} onPointerMove={e=>{const d=drag.current,r=stage.current?.getBoundingClientRect();if(!d||d.pointerId!==e.pointerId||!r)return;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>3)actorChange(d.id,{x:clamp(d.actor.x+(e.clientX-d.x)/r.width*100,2,98),y:clamp(d.actor.y+(e.clientY-d.y)/r.height*100,5,96)});}} onPointerUp={e=>{const d=drag.current;drag.current=null;if(d&&Math.hypot(e.clientX-d.x,e.clientY-d.y)<4){setSelected(a.characterId);}}} onPointerCancel={()=>{drag.current=null;}}><img src={actorImage(c)} alt={c.name} style={{transform:a.flipped?'scaleX(-1)':undefined}} draggable={false}/></button>{selected===a.characterId&&<DramaResizeHandles name={c.name} scale={a.scale} onScale={scale=>actorChange(a.characterId,{scale})}/>}<span className="drama-actor-name">{c.name}</span></div>;})}
                    {scene.actors.map(a=>{const c=story.characterSnapshots.find(c=>c.id===a.characterId),bubble=scene.lines.find(l=>l.characterId===a.characterId),active=selected===a.characterId;if(!c||!active&&!bubble?.text.trim())return null;return <div className={'drama-bubble-anchor drama-character-writing '+(active?'is-editing ':'')+(bubble?.kind==='thought'?'thought':'dialogue')} key={'bubble-'+a.characterId} ref={node=>{if(node)bubbleNodes.current.set(a.characterId,node);else bubbleNodes.current.delete(a.characterId);}} style={{width:placements.get(a.characterId)!.width,left:placements.get(a.characterId)!.left,top:placements.get(a.characterId)!.top,'--drama-word-size':dramaBubbleSize(actorRect(a),stageSize,active).fontSize+'px'} as React.CSSProperties}>{active?<DramaBubble line={bubble} name={c.name} insertion={insertion} onKind={kind=>chooseMode(kind)} onText={text=>bubble&&bubble.kind!=='action'&&chooseMode(bubble.kind,a.characterId,text)} onRemove={removeWords}/>:<div className={'drama-bubble-preview '+bubble!.kind} aria-label={c.name+' '+bubble!.kind}><b>{bubble!.kind==='thought'?<Cloud size={18}/>:<MessageCircle size={18}/>} {c.name}</b><span>{bubble!.text}</span></div>}<DramaConnector placement={placements.get(a.characterId)!} thought={bubble?.kind==='thought'}/></div>;})}
                    {scene.backgroundImageUrl&&!scene.actors.length&&<button className="drama-stage-add" onClick={()=>setCastOpen(true)}><UsersRound size={28}/>Open My Cast to choose a character ←</button>}
                </div>
                <div className="drama-stage-tools">{actor?<><b>{story.characterSnapshots.find(c=>c.id===selected)?.name}</b><span>Drag a picture corner to resize</span><button className="outline-button" onClick={()=>actorChange(selected,{flipped:!actor.flipped})}><FlipHorizontal size={17}/>Flip</button><button className="icon-button" aria-label="Remove selected character from scene" onClick={()=>removeActor(selected)}><Trash2 size={19}/></button></>:<span>Drag to move · click to write</span>}<button className="text-button" onClick={()=>setSelected('')}>Done</button></div>
                <nav className="drama-scenes-strip" aria-label="Drama scenes">{project.scenes.map((s,i)=><div className={"drama-scene-card "+(i===project.activeScene?"active":"")} key={s.id}><button className="drama-scene-select" aria-label={`Open scene ${i+1}`} aria-pressed={i===project.activeScene} title={sceneTitle(i,s.name)} onClick={()=>editProject(p=>({...p,activeScene:i}))}>{s.backgroundImageUrl?<img src={s.backgroundImageUrl} alt=""/>:<Theater size={24}/>}<b>{sceneTitle(i,s.name)}</b></button><button type="button" className="drama-scene-remove" aria-label={`Delete scene ${i+1}`} title="Delete scene" disabled={generating===s.id} onClick={()=>setDeleteScene(s.id)}><Trash2 size={17}/></button></div>)}<button className="drama-add-scene" disabled={project.scenes.length>=MAX_DRAMA_SCENES} onClick={()=>editProject(p=>({...p,scenes:[...p.scenes,blankDramaScene(crypto.randomUUID(),p.scenes.length)],activeScene:p.scenes.length}))}><Plus size={22}/>Add scene</button></nav>
                <details className="drama-scene-details"><summary>Scene details</summary><div><label>Scene name<input aria-label="Scene name" value={scene.name} onChange={e=>sceneChange({name:e.target.value})} maxLength={80}/></label><label>Stage directions <small>(optional)</small><textarea aria-label="Stage directions" value={scene.notes} onChange={e=>sceneChange({notes:e.target.value})} placeholder="What is happening in this picture?" maxLength={2000}/></label>{project.scenes.length>1&&<button className="text-button" onClick={()=>setDeleteScene(scene.id)}>Remove this scene</button>}</div></details>
            </section>
            <aside className="drama-support-panel"><section className="drama-language"><header><h2><Sparkles size={21}/>AI Suggestions</h2></header><button className="purple-button drama-suggest-button" disabled={tipBusy||!scene.backgroundImageUrl||!scene.actors.length} onClick={()=>void suggest()}><Sparkles size={19}/>{tipBusy?'Thinking…':support.suggestions.length?'New suggestions':'Get suggestions'}</button><p className="drama-suggestion-focus">{line?(story.characterSnapshots.find(c=>c.id===selected)?.name+' · '+(line.kind==='thought'?'Thinks':'Says')):'Ideas for this scene'}</p><div className="drama-suggestion-results">{tipError&&<p role="alert" className="error-text">{tipError}</p>}{support.suggestions.map((idea,i)=>{const c=story.characterSnapshots.find(c=>c.id===idea.characterId);return <article className="drama-ai-idea" key={`${idea.characterId}-${i}`}><b>{c?.name} · {idea.kind==='thought'?'thinks':idea.kind==='action'?'acts':'speaks'}</b><p>{idea.prompt}</p>{idea.frame&&<button className="drama-frame drama-insert-frame" aria-label={"Use sentence frame: "+idea.frame} onClick={()=>chooseIdea(idea)}>{idea.frame}<ChevronRight size={18}/></button>}<div className="drama-word-bank">{idea.keywords.map(word=><span key={word}>{word}</span>)}</div></article>;})}{support.question&&<p className="drama-suggestion-question">{support.question}</p>}</div></section><DramaCoach story={withDrama(story,project)} scene={scene} line={line} script={script} suggesting={tipBusy}/></aside>
        </div>
        <div className="drama-page-bottom"><button className="text-button" onClick={()=>void onBack().catch(e=>toast.error(e.message))}>← {script?'Back to scenes':'Back to Writing Map'}</button><button className="purple-button" disabled={!!generating} onClick={()=>void next()}>{script?'Review my drama':'Write the scene'}<ChevronRight size={19}/></button></div>
        {reviewOpen&&<DramaReadiness story={story} onClose={()=>setReviewOpen(false)} onContinue={async()=>{await onContinue();setReviewOpen(false);}}/>}
        {castOpen&&<Modal title="Your character pack" wide onClose={()=>setCastOpen(false)}><p className="drama-pack-intro">Choose who joins this scene.</p><label className="drama-cast-search"><Search size={18}/><input aria-label="Find a cast character" placeholder="Find a character…" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className="drama-cast-picker drama-pack-library">{deck.map(c=><CharacterPackCard key={c.id} character={c} selected={scene.actors.some(a=>a.characterId===c.id)} onClick={()=>addActor(c)} onDelete={onDeleteCharacter?()=>onDeleteCharacter(c):undefined}/>)}{!deck.length&&<p>{characters.length?'No matching characters.':'Your shared pack is empty. Create a character to begin.'}</p>}</div><div className="drama-pack-actions"><button className="outline-button" onClick={onCreateCharacter}><Plus size={18}/>Create a character</button><button className="purple-button" onClick={()=>setCastOpen(false)}>Back to my scene<ChevronRight size={18}/></button></div></Modal>}
        {deleteScene&&<Modal title="Remove this scene?" onClose={()=>setDeleteScene(null)}><p>Remove this scene and its characters’ words? {project.scenes.length===1?"A new blank scene will be ready for you.":"Your other scenes will stay."}</p><button className="danger-button" onClick={()=>{editProject(p=>removeDramaScene(p,deleteScene,crypto.randomUUID()));setDeleteScene(null);}}>Remove scene</button></Modal>}
    </div>;
}
