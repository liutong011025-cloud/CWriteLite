export type Rect = {left:number;top:number;width:number;height:number};
export type BubblePlacement = Rect & {side:'above'|'left'|'right'|'below';anchor:number};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const area=(a:Rect,b:Rect)=>Math.max(0,Math.min(a.left+a.width,b.left+b.width)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.top+a.height,b.top+b.height)-Math.max(a.top,b.top));

/** Place words around the actor, preferring free space above, then either side. */
export function placeDramaBubble(actor:Rect,size:{width:number;height:number},stage:{width:number;height:number},actors:Rect[],occupied:Rect[]=[]):BubblePlacement {
    const margin=10,gap=28,width=Math.min(size.width,stage.width-margin*2),height=Math.min(size.height,stage.height-margin*2);
    const cx=actor.left+actor.width/2,cy=actor.top+actor.height/2;
    const candidates=[
        {left:cx-width/2,top:actor.top-height-gap,side:'above' as const},
        {left:actor.left-width-gap,top:cy-height/2,side:'left' as const},
        {left:actor.left+actor.width+gap,top:cy-height/2,side:'right' as const},
        {left:cx-width/2,top:actor.top+actor.height+gap,side:'below' as const},
    ];
    // Search other open spaces when neighbouring characters fill a preferred position.
    for(const left of [margin,stage.width-width-margin])for(const top of [margin,(stage.height-height)/2,stage.height-height-margin])candidates.push({left,top,side:left<cx?'left':'right'});
    let best=candidates[0],score=Infinity;
    for(const [index,c] of candidates.entries()){
        const rect={left:clamp(c.left,margin,stage.width-width-margin),top:clamp(c.top,margin,stage.height-height-margin),width,height};
        const overlap=actors.reduce((n,a)=>n+area(rect,a),0)*20+occupied.reduce((n,a)=>n+area(rect,a),0)*12;
        const moved=Math.abs(rect.left-c.left)+Math.abs(rect.top-c.top);
        const cost=overlap+moved*3+index*12;
        if(cost<score){score=cost;best={...c,...rect};}
    }
    const rect={...best,width,height};
    const horizontal=best.side==='above'||best.side==='below';
    return {...rect,anchor:horizontal?clamp(cx-rect.left,20,width-20):clamp(cy-rect.top,22,height-22)};
}
