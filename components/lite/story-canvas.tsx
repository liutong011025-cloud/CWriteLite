'use client';
import { trackProcess } from '@/lib/process-bus';
import { useState, useRef, useLayoutEffect } from 'react';
import { Plus, UserRound, KeyRound, Flag, StickyNote, Link2, Trash2, Move, ZoomIn, ZoomOut, Check, MapPin, ChevronRight, Lightbulb, ImagePlus } from 'lucide-react';
import type { Character, Story, CanvasNode, CanvasEdge, CanvasAnchor, StoryCanvas } from '@/lib/types';
import { wrapConnectionLabel, connectionLabelBoxes, validDraggedConnection, CANVAS_ANCHORS, canvasAnchorPoint, closestCanvasAnchor } from '@/lib/canvas-geometry';
import { api, Modal, PortraitCard, LoadingButton, Bear } from './common';
import dynamic from 'next/dynamic';
import CanvasReadiness from './canvas-readiness';
const CanvasExamples=dynamic(()=>import('./canvas-examples'));
const uid = () => crypto.randomUUID();
const colors = ['#b58445', '#67949d', '#859854', '#c48261', '#9b8b60'];
type Proposal = { source:string; target:string; label:string; question?:string };
export function CanvasView({ value, onChange, small=false, selected, onSelect, connect=false, onConnect, proposals=[], onAcceptProposal, readOnly=false, labelWidth=200, labelPositions }: {
    value:StoryCanvas; onChange?:(v:StoryCanvas)=>void; small?:boolean; selected?:string;
    onSelect?:(id:string)=>void; connect?:boolean; onConnect?:(source:string,target?:string,sourceAnchor?:CanvasAnchor,targetAnchor?:CanvasAnchor)=>void;
    proposals?:Proposal[]; onAcceptProposal?:(p:Proposal)=>void;
    readOnly?:boolean;
    labelWidth?:number;
    labelPositions?:Record<string,{x:number;y:number}>;
}) {
    const arrowColors=[...new Set([...colors, '#9b90b1', ...value.edges.map(e=>e.color)])];
    const surface=useRef<HTMLDivElement>(null);
    const drag=useRef<{id:string;x:number;y:number;startX:number;startY:number}|null>(null);
    const lineDrag=useRef<{source:string;sourceAnchor:CanvasAnchor;startX:number;startY:number}|null>(null);
    const [line,setLine]=useState<{source:string;sourceAnchor:CanvasAnchor;x:number;y:number}|null>(null);
    const [nodeSizes,setNodeSizes]=useState<Record<string,{width:number;height:number}>>({});
    const [surfacePixels,setSurfacePixels]=useState({width:1000,height:620});
    // Scene nodes remain in the saved writing plan, but their images render only as a backdrop.
    const visibleNodes=value.nodes.filter(n=>n.type!=='setting'||!n.imageUrl);
    const visibleIds=new Set(visibleNodes.map(n=>n.id));
    const visibleEdges=value.edges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target));
    const visibleProposals=proposals.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target));
    const nodeIds=visibleNodes.map(n=>n.id).join('|');
    useLayoutEffect(()=>{
        const element=surface.current;if(!element)return;
        function measure(){
            const r=element!.getBoundingClientRect();if(!r.width||!r.height)return;
            setSurfacePixels(previous=>previous.width===r.width&&previous.height===r.height?previous:{width:r.width,height:r.height});
            const sizes:Record<string,{width:number;height:number}>={};
            element!.querySelectorAll<HTMLElement>('[data-canvas-node]').forEach(card=>{const box=card.getBoundingClientRect();sizes[card.dataset.canvasNode!]={width:box.width*1000/r.width,height:box.height*620/r.height};});
            setNodeSizes(previous=>JSON.stringify(previous)===JSON.stringify(sizes)?previous:sizes);
        }
        const observer=new ResizeObserver(measure);observer.observe(element);
        element.querySelectorAll('[data-canvas-node]').forEach(card=>observer.observe(card));measure();
        return()=>observer.disconnect();
    },[nodeIds,small]);
    const backdrop=[...value.nodes].reverse().find(n=>n.type==='setting'&&n.imageUrl);
    const allConnections=[...visibleEdges,...visibleProposals];
    const labelBoxes=connectionLabelBoxes(visibleNodes,allConnections,nodeSizes,{width:(small?65:labelWidth)*1000/surfacePixels.width,lineHeight:(small?6:20)*620/surfacePixels.height,padding:(small?6:16)*620/surfacePixels.height}).map((box,index)=>{
        const position=readOnly&&labelPositions?.[(allConnections[index] as CanvasEdge).id];
        return position?{...box,...position}:box;
    });
    function nodeSize(n:CanvasNode) {return nodeSizes[n.id]??{width:130,height:n.type==='goal'||n.type==='note'?155:260};}
    function point(e:React.PointerEvent) { const r=surface.current!.getBoundingClientRect(); return {x:(e.clientX-r.left)*1000/r.width,y:(e.clientY-r.top)*620/r.height}; }
    function clearDrag(){lineDrag.current=null;drag.current=null;setLine(null);}
    function startLine(e:React.PointerEvent,n:CanvasNode,anchor?:CanvasAnchor) {
        if(small||!onConnect)return;
        e.stopPropagation();e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
        const p=point(e),sourceAnchor=anchor??closestCanvasAnchor(n,nodeSize(n),p);
        lineDrag.current={source:n.id,sourceAnchor,startX:e.clientX,startY:e.clientY};
        setLine({source:n.id,sourceAnchor,...p});
    }
    function down(e:React.PointerEvent,n:CanvasNode) {
        if(small||readOnly||!onChange)return;onSelect?.(n.id);
        if(connect){startLine(e,n);return;}
        e.currentTarget.setPointerCapture(e.pointerId);drag.current={id:n.id,x:n.x,y:n.y,startX:e.clientX,startY:e.clientY};
    }
    function move(e:React.PointerEvent) {
        if(lineDrag.current){setLine({source:lineDrag.current.source,sourceAnchor:lineDrag.current.sourceAnchor,...point(e)});return;}
        const d=drag.current;if(!d||!onChange)return;const r=surface.current!.getBoundingClientRect();
        onChange({...value,nodes:value.nodes.map(n=>n.id===d.id?{...n,x:Math.max(0,Math.min(860,d.x+(e.clientX-d.startX)*1000/r.width)),y:Math.max(0,Math.min(395,d.y+(e.clientY-d.startY)*620/r.height))}:n)});
    }
    function up(e:React.PointerEvent) {
        const d=lineDrag.current;
        if(d){
            const hit=document.elementFromPoint(e.clientX,e.clientY),target=hit?.closest('[data-canvas-node]')?.getAttribute('data-canvas-node');
            const node=visibleNodes.find(n=>n.id===target);
            if(node&&validDraggedConnection(d.source,target,Math.hypot(e.clientX-d.startX,e.clientY-d.startY))){
                const port=hit?.closest('[data-canvas-anchor]')?.getAttribute('data-canvas-anchor') as CanvasAnchor|undefined;
                onConnect?.(d.source,target!,d.sourceAnchor,port&&CANVAS_ANCHORS.includes(port)?port:closestCanvasAnchor(node,nodeSize(node),point(e)));
            }
        }
        clearDrag();
    }
    function edgeShape(e:CanvasEdge|Proposal,indexInLayout:number,ghost=false) {
        const a=visibleNodes.find(n=>n.id===e.source),b=visibleNodes.find(n=>n.id===e.target);if(!a||!b)return null;
        const as=nodeSize(a),bs=nodeSize(b),ax=a.x+as.width/2,ay=a.y+as.height/2,bx=b.x+bs.width/2,by=b.y+bs.height/2,dx=bx-ax,dy=by-ay;
        const af=Math.min(as.width/2/(Math.abs(dx)||1),as.height/2/(Math.abs(dy)||1),.45),bf=Math.min(bs.width/2/(Math.abs(dx)||1),bs.height/2/(Math.abs(dy)||1),.45);
        const sourceAnchor=(e as CanvasEdge).sourceAnchor,targetAnchor=(e as CanvasEdge).targetAnchor;
        const s=sourceAnchor?canvasAnchorPoint(a,as,sourceAnchor):{x:ax+dx*af,y:ay+dy*af},t=targetAnchor?canvasAnchorPoint(b,bs,targetAnchor):{x:bx-dx*bf,y:by-dy*bf};
        const {x:lx,y:ly,width,height}=labelBoxes[indexInLayout];
        const color=ghost?'#9b90b1':(e as CanvasEdge).color,index=Math.max(0,arrowColors.indexOf(color));
        const activate=()=>ghost?onAcceptProposal?.(e):onSelect?.((e as CanvasEdge).id);
        return <g key={ghost?`proposal-${e.source}-${e.target}-${e.label}`:(e as CanvasEdge).id} className={`edge-group ${ghost?'proposed-edge':''}`} aria-hidden="true" onClick={activate}>
            <path d={`M${s.x},${s.y} Q${2*(lx+width/2)-(s.x+t.x)/2},${2*(ly+height/2)-(s.y+t.y)/2} ${t.x},${t.y}`} stroke={color} strokeWidth={selected===(e as CanvasEdge).id?3:2} strokeDasharray={ghost?'6 5':undefined} fill="none" markerEnd={`url(#arrow-${small?'mini':'full'}-${index})`}/>
        </g>;
    }
    const start=visibleNodes.find(n=>n.id===line?.source),startPoint=start&&line?canvasAnchorPoint(start,nodeSize(start),line.sourceAnchor):null;
    return <div ref={surface} className={`canvas-surface ${small?'mini-canvas':''} ${backdrop?'has-setting-background':''} ${readOnly?'read-only-canvas':''}`}>
        {backdrop&&<div className="canvas-backdrop" aria-hidden="true"><img src={backdrop.imageUrl} alt=""/><div className="canvas-backdrop-veil"/></div>}
        <svg className="connection-layer" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-label="Story relationships"><defs>{arrowColors.map((c,i)=><marker key={c} id={`arrow-${small?'mini':'full'}-${i}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10" fill={c}/></marker>)}</defs>{visibleEdges.map((e,i)=>edgeShape(e,i))}{visibleProposals.map((p,i)=>edgeShape(p,visibleEdges.length+i,true))}{line&&startPoint&&<path d={`M${startPoint.x},${startPoint.y} L${line.x},${line.y}`} className="live-connection-line" stroke="#8c743e" strokeWidth="3" strokeDasharray="5 4" fill="none"/>}</svg>
        {allConnections.map((connection,index)=>{
            const ghost=index>=visibleEdges.length,box=labelBoxes[index],activate=()=>ghost?onAcceptProposal?.(connection):onSelect?.((connection as CanvasEdge).id);
            return <div key={ghost?`idea-${index}`:(connection as CanvasEdge).id} className={`connection-label ${ghost?'proposed-edge':''}`} role={small||readOnly?undefined:'button'} tabIndex={small||readOnly?undefined:0} aria-label={`${ghost?'Use connection':'Connection'}: ${connection.label}`} style={{left:`${box.x/10}%`,top:`${box.y/6.2}%`,width:`${box.width/10}%`,height:`${box.height/6.2}%`,color:ghost?'#9b90b1':(connection as CanvasEdge).color}} onClick={activate} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();activate();}}}>{wrapConnectionLabel(connection.label).map((text,i)=><span key={i}>{text}</span>)}</div>;
        })}
        {visibleNodes.map(n=><div key={n.id} data-canvas-node={n.id} data-process-drag={onChange&&!readOnly?"PW_CANVAS_MOVE":undefined} data-process-target={n.id} data-process-state={JSON.stringify({x:n.x,y:n.y})} role={readOnly?'group':small?undefined:'button'} tabIndex={small||readOnly?undefined:0} aria-label={`${n.type}: ${n.label}`} className={`canvas-node ${n.type} ${selected===n.id?'selected':''} ${connect?'connect-mode':''}`} style={{left:`${n.x/10}%`,top:`${n.y/6.2}%`}} onPointerDown={e=>down(e,n)} onPointerMove={move} onPointerUp={up} onPointerCancel={clearDrag} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'){onSelect?.(n.id);if(connect)onConnect?.(n.id);}if(onChange&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();onChange({...value,nodes:value.nodes.map(x=>x.id===n.id?{...x,x:Math.max(0,Math.min(860,x.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0))),y:Math.max(0,Math.min(395,x.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0)))}:x)});}}}>
            {n.imageUrl?<img src={n.imageUrl} alt="" draggable={false}/>:<div className="node-symbol">{n.type==='goal'?<Flag/>:n.type==='note'?<StickyNote/>:n.type==='setting'?<MapPin/>:<KeyRound/>}</div>}<strong>{n.label}</strong>{n.type==='character'&&<span className="node-star">★</span>}{n.type==='goal'&&<small>Story goal</small>}{n.details&&!small&&<small>{n.details.slice(0,65)}</small>}
            {!small&&onConnect&&CANVAS_ANCHORS.map(anchor=><button key={anchor} type="button" data-canvas-anchor={anchor} className={`node-connect-handle ${anchor}`} aria-label={`Draw connection from ${n.label}, ${anchor.replace('-',' ')} corner`} title="Drag this corner to another card" onPointerDown={e=>startLine(e,n,anchor)} onPointerMove={move} onPointerUp={up} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();onConnect(n.id,undefined,anchor);}}}>●</button>)}
        </div>)}
    </div>;
}
export default function StoryCanvasPage({story,characters,onChange,onContinue,onEvent}:{story:Story;characters:Character[];onChange:(s:Story)=>void;onContinue:()=>void;onEvent:(type:string,payload:unknown)=>void}) {
    const [modal,setModal]=useState<CanvasNode['type']|null>(null),[selected,setSelected]=useState(''),[connect,setConnect]=useState(false),[source,setSource]=useState(''),[target,setTarget]=useState(''),[edgeLabel,setEdgeLabel]=useState('');
    const [description,setDescription]=useState(''),[imageUrl,setImageUrl]=useState(''),[imageBusy,setImageBusy]=useState(false),[imageMock,setImageMock]=useState(false),[error,setError]=useState(''),[busy,setBusy]=useState(false),[suggestions,setSuggestions]=useState<Proposal[]>([]),[question,setQuestion]=useState(''),[zoom,setZoom]=useState(100);
    const [examplesOpen,setExamplesOpen]=useState(false);
    const imageRequest=useRef(0),generatingImage=useRef(false);
    const [sourceAnchor,setSourceAnchor]=useState<CanvasAnchor|undefined>(),[targetAnchor,setTargetAnchor]=useState<CanvasAnchor|undefined>();
    const value=story.canvas; const node=value.nodes.find(n=>n.id===selected),edge=value.edges.find(e=>e.id===selected);
    const change=(canvas:StoryCanvas)=>onChange({...story,canvas});
    function closeModal(){imageRequest.current++;generatingImage.current=false;setImageBusy(false);setModal(null);}
    function open(kind:typeof modal){imageRequest.current++;generatingImage.current=false;setImageBusy(false);setDescription('');setImageUrl('');setImageMock(false);setError('');setModal(kind);}
    function addNode(partial:Partial<CanvasNode>){const count=value.nodes.length;const n:CanvasNode={id:uid(),type:modal||'note',label:description.trim()||'New idea',x:60+count%4*220,y:60+Math.floor(count/4)%2*240,...partial};change({...value,nodes:[...value.nodes,n]});onEvent('canvas_node_added',{nodeId:n.id,type:n.type,characterId:n.characterId});closeModal();}
    function addCharacter(c:Character){const n:CanvasNode={id:uid(),type:'character',label:c.name,imageUrl:c.imageUrl,characterId:c.id,details:c.traits,x:60+value.nodes.length%4*220,y:60+Math.floor(value.nodes.length/4)%2*240};onChange({...story,characterIds:story.characterIds.includes(c.id)?story.characterIds:[...story.characterIds,c.id],characterSnapshots:story.characterSnapshots.some(x=>x.id===c.id)?story.characterSnapshots:[...story.characterSnapshots,c],canvas:{...value,nodes:[...value.nodes,n]}});onEvent('canvas_node_added',{nodeId:n.id,type:n.type,characterId:c.id});setModal(null);}
    async function generate(){
        if(generatingImage.current||!description.trim()||!modal||!['object','setting'].includes(modal))return;
        const request=++imageRequest.current;generatingImage.current=true;setImageBusy(true);setError('');
        try{const r=await api('/api/ai',{kind:'image',storyId:story.id,elementType:modal,description:description.trim()});if(request!==imageRequest.current)return;setImageUrl(r.spriteUrl||r.imageUrl);setImageMock(Boolean(r.mock));}
        catch(e){if(request===imageRequest.current)setError((e as Error).message);}
        finally{if(request===imageRequest.current){generatingImage.current=false;setImageBusy(false);}}
    }
    async function recommend(){setBusy(true);setError('');try{const r=await api('/api/ai',{kind:'canvas',storyId:story.id,canvas:value,selectedNode:node,shuffle:suggestions.length>0});setSuggestions((r.connections as Proposal[]).filter((p,i,all)=>!value.edges.some(e=>e.source===p.source&&e.target===p.target&&e.label===p.label)&&all.findIndex(x=>x.source===p.source&&x.target===p.target&&x.label===p.label)===i));setQuestion(r.question);trackProcess('RS_AI_OUTPUT_SHOWN',{kind:'canvas',requestId:r.requestId,connections:r.connections},'system');onEvent('canvas_suggestions_requested',{requestId:r.requestId});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
    function accept(p:Proposal){change({...value,edges:[...value.edges,{id:uid(),source:p.source,target:p.target,label:p.label,color:colors[value.edges.length%colors.length]}]});setSuggestions(s=>s.filter(x=>x!==p));onEvent('suggestion_accepted',{kind:'connection',...p});}
    function connectNode(from:string,to?:string,fromAnchor?:CanvasAnchor,toAnchor?:CanvasAnchor){
        if(to){setSource(from);setTarget(to);setSourceAnchor(fromAnchor);setTargetAnchor(toAnchor);setEdgeLabel('');setConnect(false);onEvent('connection_drag_completed',{source:from,target:to,sourceAnchor:fromAnchor,targetAnchor:toAnchor});}
        else if(!source){setSource(from);setSourceAnchor(fromAnchor);}
        else if(from!==source){setTarget(from);setTargetAnchor(fromAnchor);setEdgeLabel('');setConnect(false);}
    }
    function remove(){change({...value,nodes:value.nodes.filter(n=>n.id!==selected),edges:value.edges.filter(e=>e.id!==selected&&e.source!==selected&&e.target!==selected)});setSuggestions(s=>s.filter(p=>p.source!==selected&&p.target!==selected));onEvent('canvas_element_removed',{id:selected});setSelected('');}
    return <div className="canvas-page"><div className="canvas-layout"><div className="canvas-workspace cream-panel"><div className="canvas-toolbar"><button onClick={()=>open('object')}><KeyRound size={17}/>Add Object</button><button onClick={()=>open('setting')}><MapPin size={17}/>Add Setting</button><button onClick={()=>open('goal')}><Flag size={17}/>Add Task / Goal</button><button onClick={()=>open('note')}><StickyNote size={17}/>Add Note</button><button className={connect?'active':''} onClick={()=>{setConnect(!connect);setSource('');}}><Link2 size={16}/>{connect?'Draw a line…':'Connect'}</button><div className="canvas-view-tools"><button className="canvas-example-button" onClick={()=>setExamplesOpen(true)}><Lightbulb size={19}/>View Examples</button><div className="zoom-controls"><button onClick={()=>setZoom(z=>Math.max(70,z-10))} aria-label="Zoom out"><ZoomOut size={15}/></button><span>{zoom}%</span><button onClick={()=>setZoom(z=>Math.min(140,z+10))} aria-label="Zoom in"><ZoomIn size={15}/></button></div></div></div>{connect&&<div className="connect-help">Drag a corner dot to another card. A line follows your hand.<button onClick={()=>{setConnect(false);setSource('');}}>Cancel</button></div>}<div className="canvas-scroll"><div style={{width:`${zoom}%`,minWidth:600}}><CanvasView value={value} onChange={change} selected={selected} onSelect={setSelected} connect={connect} onConnect={connectNode} proposals={suggestions} onAcceptProposal={accept}/></div></div>{!value.nodes.length&&<p className="canvas-empty">Choose your cast in Characters, then connect their ideas here.</p>}{(node||edge)&&<div className="node-inspector"><span>{node?node.type:'Connection'}</span><input aria-label="Edit canvas label" value={node?.label||edge?.label||''} maxLength={100} onChange={e=>{change(node?{...value,nodes:value.nodes.map(n=>n.id===selected?{...n,label:e.target.value}:n)}:{...value,edges:value.edges.map(x=>x.id===selected?{...x,label:e.target.value}:x)});onEvent('canvas_label_edited',{id:selected});}}/><button onClick={remove} aria-label="Remove selected element"><Trash2 size={16}/></button></div>}</div><aside><section className="cream-panel connection-suggestions"><header><h3>Plan with Cagent</h3></header><Bear variant="planning" pose="cagent-planning-v2.webp" responsePose="cagent-director-v2.webp" busy={busy} showHelp={false} responding={busy} message={node ? `How could ${node.label} connect to another idea?` : question||"Which ideas belong together?"} hints={["What does your character want?","What could get in their way?","What would happen if these ideas met?"]}/><LoadingButton busy={busy} disabled={value.nodes.length<2} onClick={recommend}>Suggest connections</LoadingButton>{suggestions.map((p,i)=><div className="connection-idea" key={`${p.source}-${p.target}-${i}`}><p><b>{value.nodes.find(n=>n.id===p.source)?.label}</b> <span>{p.label}</span> <b>{value.nodes.find(n=>n.id===p.target)?.label}</b></p><small>{p.question}</small><div><button className="tiny-button" onClick={()=>accept(p)}><Plus size={14}/>Use this idea</button><button className="text-button" onClick={()=>{setSuggestions(s=>s.filter(x=>x!==p));onEvent('suggestion_rejected',{kind:'connection',...p});}}>Skip</button></div></div>)}{error&&<p className="error-text" role="alert">{error}</p>}</section></aside></div><div className="page-bottom"><CanvasReadiness story={story} onContinue={onContinue} onEvent={onEvent}/></div>
    {examplesOpen&&<CanvasExamples onClose={()=>setExamplesOpen(false)}/>}{modal&&<Modal title={modal==='character'?'Add a character':`Add ${modal==='goal'?'a task / goal':modal==='note'?'a note':modal==='object'?'an object':`a ${modal}`}`} onClose={closeModal} wide={modal==='character'}>
        {modal==='character'?<div className="picker-grid">{characters.map(c=><PortraitCard key={c.id} character={c} onClick={()=>addCharacter(c)}/>)}</div>:<>
            <label className={modal==='object'?'object-description':undefined}>{modal==='object'?'Name or describe your object':'What would you like to add?'}<input value={description} disabled={imageBusy} onChange={e=>{setDescription(e.target.value);setImageUrl('');setImageMock(false);}} placeholder={modal==='object'?'A mysterious golden key…':modal==='setting'?'A dark forest at night…':modal==='goal'?'What does your character want?':'Write your idea…'} maxLength={300}/></label>
            {modal==='object'?<>
                <p className="object-text-hint">A text card is enough to plan your story.</p>
                <button className="purple-button object-text-add" disabled={!description.trim()||imageBusy} onClick={()=>addNode({})}><Plus size={17}/>Add text card</button>
                <details className="object-picture-option">
                    <summary><ImagePlus size={18}/>Add a picture (optional)</summary>
                    <div className="element-image-section">
                        {imageUrl&&<img src={imageUrl} alt="Your generated object"/>}
                        <LoadingButton busy={imageBusy} disabled={!description.trim()} onClick={generate}>{imageUrl?'Try another image':'Generate an image'}</LoadingButton>
                        {imageMock&&<small>Local preview · image generation is simulated.</small>}
                        {error&&<p role="alert" className="error-text">{error}</p>}
                        {imageUrl&&<button className="purple-button" disabled={imageBusy} onClick={()=>addNode({imageUrl})}><Plus size={17}/>Add picture card</button>}
                    </div>
                </details>
            </>:<>
                {modal==='setting'&&<div className="element-image-section">{imageUrl&&<img src={imageUrl} alt="Your generated idea"/>}<LoadingButton busy={imageBusy} disabled={!description.trim()} onClick={generate}>{imageUrl?'Try another image':'Generate an image'}</LoadingButton>{imageMock&&<small>Local preview · image generation is simulated.</small>}<small>This scene becomes your canvas background, softened so your cards stay clear.</small></div>}
                {error&&<p role="alert" className="error-text">{error}</p>}
                <button className="purple-button" disabled={!description.trim()||imageBusy} onClick={()=>addNode({imageUrl})}><Plus size={17}/>Add to Canvas</button>
            </>}
        </>}
    </Modal>}
    {target&&<Modal title="How are these cards connected?" onClose={()=>{setTarget('');setSource('');}}><p>{value.nodes.find(n=>n.id===source)?.label} → {value.nodes.find(n=>n.id===target)?.label}</p><label>Connection<input value={edgeLabel} onChange={e=>setEdgeLabel(e.target.value)} placeholder="is friends with / wants to find…" maxLength={100}/></label><button className="purple-button" disabled={!edgeLabel.trim()} onClick={()=>{change({...value,edges:[...value.edges,{id:uid(),source,target,sourceAnchor,targetAnchor,label:edgeLabel,color:colors[value.edges.length%colors.length]}]});onEvent('canvas_connection_created',{source,target,sourceAnchor,targetAnchor,label:edgeLabel});setSource('');setTarget('');}}><Check size={17}/>Connect cards</button></Modal>}</div>;
}
