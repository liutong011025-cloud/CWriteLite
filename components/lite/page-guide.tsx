'use client';

import {useEffect, useId, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowLeft, ArrowRight, X} from 'lucide-react';

type GuideStep = {target:string; title:string; text:string};
const guides: Record<string, readonly GuideStep[]> = {
  map: [
    {target:'.story-pin-dock',title:'Choose a writing type',text:'Drag Story or Drama out of the wooden box and onto your map. Story tells events in five parts. Drama uses scenes, dialogue and thoughts. You can also click a pin, then click a place on the map.'},
    {target:'.map-drawing-surface',title:'Your writing world',text:'Click a saved pin to read your work. Continue opens an unfinished draft. Its × lets you review the draft before choosing whether to delete it.'},
    {target:'.map-farm-link',title:'Back to your farm',text:'Click My Farm to visit your garden, read comments on your Writing Board, or visit your friends’ farms.'},
  ],
  characters: [
    {target:'.character-deck',title:'Choose your characters',text:'Click a character card to choose who will be in your story. Or click Create a New Character to make someone new.'},
    {target:'.deck-pack-corner',title:'Open your character pack',text:'Open the pack to explore character ideas. Choose one you like and make it your own.'},
    {target:'.deck-bottom > button',title:'Ready to plan?',text:'Choose at least one character, then click this button to open your Story Canvas.'},
  ],
  studio: [
    {target:'.species-picker',title:'Choose a species',text:'First, choose what kind of character you want to create. You can also imagine your own species.'},
    {target:'.sketch-section',title:'Draw your idea',text:'Draw what your character looks like. Use the pencil, eraser and undo tools. A simple sketch is enough.'},
    {target:'.character-input-fields',title:'Tell us about your character',text:'Give your character a name. Add how they look and what they are like. Age and the extra details are optional.'},
    {target:'.tips-box',title:'Need a word?',text:'Click a details field and AI Tips will help with that field. Tap a word you like, then change it to fit your character.'},
    {target:'.studio-footer > div',title:'Make your portrait',text:'Choose a species, add a name, then draw or describe your character. Generate portrait makes one picture for your card.'},
    {target:'.portrait-section',title:'Save your card',text:'Your picture is ready to use straight away. Click Save character & continue to keep it in your deck.'},
  ],
  detail: [
    {target:'.character-detail',title:'Meet your character',text:'Read your character’s details here. The pencil lets you edit your card.'},
    {target:'.character-facts > .purple-button',title:'Bring them into your story',text:'Click Use in my story, then choose your characters and continue to the Story Canvas.'},
  ],
  canvas: [
    {target:'.canvas-example-button',title:'See an example',text:'Click View examples. The window shows a canvas on the left and its story on the right. Notice how the cards and connections become events. Then come back and make your own plan.'},
    {target:'.canvas-toolbar',title:'Build your story plan',text:'Your characters are already here. Add an object, a setting, a goal or a note. For an object, write your idea and click Add text card. Add a picture only if you want one. A setting picture becomes the background.'},
    {target:'.canvas-surface',title:'Move and connect your ideas',text:'Drag cards to arrange your plan. Drag any corner dot to another card, then write how the two ideas connect.'},
    {target:'.connection-suggestions',title:'Plan with Cagent',text:'Click Suggest connections for ideas. Pale, glowing lines appear on the canvas. Click a line or its label to keep it. You choose what belongs in your story.'},
    {target:'.page-bottom > button',title:'Start writing',text:'Click Start writing for a quick AI plan check. If ideas need connecting, you can keep planning or choose Write anyway. Your canvas stays with you as you write.'},
  ],
  write: [
    {target:'.section-tabs',title:'Write one part at a time',text:'Begin with The Beginning, then follow the five story parts. Finish the current part before moving to the next.'},
    {target:'.writing-editor',title:'Your story, your words',text:'Use the question above the writing box to get started. Write simple sentences about your characters and your plan.'},
    {target:'.canvas-preview',title:'Keep your plan nearby',text:'Look at your Story Canvas to remember the people, goal and connections you planned. View Full Canvas makes it easier to see.'},
    {target:'.ai-suggestions',title:'A little help with words',text:'Click Get Suggestions when you need help. Choose a word or a sentence frame, then add your own ideas.'},
    {target:'.progress-coach',title:'Listen to Cagent',text:'Cagent reads your plan and your latest writing. The question here can help you think about what happens next.'},
    {target:'.editor-bottom',title:'Ready for the next part?',text:'Click Next section. Cagent checks that your writing makes sense and connects to your plan. Small language mistakes are okay. Add a little more if Cagent asks.'},
  ],
  finish: [
    {target:'.story-paper',title:'Read your whole story',text:'Read all five parts together. Give your story a title and check that the events make sense.'},
    {target:'.final-check',title:'Share your adventure',text:'You can keep editing, download or print your story. Save to My Writing Map when you are happy with it.'},
  ],
  'drama-scenes': [
    {target:'.drama-background-controls',title:'First, make a place',text:'Describe where your scene happens. Make background turns your idea into the picture on your stage.'},
    {target:'.drama-cast-pack',title:'Open your character pack',text:'Click the purple pack to see all the characters you have created. The cards open in a small window on this page. Choose a card, then return to your scene. Story and Drama share this library.'},
    {target:'.drama-stage',title:'Arrange the stage',text:'Drag a character to move them. Click them to change their size or flip which way they face. Use the arrow keys if you prefer.'},
    {target:'.drama-scene-navigation',title:'One place, or several?',text:'Click the + beside your scene cards to add another scene. Click a scene picture to come back to it. Each scene keeps its own characters and lines.'},
    {target:'.drama-stage',title:'Says or Thinks',text:'Click a character on stage to write their speech or private thought in a bubble. Give each character their own words.'},
    {target:'.drama-scene-description',title:'Describe your scene',text:'In your own words, describe the place and what is happening. This is part of your final script.'},
    {target:'.drama-scene-coach',title:'Think with Cagent',text:'The bear above your stage reads your scene and offers a question to help you think. Keep writing in your own words; you do not need to reply to Cagent.'},
    {target:'.drama-review-button',title:'Review My Drama',text:'Finish your scenes, character words and scene descriptions. Click this button on the right to read your complete script.'},
  ],
  'drama-write': [
    {target:'.drama-stage',title:'Write on your stage',text:'Choose a character on the stage. Write in the bubble above their picture: Says is spoken dialogue; Thinks is private. Every character’s words appear together.'},
    {target:'.drama-character-writing',title:'Says or Thinks',text:'Choose a character, then pick Says or Thinks in the bubble above their picture. Write one contribution for that character. Changing the choice replaces its type; it does not add a second bubble.'},
    {target:'.drama-language',title:'Ideas for your own scene',text:'Click Get suggestions when you want help. AI reads your background, cast and current lines. If you chose Says or Thinks, the suggestions match that character and choice. Click a sentence frame to insert it above that character, then fill its blanks. Without a choice, get ideas for the whole scene.'},
    {target:'.drama-scene-coach',title:'Think with Cagent',text:'The bear above your stage reads your current scene. Its question helps you plan your characters’ words. You do not need to type a reply.'},
    {target:'.drama-stage-tools',title:'Arrange your characters',text:'Move, resize or flip your selected character. Speech and thoughts stay visible together; there is no playback or line order.'},
    {target:'.drama-review-button',title:'Review My Drama',text:'Give each character one speech or thought, finish the scene descriptions and fill any blanks. Click here to read your complete script.'},
  ],
  'drama-finish': [
    {target:'.drama-script-paper',title:'Your complete script',text:'Read each scene, the dialogue, thoughts and directions together. Make sure your characters sound like themselves.'},
    {target:'.final-check',title:'Save your drama',text:'Keep editing, ask Cagent for a review, or download and print your script. Save to My Writing Map adds it at your Drama pin and to your Writing Board. Values grow when your writing shows them.'},
  ],
};

