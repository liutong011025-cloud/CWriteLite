'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import type {Character,DramaActor,DramaScene} from '@/lib/types';
import {actorImage} from '@/lib/sprite';
import {placeDramaBubble,dramaBubbleSize,type Rect} from '@/lib/drama-bubble-layout';
import DramaConnector from './drama-connector';

export default function DramaScenePreview({scene,characters,activeLineId,backgroundOnly=false,hideWords=false}:{scene:DramaScene;characters:Character[];activeLineId?:string;backgroundOnly?:boolean;hideWords?:boolean}) {
    const stage=useRef<HTMLDivElement>(null),actors=useRef(new Map<string,HTMLDivElement>()),bubbles=useRef(new Map<string,HTMLDivElement>());
    const [size,setSize]=useState({width:600,height:410}),[version,setVersion]=useState(0);
    useLayoutEffect(()=>{
        const node=stage.current;if(!node)return;
        const measure=()=>{setSize({width:node.clientWidth,height:node.clientHeight});setVersion(v=>v+1);};
        const observer=new ResizeObserver(measure);observer.observe(node);actors.current.forEach(n=>observer.observe(n));bubbles.current.forEach(n=>observer.observe(n));measure();return()=>observer.disconnect();
    },[scene.id,scene.actors.length,backgroundOnly,activeLineId]);
    function actorRect(a:DramaActor):Rect {const n=actors.current.get(a.characterId),width=size.width*.26*a.scale,height=n?.offsetWidth?n.offsetHeight*width/n.offsetWidth:size.height*.38*a.scale;return {left:a.x/100*size.width-width/2,top:a.y/100*size.height-height,width,height};}
    const rects=scene.actors.map(actorRect),occupied:Rect[]=[];
    void version;
    return <div ref={stage} className="drama-scene-preview" aria-label={'Complete stage: '+scene.name}>
        {scene.backgroundImageUrl&&<img className="drama-complete-background" src={scene.backgroundImageUrl} alt={scene.backgroundPrompt}/>}
        {!backgroundOnly&&scene.actors.map(a=>{const c=characters.find(c=>c.id===a.characterId);return c?<div ref={n=>{if(n)actors.current.set(a.characterId,n);else actors.current.delete(a.characterId);}} key={a.characterId} className={'drama-preview-actor '+(activeLineId&&scene.lines.find(l=>l.id===activeLineId)?.characterId===a.characterId?'is-speaking':'')} style={{left:a.x+'%',top:a.y+'%',width:26*a.scale+'%'}}><img src={actorImage(c)} alt={c.name} style={{transform:a.flipped?'scaleX(-1)':undefined}}/><b>{c.name}</b></div>:null;})}
        {!backgroundOnly&&!hideWords&&scene.actors.map(a=>{const c=characters.find(c=>c.id===a.characterId),line=scene.lines.find(l=>l.characterId===a.characterId&&l.text.trim());if(!c||!line||activeLineId&&activeLineId!==line.id)return null;
            const sizing=dramaBubbleSize(actorRect(a),size),p=placeDramaBubble(actorRect(a),{width:sizing.width,height:bubbles.current.get(a.characterId)?.offsetHeight||100},size,rects,occupied);occupied.push(p);
            return <div className={'drama-character-writing drama-final-bubble '+line.kind} key={'words-'+a.characterId} ref={n=>{if(n)bubbles.current.set(a.characterId,n);else bubbles.current.delete(a.characterId);}} style={{left:p.left,top:p.top,width:p.width,'--drama-word-size':sizing.fontSize+'px'} as React.CSSProperties}><div className={'drama-bubble-preview '+line.kind}><b>{c.name}{line.kind==='thought'?' thinks':' says'}</b><span>{line.text}</span></div><DramaConnector placement={p} thought={line.kind==='thought'}/></div>;
        })}
    </div>;
}
