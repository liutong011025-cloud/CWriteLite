export type Rect = {left:number;top:number;width:number;height:number};
export type BubblePlacement = Rect & {side:'above'|'left'|'right'|'below';anchor:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const area=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));
/** Bubble size comes from the actor's current stage width; editing keeps a usable text field. */
export function dramaBubbleSize(actor:Rect,stage:{width:number;height:number},editing=false){
    const scale=actor.width/Math.max(1,stage.width*.26);
    return {width:Math.min(stage.width-20,clamp((editing?230:185)*Math.sqrt(scale),editing?180:112,editing?350:300)),fontSize:clamp(17*Math.pow(scale,.2),14,22)};
}

/** Place words around the actor, preferring free space above, then either side. */
export function placeDramaBubble(actor:Rect,size:{width:number;height:number},stage:{width:number;height:number},actors:Rect[],occupied:Rect[]=[]):BubblePlacement {
    const margin=10,gap=clamp(actor.width*.1,14,28),width=Math.min(size.width,stage.width-margin*2),height=Math.min(size.height,stage.height-margin*2);
    const cx=actor.left+actor.width/2,cy=actor.top+actor.height/2;
    const candidates=[
        {left:cx-width/2,top:actor.top-height-gap,side:'above' as const},
        {left:actor.left-width-gap,top:cy-height/2,side:'left' as const},
        {left:actor.left+actor.width+gap,top:cy-height/2,side:'right' as const},
        {left:cx-width/2,top:actor.top+actor.height+gap,side:'below' as const},
    ];
    // Stay beside this actor; never send its words to a detached corner of the stage.
    for(const offset of [-width/2,width/2])candidates.push({left:cx-width/2+offset,top:actor.top-height-gap,side:'above'});
    let best=candidates[0],score=Infinity;
    for(const [index,c] of candidates.entries()){
        const rect={left:clamp(c.left,margin,stage.width-width-margin),top:clamp(c.top,margin,stage.height-height-margin),width,height};
        const overlap=actors.reduce((n,a)=>n+area(rect,a),0)*20+occupied.reduce((n,a)=>n+area(rect,a),0)*12;
        const moved=Math.abs(rect.left-c.left)+Math.abs(rect.top-c.top);
        const distance=Math.hypot(rect.left+width/2-cx,rect.top+height/2-cy);
        const cost=overlap+moved*3+distance*2+index*12;
        if(cost<score){score=cost;best={...c,...rect};}
    }
    const rect={...best,width,height};
    const horizontal=best.side==='above'||best.side==='below';
    return {...rect,anchor:horizontal?clamp(cx-rect.left,20,width-20):clamp(cy-rect.top,22,height-22)};
}
