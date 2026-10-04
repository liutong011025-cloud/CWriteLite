'use client';
import {useEffect,useRef} from 'react';
import {Cloud,MessageCircle,Trash2} from 'lucide-react';
import type {DramaLine} from '@/lib/types';
export default function DramaBubble({line,name,insertion,onKind,onText,onRemove}:{line?:DramaLine;name:string;insertion:number;onKind:(kind:'dialogue'|'thought')=>void;onText:(text:string)=>void;onRemove:()=>void}){
 const input=useRef<HTMLTextAreaElement>(null);
 useEffect(()=>{if(!insertion)return;const el=input.current;if(!el)return;el.focus({preventScroll:true});const blank=el.value.lastIndexOf('___');if(blank>=0){el.setSelectionRange(blank,blank+3);el.scrollTop=el.scrollHeight;}},[insertion]);
 return <section className={`drama-bubble-editor drama-left-editor ${line?.kind||''}`} aria-label={`${name}'s words`}><header><b>{name}</b></header><div className="drama-bubble-kinds" aria-label="What is this character doing?">{(['dialogue','thought'] as const).map(kind=><button key={kind} aria-pressed={line?.kind===kind} onClick={()=>onKind(kind)}>{kind==='dialogue'?<MessageCircle size={18}/>:<Cloud size={18}/>} {kind==='dialogue'?'Says':'Thinks'}</button>)}</div><textarea ref={input} aria-label={`Edit ${name} ${line?.kind||'words'}`} disabled={!line} placeholder={!line?'Choose Says or Thinks above.':line.kind==='thought'?'I think…':'What do I say?'} value={line?.text||''} onChange={e=>onText(e.target.value)} maxLength={1500}/><footer><span>{line?'Saved as you write':'One speech or thought'}</span>{line&&<button className="icon-button" aria-label={`Clear ${name}'s words`} onClick={onRemove}><Trash2 size={17}/></button>}</footer></section>;
}
