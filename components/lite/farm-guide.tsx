'use client';

import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {ArrowLeft, ArrowRight, X} from 'lucide-react';

const steps = [
  {target:'write',title:'Start Writing',text:'Start a new writing adventure. Choose your characters, plan your ideas, then write your story.',side:'left'},
  {target:'cagent',title:'Meet Cagent',text:'Click the bear to chat freely. Ask for ideas or ask what to do next.',side:'right'},
  {target:'garden',title:'Watch your values grow',text:'After you finish a story, trees grow for the values your story shows. Tap a tree to see its growth record.',side:'above'},
  {target:'board',title:'Your Writing Board',text:'Read your past writing and the comments your teachers and friends have left for you.',side:'left'},
  {target:'friends',title:'Visit Others’ Farms',text:'Visit your friends’ farms and read their writing.',side:'left'},
  {target:'settings',title:'Your Settings',text:'Set up your personal information and choose your avatar.',side:'right'},
] as const;

type Rect = {x:number;y:number;width:number;height:number};
type Placement = {target:Rect;left:number;top:number;path:string};
const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(n,Math.max(min,max)));

export default function FarmGuide() {
  const [open,setOpen] = useState(false);
  const [step,setStep] = useState(0);
  const [placement,setPlacement] = useState<Placement|null>(null);
  const bulb = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/:/g,'');
  const current = steps[step];
  const close = ()=>{setOpen(false);bulb.current?.focus();};

  useLayoutEffect(()=>{
    if(!open) return;
    let frame=0;
    const measure=()=>{
      const nodes=[...document.querySelectorAll<HTMLElement>(`[data-farm-guide="${current.target}"]`)];
      if(!nodes.length || !card.current) return;
      const rects=nodes.map(node=>node.getBoundingClientRect());
      const x=Math.min(...rects.map(r=>r.left)),y=Math.min(...rects.map(r=>r.top));
      const right=Math.max(...rects.map(r=>r.right)),bottom=Math.max(...rects.map(r=>r.bottom));
      const target={x:Math.max(8,x-8),y:Math.max(8,y-8),width:Math.min(innerWidth-16,right-x+16),height:bottom-y+16};
      const w=card.current.offsetWidth,h=card.current.offsetHeight,cx=target.x+target.width/2,cy=target.y+target.height/2;
      let left=current.side==='right'?right+65:current.side==='left'?x-w-65:cx-w/2;
      let top=current.side==='above'?y-h-60:cy-h/2;
      left=clamp(left,20,innerWidth-w-20); top=clamp(top,85,innerHeight-h-50);
      let sx=left+w/2,sy=top+h+8,ex=cx,ey=target.y-10;
      if(current.side==='left'){sx=left+w+8;sy=top+h/2;ex=target.x-10;ey=cy;}
      if(current.side==='right'){sx=left-8;sy=top+h/2;ex=target.x+target.width+10;ey=cy;}
      const path=current.side==='above'?`M${sx} ${sy} C${sx} ${sy+35},${ex} ${ey-35},${ex} ${ey}`:`M${sx} ${sy} C${(sx+ex)/2} ${sy},${(sx+ex)/2} ${ey},${ex} ${ey}`;
      setPlacement({target,left,top,path});
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    measure();
    const observer=new ResizeObserver(schedule);
    observer.observe(card.current!);
    const scene=document.querySelector('[data-stage="userProfile"]');
    if(scene)observer.observe(scene);
    window.addEventListener('resize',schedule);
    return ()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);};
  },[open,current]);

  useEffect(()=>{
    if(!open)return;
    closeButton.current?.focus();
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);bulb.current?.focus();}
      if(event.key==='Tab'){
        const buttons=[...card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]];
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keydown);
    return ()=>document.removeEventListener('keydown',keydown);
  },[open]);

  return <>
    <button ref={bulb} className="farm-guide-bulb" onClick={()=>{setStep(0);setOpen(true);}} aria-label="Farm beginner guide" title="Show me around" aria-haspopup="dialog">
      <svg viewBox="0 0 36 40" width="30" height="32" aria-hidden="true"><path d="M11 26 C11 22 5 20 5 13 A13 12 0 0 1 31 13 C31 20 25 22 25 26Z" fill="#ffe29b" stroke="#89623a" strokeWidth="2.3"/><path d="M14 25 L13 15 L18 18 L23 15 L22 25" fill="none" stroke="#c69742" strokeWidth="1.8"/><path d="M11 27 H25 V34 Q18 40 11 34Z" fill="#c4b699" stroke="#89623a" strokeWidth="2"/><path d="M12 29 H24 M12 33 H24" stroke="#fff1c9" strokeWidth="1.7"/><path d="M9 11 Q9 7 13 5" fill="none" stroke="#fff9e0" strokeWidth="2.5" strokeLinecap="round"/></svg>
    </button>
    {open&&<div className="farm-guide-overlay" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`}>
      <svg className="farm-guide-arrows" width="100%" height="100%" aria-hidden="true"><defs><mask id={`${id}-spotlight`}><rect width="100%" height="100%" fill="white"/>{placement&&<rect x={placement.target.x} y={placement.target.y} width={placement.target.width} height={placement.target.height} rx="18" fill="black"/>}</mask><marker id={`${id}-arrow`} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 2 L10 6 L2 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs><rect width="100%" height="100%" fill="#172c26" opacity=".48" mask={`url(#${id}-spotlight)`}/>{placement&&<><rect x={placement.target.x} y={placement.target.y} width={placement.target.width} height={placement.target.height} rx="18" fill="none" stroke="white" strokeWidth="4" strokeDasharray="12 10"/><path d={placement.path} fill="none" stroke="white" strokeWidth="5" strokeDasharray="12 10" strokeLinecap="round" markerEnd={`url(#${id}-arrow)`}/></>}</svg>
      <div ref={card} className="farm-guide-card" style={{left:placement?.left??20,top:placement?.top??100}}>
        <button ref={closeButton} className="farm-guide-close" onClick={close} aria-label="Close farm guide"><X size={21}/></button>
        <span className="farm-guide-kicker">A quick look around · {step+1} / {steps.length}</span>
        <h2 id={`${id}-title`}>{current.title}</h2><p id={`${id}-text`}>{current.text}</p>
        <div className="farm-guide-progress" aria-hidden="true">{steps.map((s,i)=><span key={s.target} className={i<=step?'filled':''}/>)}</div>
        <div className="farm-guide-actions"><button disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={17}/> Back</button><button onClick={()=>step===steps.length-1?close():setStep(s=>s+1)}>{step===steps.length-1?'Got it!':'Next'}<ArrowRight size={17}/></button></div>
      </div>
    </div>}
  </>;
}
