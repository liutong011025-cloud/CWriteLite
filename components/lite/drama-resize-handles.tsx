'use client';
import {useRef} from 'react';
import {DRAMA_MIN_SCALE,DRAMA_MAX_SCALE} from '@/lib/drama';

export default function DramaResizeHandles({name,scale,onScale}:{name:string;scale:number;onScale:(value:number)=>void}){
    const gesture=useRef<{pointerId:number;x:number;y:number;width:number;height:number;scale:number;side:number;vertical:number}|null>(null);
    const bounded=(value:number)=>Math.max(DRAMA_MIN_SCALE,Math.min(DRAMA_MAX_SCALE,value));
    return <>{[-1,1].flatMap(vertical=>[-1,1].map(side=><button key={vertical+'-'+side} type="button" data-process-drag="DR_ACTOR_RESIZE" data-process-target={name} data-process-state={String(scale)} className={'drama-resize-handle '+(side<0?'left':'right')+(vertical>0?' bottom':'')} aria-label={`Resize ${name}, ${vertical<0?'top':'bottom'} ${side<0?'left':'right'} corner`} title="Drag to resize" onKeyDown={e=>{
        if(['ArrowUp','ArrowRight','+','ArrowDown','ArrowLeft','-'].includes(e.key)){e.preventDefault();e.stopPropagation();onScale(bounded(scale+(['ArrowUp','ArrowRight','+'].includes(e.key)?.1:-.1)));}
    }} onPointerDown={e=>{
        if(e.button!==0)return;e.preventDefault();e.stopPropagation();
        const rect=e.currentTarget.parentElement?.querySelector('img')?.getBoundingClientRect();if(!rect)return;
        e.currentTarget.setPointerCapture(e.pointerId);gesture.current={pointerId:e.pointerId,x:e.clientX,y:e.clientY,width:rect.width,height:rect.height,scale,side,vertical};
    }} onPointerMove={e=>{
        const g=gesture.current;if(!g||g.pointerId!==e.pointerId)return;
        const vx=g.side*g.width/2,vy=g.vertical*g.height,delta=((e.clientX-g.x)*vx+(e.clientY-g.y)*vy)/(vx*vx+vy*vy);
        onScale(bounded(g.scale*(1+delta*1.8)));
    }} onPointerUp={()=>{gesture.current=null;}} onPointerCancel={()=>{gesture.current=null;}} onLostPointerCapture={()=>{gesture.current=null;}}><span aria-hidden="true"/></button>))}</>;
}
