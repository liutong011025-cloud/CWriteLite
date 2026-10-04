"use client"
import { type RoofLayout, type RoofPinId } from "@/lib/roof-layout"
type RoofDockProps = {
  contained?: boolean
  onSelectPin?: (id: RoofPinId) => void
  layout: RoofLayout
  showCoach: boolean
  onDragPinStart: (id: RoofPinId) => void
  onDragPinEnd?: () => void
}
export default function RoofDock({contained = false, onSelectPin, layout, showCoach, onDragPinStart, onDragPinEnd}: RoofDockProps) {
  return <>
    <div className={`story-pin-dock ${contained ? 'contained' : ''}`} style={{right:layout.roofRight,bottom:layout.roofBottom,width:layout.roofWidth,height:layout.roofWidth*1.5}}>
      <img src="/story-pin-shelf-v2.webp" alt="Two-compartment wooden pin box" className="pin-shelf-art" draggable={false}/>
      <span className="pin-box-title">Your Writing Type</span>
      <button type="button" draggable className={`story-shelf-pin ${showCoach ? 'breathe' : ''}`} aria-label="Drag Story pin onto the map"
        onClick={e=>{e.stopPropagation();onSelectPin?.('story')}}
        onDragStart={e=>{e.dataTransfer.setData('text/plain','story');e.dataTransfer.effectAllowed='copy';onDragPinStart('story');e.dataTransfer.setDragImage(e.currentTarget,e.currentTarget.offsetWidth/2,e.currentTarget.offsetHeight/2)}}
        onDragEnd={()=>onDragPinEnd?.()}>
        <img src="/storypin.webp" alt="Story" draggable={false}/>
      </button>
      <button type="button" draggable className="story-shelf-pin drama-shelf-pin" aria-label="Drag Drama pin onto the map"
        onClick={e=>{e.stopPropagation();onSelectPin?.('drama')}}
        onDragStart={e=>{e.dataTransfer.setData('text/plain','drama');e.dataTransfer.effectAllowed='copy';onDragPinStart('drama');e.dataTransfer.setDragImage(e.currentTarget,e.currentTarget.offsetWidth/2,e.currentTarget.offsetHeight/2)}}
        onDragEnd={()=>onDragPinEnd?.()}>
        <img src="/dramapin-small.webp" alt="Drama" draggable={false}/>
      </button>
    </div>
  </>
}