const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(n,Math.max(min,max)));
type Placement={x:number;y:number;width:number;height:number;left:number;top:number;path:string};

export default function PageGuide({screen,userId,firstVisit=false,onSeen}:{screen:string;userId?:string;firstVisit?:boolean;onSeen?:()=>void}) {
  const steps=guides[screen];
  const [open,setOpen]=useState(false),[step,setStep]=useState(0),[placement,setPlacement]=useState<Placement|null>(null);
  const bulb=useRef<HTMLButtonElement>(null),card=useRef<HTMLDivElement>(null),closeButton=useRef<HTMLButtonElement>(null);
  const id=useId().replace(/:/g,'');
  const current=steps?.[step];
  const close=()=>{setOpen(false);bulb.current?.focus();};
  const started=useRef(false);
  useEffect(()=>{
    if(screen!=='canvas'||!userId||!firstVisit||started.current)return;
    const key=`cwrite-guide:${userId}:canvas:v1`;
    let seen=false;
    try {seen=localStorage.getItem(key)==='seen';}catch{}
    if(seen)return;
    started.current=true;
    try {localStorage.setItem(key,'seen');}catch{}
    setStep(0);setOpen(true);onSeen?.();
  },[screen,userId,firstVisit,onSeen]);

  useLayoutEffect(()=>{
    if(!open||!current||!card.current)return;
    let frame=0;
    const target=document.querySelector<HTMLElement>(current.target);
    target?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
    const measure=()=>{
      if(!target||!card.current){setPlacement(null);return;}
      const r=target.getBoundingClientRect(),w=card.current.offsetWidth,h=card.current.offsetHeight;
      const x=clamp(r.left-8,8,innerWidth-16),y=clamp(r.top-8,8,innerHeight-16);
      const width=Math.max(0,Math.min(innerWidth-8,r.right+8)-x),height=Math.max(0,Math.min(innerHeight-8,r.bottom+8)-y);
      const rightSpace=innerWidth-(x+width),leftSpace=x;
      let left:number,top:number,sx:number,sy:number,ex:number,ey:number;
      if(Math.max(rightSpace,leftSpace)>w+45){
        const right=rightSpace>=leftSpace;
        left=right?x+width+35:x-w-35;top=clamp(y+height/2-h/2,16,innerHeight-h-16);
        sx=right?left-8:left+w+8;sy=top+h/2;ex=right?x+width+8:x-8;ey=y+height/2;
      }else{
        left=clamp(x+width/2-w/2,16,innerWidth-w-16);
        const below=innerHeight-y-height>y;
        top=clamp(below?y+height+35:y-h-35,16,innerHeight-h-16);
        sx=left+w/2;sy=below?top-8:top+h+8;ex=x+width/2;ey=below?y+height+8:y-8;
      }
      const path=`M${sx} ${sy} Q${(sx+ex)/2} ${sy},${ex} ${ey}`;
      setPlacement({x,y,width,height,left,top,path});
    };
    const schedule=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);observer.observe(card.current);if(target)observer.observe(target);
    measure();window.addEventListener('resize',schedule);document.addEventListener('scroll',schedule,true);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('scroll',schedule,true);};
  },[open,current]);

  useEffect(()=>{
    if(!open)return;
    closeButton.current?.focus({preventScroll:true});
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();setOpen(false);bulb.current?.focus({preventScroll:true});}
      if(event.key==='Tab'){
        const buttons=[...card.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[]];
        const first=buttons[0],last=buttons[buttons.length-1];
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    document.addEventListener('keydown',keydown);return()=>document.removeEventListener('keydown',keydown);
  },[open]);

  if(!steps||!current)return null;
  return <>
    <button ref={bulb} className="page-guide-bulb" aria-label="Page beginner guide" title="Show me what to do" aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setStep(0);setPlacement(null);setOpen(true);}}>
      <svg viewBox="0 0 36 40" width="25" height="28" aria-hidden="true"><path d="M11 26 C11 22 5 20 5 13 A13 12 0 0 1 31 13 C31 20 25 22 25 26Z" fill="#ffe29b" stroke="#89623a" strokeWidth="2.3"/><path d="M14 25 L13 15 L18 18 L23 15 L22 25" fill="none" stroke="#c69742" strokeWidth="1.8"/><path d="M11 27 H25 V34 Q18 40 11 34Z" fill="#c4b699" stroke="#89623a" strokeWidth="2"/><path d="M12 29 H24 M12 33 H24" stroke="#fff1c9" strokeWidth="1.7"/><path d="M9 11 Q9 7 13 5" fill="none" stroke="#fff9e0" strokeWidth="2.5" strokeLinecap="round"/></svg>
    </button>
    {open&&createPortal(<div className="farm-guide-overlay page-guide-overlay" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-text`}>
      <svg className="farm-guide-arrows" width="100%" height="100%" aria-hidden="true"><defs><mask id={`${id}-spotlight`}><rect width="100%" height="100%" fill="white"/>{placement&&<rect x={placement.x} y={placement.y} width={placement.width} height={placement.height} rx="14" fill="black"/>}</mask><marker id={`${id}-arrow`} viewBox="0 0 12 12" refX="9" refY="6" markerWidth="5" markerHeight="5" orient="auto"><path d="M2 2 L10 6 L2 10" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></marker></defs><rect width="100%" height="100%" fill="#30271b" opacity=".48" mask={`url(#${id}-spotlight)`}/>{placement&&<><rect x={placement.x} y={placement.y} width={placement.width} height={placement.height} rx="14" fill="none" stroke="white" strokeWidth="4" strokeDasharray="12 10"/><path d={placement.path} fill="none" stroke="white" strokeWidth="5" strokeDasharray="12 10" strokeLinecap="round" markerEnd={`url(#${id}-arrow)`}/></>}</svg>
      <div ref={card} className="farm-guide-card page-guide-card" style={{left:placement?.left??20,top:placement?.top??100}}>
        <button ref={closeButton} className="farm-guide-close" onClick={close} aria-label="Close page guide"><X size={21}/></button>
        <span className="farm-guide-kicker">What to do here · {step+1} / {steps.length}</span>
        <h2 id={`${id}-title`}>{current.title}</h2><p id={`${id}-text`}>{current.text}</p>
        <div className="farm-guide-progress" aria-hidden="true">{steps.map((s,i)=><span key={s.title} className={i<=step?'filled':''}/>)}</div>
        <div className="farm-guide-actions"><button disabled={step===0} onClick={()=>setStep(s=>s-1)}><ArrowLeft size={17}/>Back</button><button onClick={()=>step===steps.length-1?close():setStep(s=>s+1)}>{step===steps.length-1?'Got it!':'Next'}<ArrowRight size={17}/></button></div>
      </div>
    </div>,document.body)}
  </>;
}
