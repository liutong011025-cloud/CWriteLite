import type { CanvasAnchor, CanvasNode } from './types';

export const CANVAS_ANCHORS: CanvasAnchor[] = ['top-left','top-right','bottom-left','bottom-right'];

export function canvasAnchorPoint(node:Pick<CanvasNode,'x'|'y'>,size:{width:number;height:number},anchor:CanvasAnchor) {
  return {x:node.x+(anchor.endsWith('right')?size.width:0),y:node.y+(anchor.startsWith('bottom')?size.height:0)};
}

export function closestCanvasAnchor(node:Pick<CanvasNode,'x'|'y'>,size:{width:number;height:number},point:{x:number;y:number}):CanvasAnchor {
  return CANVAS_ANCHORS.reduce((best,anchor)=>{
    const a=canvasAnchorPoint(node,size,anchor),b=canvasAnchorPoint(node,size,best);
    return Math.hypot(point.x-a.x,point.y-a.y)<Math.hypot(point.x-b.x,point.y-b.y)?anchor:best;
  },CANVAS_ANCHORS[0]);
}

export function wrapConnectionLabel(label: string) {
  const words = label.slice(0, 100).split(/\s+/).flatMap(word => word.match(/.{1,22}/g) || []);
  const lines: string[] = []; let line = '';
  for (const word of words) {
    if ((line + ' ' + word).trim().length > 22) { if (line) lines.push(line); line = word; }
    else line = (line + ' ' + word).trim();
  }
  if (line) lines.push(line);
  return lines;
}
type Box = { x: number; y: number; width: number; height: number };
type Connection = { source: string; target: string; label: string };
function overlap(a: Box, b: Box) {
  return Math.max(0, Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x)) *
    Math.max(0, Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
}
/** Place labels in free space, including other labels, within the drawing surface. */
export function connectionLabelBoxes(nodes: CanvasNode[], connections: Connection[], sizes:Record<string,{width:number;height:number}> = {}, metrics={width:180,lineHeight:18,padding:14}) {
  const occupied: Box[] = nodes.map(n => ({ x:n.x-5, y:n.y-5, width:(sizes[n.id]?.width||130)+10,
    height:(sizes[n.id]?.height||(n.type==='goal'||n.type==='note'?155:260))+10 }));
  return connections.map(edge => {
    const a = nodes.find(n=>n.id===edge.source), b = nodes.find(n=>n.id===edge.target);
    const width=metrics.width, height=wrapConnectionLabel(edge.label).length*metrics.lineHeight+metrics.padding;
    const centerX=a&&b?(a.x+b.x)/2+65:500, centerY=a&&b?(a.y+b.y)/2+70:310;
    let best: Box = {x:8,y:8,width,height}, bestScore=Infinity;
    for(const dy of [0,-40,40,-80,80,-120,120,-180,180,-240,240]) {
      for(const dx of [0,-100,100,-200,200,-300,300]) {
        const box={x:Math.max(8,Math.min(992-width,centerX-width/2+dx)),
          y:Math.max(8,Math.min(612-height,centerY-height/2+dy)),width,height};
        const score=occupied.reduce((sum,other)=>sum+overlap(box,other),0)*100 + Math.hypot(dx,dy);
        if(score<bestScore) {best=box;bestScore=score;}
      }
    }
    occupied.push({...best,x:best.x-5,y:best.y-5,width:best.width+10,height:best.height+10});
    return best;
  });
}
export function validDraggedConnection(source: string, target: string|null|undefined, distance: number) {
  return Boolean(target && target!==source && distance>5);
}
