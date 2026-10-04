'use client';
import {useEffect, useRef, useState} from 'react';
import {BookOpen, Mail, Rocket, ArrowRight} from 'lucide-react';
import type {StoryCanvas} from '@/lib/types';
import {Modal} from './common';
import {CanvasView} from './story-canvas';

const asset=(name:string)=>`/examples/${name}.webp`;
const examples=[
    {id:'letter',title:'The Lost Letter',theme:'A simple plan · helping a friend',icon:Mail,complex:false,canvas:{writingType:'story',nodes:[
        {id:'park',type:'setting',label:'Sunny park',imageUrl:asset('park'),x:0,y:0},
        {id:'fox',type:'character',label:'Fox',details:'clever, kind',imageUrl:'/dramacharacter/Fox Vendor.webp',x:55,y:45},
        {id:'pip',type:'character',label:'Pip',details:'worried postman',imageUrl:'/dramacharacter/Rabbit Postman.webp',x:740,y:45},
        {id:'letter',type:'object',label:'Lost letter',imageUrl:asset('letter'),x:355,y:365},
        {id:'goal',type:'goal',label:'Take it home',x:740,y:450},
    ],edges:[
        {id:'help',source:'fox',target:'pip',label:'offers help',color:'#c89563'},
        {id:'find',source:'fox',target:'letter',label:'finds under a tree',color:'#789db6'},
        {id:'deliver',source:'letter',target:'goal',label:'deliver together',color:'#b19562'},
    ]} as StoryCanvas,parts:['Pip lost a letter in the park. He looked worried.','“Can I help?” asked Fox. They searched along the path.','Fox saw something white under a tree. It was the letter!','“Thank you, Fox!” said Pip. They picked it up.','They took the letter home together. Pip was glad to have a kind friend.']},
    {id:'space',title:'Sky Garden Rescue',theme:'Two routes · one goal',icon:Rocket,complex:true,canvas:{writingType:'story',nodes:[
        {id:'space',type:'setting',label:'Orbital greenhouse',imageUrl:asset('space'),x:0,y:0},
        {id:'nova',type:'character',label:'Nova',details:'brave explorer',imageUrl:asset('nova'),x:35,y:45},
        {id:'bolt',type:'character',label:'Bolt',details:'careful helper',imageUrl:asset('robot'),x:35,y:355},
        {id:'problem',type:'note',label:'Lights are fading',x:300,y:90},
        {id:'cell',type:'object',label:'Energy cell',imageUrl:asset('battery'),x:320,y:395},
        {id:'door',type:'note',label:'Locked airlock',x:555,y:90},
        {id:'shuttle',type:'object',label:'Shuttle',imageUrl:asset('shuttle'),x:555,y:395},
        {id:'goal',type:'goal',label:'Save sky garden',x:805,y:50},
        {id:'share',type:'note',label:'Share the power',x:805,y:425},
    ],edges:[
        {id:'notice',source:'nova',target:'problem',label:'sees',color:'#c89563'},
        {id:'find',source:'bolt',target:'cell',label:'finds',color:'#789db6'},
        {id:'lock',source:'problem',target:'door',label:'no power',color:'#c89563'},
        {id:'unlock',source:'cell',target:'door',label:'A: open',color:'#b19562'},
        {id:'open',source:'door',target:'goal',label:'reach',color:'#b19562'},
        {id:'fly',source:'cell',target:'shuttle',label:'B: fly',color:'#789db6'},
        {id:'land',source:'shuttle',target:'share',label:'carry',color:'#789db6'},
        {id:'light',source:'share',target:'goal',label:'light',color:'#789db6'},
    ]} as StoryCanvas,parts:['Nova and Bolt visited a space garden. Its lights were fading.','Bolt found an energy cell. It could unlock the door or power their shuttle.','The door was stuck! The plants needed light soon.','Nova flew to the roof. Bolt took the cell inside.','They shared its power with the lights. The garden was safe. Teamwork had saved it.']},
];
const spaceLabelPositions={notice:{x:198,y:140},find:{x:205,y:485},lock:{x:447,y:125},unlock:{x:487,y:300},open:{x:698,y:140},fly:{x:459,y:485},land:{x:698,y:485},light:{x:825,y:290}};
const parts=['Beginning','Rising action','Climax','Falling action','Ending'];

export default function CanvasExamples({onClose}:{onClose:()=>void}) {
    const [index,setIndex]=useState(0),example=examples[index];
    const tabs=useRef<Array<HTMLButtonElement|null>>([]);
    useEffect(()=>{
        const previous=document.activeElement as HTMLElement|null;
        const overflow=document.body.style.overflow;
        document.body.style.overflow='hidden';tabs.current[0]?.focus();
        function keys(event:KeyboardEvent){
            if(event.key==='Escape'){event.preventDefault();onClose();}
            if(event.key==='Tab'){
                const dialog=tabs.current[0]?.closest('[role="dialog"]');
                const controls=dialog?.querySelectorAll<HTMLElement>('button:not([disabled]):not([tabindex="-1"])');
                if(!controls?.length)return;
                const first=controls[0],last=controls[controls.length-1];
                if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
                else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
            }
        }
        document.addEventListener('keydown',keys);
        return()=>{document.body.style.overflow=overflow;document.removeEventListener('keydown',keys);previous?.focus();};
    },[onClose]);
    return <Modal title="From a canvas to a story" wide onClose={onClose}><div className="canvas-examples">
        <div className="example-tabs" role="tablist" aria-label="Choose a canvas example">{examples.map((item,i)=>{const Icon=item.icon;return <button ref={el=>{tabs.current[i]=el;}} id={`example-tab-${item.id}`} role="tab" aria-selected={index===i} aria-controls="canvas-example-panel" tabIndex={index===i?0:-1} className={index===i?'active':''} key={item.id} onClick={()=>setIndex(i)} onKeyDown={event=>{let next=i;if(event.key==='ArrowRight')next=(i+1)%examples.length;else if(event.key==='ArrowLeft')next=(i+examples.length-1)%examples.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=examples.length-1;else return;event.preventDefault();setIndex(next);tabs.current[next]?.focus();}}><Icon size={19}/>{item.title}</button>;})}</div>
        <div id="canvas-example-panel" role="tabpanel" aria-labelledby={`example-tab-${example.id}`} className="canvas-example-layout">
            <section className={`example-plan ${example.complex?'complex-example':'simple-example'}`} aria-label={`${example.title}: example canvas`}><h3>Story Canvas <ArrowRight size={20}/></h3><CanvasView key={example.id} value={example.canvas} readOnly labelWidth={example.complex?60:165} labelPositions={example.complex?spaceLabelPositions:undefined}/></section>
            <article className="example-story"><header><span><BookOpen size={17}/>{example.theme}</span><h3>{example.title}</h3></header>{example.parts.map((text,i)=><section key={parts[i]}><b><i>{i+1}</i>{parts[i]}</b><p>{text}</p></section>)}</article>
        </div>
    </div></Modal>;
}
