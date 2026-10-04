"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { MapPin, PencilLine, ArrowLeft, ArrowRight, X } from "lucide-react"
import type { Language, StoryState, BookReviewState, LetterState, MapFlagItem } from "@/lib/types"
import type { JourneyType } from "@/components/stages/journey-ticket"
import RoofDock from "@/components/stages/roof-dock"
import { DEFAULT_ROOF_LAYOUT } from "@/lib/roof-layout"
import { Bear, Modal } from "@/components/lite/common"
import StoryPin from '@/components/lite/story-pin'
import {arrangeMapMarkers} from '@/lib/map-markers'

export interface DramaProgress { hasDramaBook: boolean }
export interface PoetryProgress { hasForm: boolean; hasTopic: boolean; hasLines: boolean; phase: "choose-form" | "setup-topic" | "editor" | "review" }
interface JourneyMapProps {
  language?: Language
  type?: JourneyType
  mapImageUrl?: string
  mapFlags?: MapFlagItem[]
  pin?: { x: number; y: number } | null
  onPinChange?: (pin: { x: number; y: number } | null) => void
  chapterIndex?: number
  onPrevChapter?: () => void
  onNextChapter?: () => void
  canMoveToNextChapter?: boolean
  storyState: StoryState
  bookReviewState: BookReviewState
  letterState: LetterState
  dramaProgress?: DramaProgress
  poetryProgress?: PoetryProgress
  noAi?: boolean
  onStartJourney?: (type: JourneyType, pin: {x:number;y:number}) => void
  drafts?: {id:string;title:string;pin:{x:number;y:number}|null;workType:'story'|'drama'}[]
  onResumeDraft?: (id:string) => void
  onDeleteDraft?: (id:string) => void
  resumeJourney?: boolean
  onContinue?: () => void
  onNavigate: (stage: string) => void
  onBack?: () => void
  onGoProfile?: () => void
  onFlagUpdate?: (id: string, updates: { title?: string; content?: string }) => void
  onEditStory?: (id: string) => void
}

