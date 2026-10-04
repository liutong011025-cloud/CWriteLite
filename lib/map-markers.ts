export type MapMarker = {id:string;x:number;y:number;width:number;height:number};
/** Separate labels without changing the saved position of the work itself. */
export function arrangeMapMarkers(markers:MapMarker[],width:number,height:number){
    const placed:MapMarker[]=[{id:'pin-dock',x:width-126,y:height-145,width:224,height:310}];
    const right=Math.max(100,width-120), bottom=Math.max(140,height-150);
    return markers.map(marker=>{
        const candidates:MapMarker[]=[];
        const step=Math.max(210,marker.width+20);
        for(let ring=0;ring<=6;ring++)for(const [dx,dy] of ring===0?[[0,0]]:[[0,ring*72],[0,-ring*72],[ring*step,0],[-ring*step,0],[ring*step,ring*72],[-ring*step,ring*72]]){
            candidates.push({...marker,x:Math.max(marker.width/2+12,Math.min(right-marker.width/2,marker.x+dx)),y:Math.max(marker.height+20,Math.min(bottom,marker.y+dy))});
        }
        const overlaps=(a:MapMarker,b:MapMarker)=>a.x-a.width/2<b.x+b.width/2+14&&a.x+a.width/2+14>b.x-b.width/2&&a.y-a.height<b.y+14&&a.y+14>b.y-b.height;
        const chosen=candidates.find(c=>placed.every(p=>!overlaps(c,p)))||candidates.reduce((best,c)=>placed.filter(p=>overlaps(c,p)).length<placed.filter(p=>overlaps(best,p)).length?c:best,candidates[0]);
        placed.push(chosen);
        return chosen;
    });
}
