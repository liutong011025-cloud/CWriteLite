'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {Bear} from './common';

export default function WritingCoach({message,busy}:{message:string;busy:boolean}) {
    const bubble=useRef<HTMLDivElement>(null),[height,setHeight]=useState(170);
    useLayoutEffect(()=>{
        const node=bubble.current;if(!node)return;
        const measure=()=>setHeight(Math.max(170,node.offsetHeight+24));
        const observer=new ResizeObserver(measure);observer.observe(node);measure();return()=>observer.disconnect();
    },[]);
    return <div className="writing-coach-shelf" style={{height}}>
        <div ref={bubble} className="bear-bubble writing-coach-message" role="status" aria-live="polite">{message}{busy&&<span aria-label="Cagent is reading your latest ideas"> ···</span>}</div>
        <div className="writing-canvas-bear"><Bear pose="cagent-board.webp" busy={busy} showHelp={false}/></div>
    </div>;
}