export default function JourneyMap({ mapImageUrl, mapFlags = [], pin, onPinChange, chapterIndex = 0, onPrevChapter, onNextChapter, canMoveToNextChapter, onStartJourney, resumeJourney = false, onContinue, onNavigate, onGoProfile, onEditStory, drafts, onResumeDraft, onDeleteDraft }: JourneyMapProps) {
  const surface = useRef<HTMLDivElement>(null)
  const artwork = useRef<HTMLImageElement>(null)
  const [placing, setPlacing] = useState<'story'|'drama'|null>(null)
  const [selected, setSelected] = useState<MapFlagItem | null>(null)
  const [frame, setFrame] = useState({ left: 0, top: 0, width: 1, height: 1, containerWidth: 1, containerHeight: 1 })
  const imageUrl = mapImageUrl || (chapterIndex > 0 ? "/secondmap.webp" : "/firstmap.webp")
  const syncFrame = useCallback(() => {
    const box = surface.current, image = artwork.current
    if (!box || !image?.naturalWidth) return
    const r = box.getBoundingClientRect()
    const scale = Math.max(r.width / image.naturalWidth, r.height / image.naturalHeight)
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale
    setFrame({ left: (r.width - width) / 2, top: (r.height - height) / 2, width, height, containerWidth: r.width, containerHeight: r.height })
  }, [])
  useEffect(() => { const observer = new ResizeObserver(syncFrame); if (surface.current) observer.observe(surface.current); syncFrame(); return () => observer.disconnect() }, [syncFrame, imageUrl])
  useEffect(() => { setSelected(null); setPlacing(null) }, [chapterIndex])
  const position = (x: number, y: number) => ({ left: `${(frame.left + x / 100 * frame.width) / frame.containerWidth * 100}%`, top: `${(frame.top + y / 100 * frame.height) / frame.containerHeight * 100}%` })
  const point=(x:number,y:number)=>({x:frame.left+x/100*frame.width,y:frame.top+y/100*frame.height});
  const draftIds=new Set(drafts?.map(d=>d.id));
  const visibleFlags=mapFlags.filter(f=>!draftIds.has(f.id));
  const labels=[...visibleFlags.map(f=>({id:f.id,...point(f.x,f.y),width:168,height:52})),...(drafts||[]).filter(d=>d.pin).map(d=>({id:d.id,...point(d.pin!.x,d.pin!.y),width:220,height:135}))];
  const arranged=arrangeMapMarkers(labels,frame.containerWidth,frame.containerHeight);
  const labelPosition=(id:string,fallback:{x:number;y:number})=>{const label=arranged.find(p=>p.id===id);return label?{left:`${label.x}px`,top:`${label.y}px`}:position(fallback.x,fallback.y);};
  function place(clientX: number, clientY: number, kind: 'story'|'drama') {
    const box = surface.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const x = (clientX - r.left - frame.left) / frame.width * 100
    const y = (clientY - r.top - frame.top) / frame.height * 100
    if (x < 0 || y < 0 || x > 100 || y > 100) return
    setPlacing(null)
    if (onStartJourney) onStartJourney(kind,{x,y})
    else onNavigate("characters")
  }
  return <section className="writing-map-page">
      <div className={`map-drawing-surface ${placing ? "placing" : ""}`} ref={surface}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const kind=e.dataTransfer.getData('text/plain'); if(kind==='story'||kind==='drama')place(e.clientX,e.clientY,kind); }}
        onClick={e => { if (placing) place(e.clientX, e.clientY,placing) }}>
        <img ref={artwork} src={imageUrl} alt="Journey Map" onLoad={syncFrame} draggable={false} className="map-artwork" />
        <button className="map-farm-link" onClick={e => { e.stopPropagation(); onGoProfile?.() }} aria-label="Go to My Farm"><img src="/myfarm.webp" alt=""/><span>My Farm</span></button>
        <span className="chapter-label map-chapter-label">Chapter {chapterIndex + 1}</span>
        <RoofDock contained layout={{ ...DEFAULT_ROOF_LAYOUT, roofWidth: 204, roofRight: 24, roofBottom: 145 }} showCoach={!resumeJourney && !mapFlags.length} onDragPinStart={id=>setPlacing(id==='drama'?'drama':'story')} onDragPinEnd={() => setPlacing(null)} onSelectPin={id=>setPlacing(id==='drama'?'drama':'story')}/>
        {mapFlags.filter(f=>f.previewArt).map(f=><div key={`art-${f.id}`} className={`map-work-illustration ${f.workType==='drama'?'map-drama-theatre':''}`} style={position(f.x,f.y)} aria-hidden="true"><svg viewBox="0 0 110 90"><ellipse cx="55" cy="77" rx="50" ry="10" fill="#8fb36c"/><path d="M18 38L55 10L94 38V77H18Z" fill="#e4c383" stroke="#8f6940" strokeWidth="2"/><path d="M12 39L55 7L99 39" fill="none" stroke="#b6724b" strokeWidth="7" strokeLinecap="round"/><path d="M30 44H81V77H30Z" fill="#6f4e38"/><path d="M28 44Q50 60 36 76M82 44Q59 60 73 76" fill="none" stroke={f.workType==='drama'?'#ac675f':'#b6b674'} strokeWidth="8"/></svg>{f.previewArt?.imageUrl&&<img src={f.previewArt.imageUrl} alt=""/>}</div>)}
        <svg className="map-label-leaders" width={frame.containerWidth} height={frame.containerHeight} aria-hidden="true">{arranged.map(label=>{const original=labels.find(p=>p.id===label.id)!;return Math.hypot(original.x-label.x,original.y-label.y)>20?<line key={label.id} x1={original.x} y1={original.y} x2={label.x} y2={label.y}/>:null;})}</svg>
        {visibleFlags.map(flag => <button key={flag.id} className={`saved-story-flag ${flag.workType==='drama'?'drama-map-flag':''}`} style={labelPosition(flag.id,flag)} onClick={e => { e.stopPropagation(); setSelected(flag) }} aria-label={`${flag.workType==='drama'?'Drama: ':''}${flag.title}`}><span>{flag.title}</span></button>)}
        {drafts ? drafts.filter(d=>d.pin).map(d=><div key={d.id} className="resume-story-pin resume-story-with-dismiss" style={labelPosition(d.id,d.pin!)}>
          <button className="resume-story-main" onClick={e=>{e.stopPropagation();onResumeDraft?.(d.id);}} aria-label={`Continue ${d.workType}: ${d.title}`}>{d.workType==='drama'?<img className="drama-resume-art" src="/dramapin-small.webp" alt=""/>:<img className="story-resume-art" src="/storypin.webp" alt=""/>}<span>Continue {d.workType==='drama'?'drama':'writing'}<ArrowRight size={16}/></span></button>
          {onDeleteDraft&&<button className="resume-draft-close" onClick={e=>{e.stopPropagation();onDeleteDraft(d.id);}} aria-label={`Delete unfinished ${d.workType}: ${d.title}`}><X size={16}/></button>}
        </div>) : pin && resumeJourney && <button className="resume-story-pin" style={position(pin.x, pin.y)} onClick={e => { e.stopPropagation(); onContinue?.() }}><StoryPin compact/><span>Continue writing<ArrowRight size={16}/></span></button>}
        {placing && <div className="map-placement-message"><MapPin size={19}/>Choose a place for your {placing}<button onClick={e => { e.stopPropagation(); setPlacing(null) }}>Cancel</button></div>}
      <div className="map-paper-bottom"><Bear pose="cagent-welcome.webp" responsePose="cagent-planning-v2.webp" hints={["Every pin is a place for a new adventure.","Story tells what happens. Drama brings it to life with dialogue."]} message={resumeJourney ? "Your writing is waiting. Click its pin to continue!" : "Drag a Story or Drama pin onto your map to begin."}/><div className="map-chapter-actions">{chapterIndex > 0 && <button className="outline-button" onClick={onPrevChapter}><ArrowLeft size={18}/>Previous chapter</button>}{canMoveToNextChapter && <button className="purple-button" onClick={onNextChapter}>Next chapter<ArrowRight size={18}/></button>}</div></div>
      </div>
    {selected && <Modal title={selected.title} wide onClose={() => setSelected(null)}><div className="saved-story-reading">{selected.content || "Your writing will appear here after you finish."}</div><button className="purple-button" onClick={() => onEditStory?.(selected.id)}><PencilLine size={18}/>{selected.workType==='drama'?'Edit script':'Continue writing'}</button></Modal>}
  </section>
}
