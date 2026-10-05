export type MapMarker = {id:string;x:number;y:number;width:number;height:number;anchorX?:number;anchorY?:number};
/** Move only the wooden title. anchorX/anchorY stay on the saved pin so the illustration does not move with the label. */
export function arrangeMapMarkers(markers:MapMarker[],width:number,height:number,obstacles:MapMarker[]=[]){
    const placed:MapMarker[]=[{id:'pin-dock',x:width-126,y:height-145,width:224,height:310},...obstacles];
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
        return {...chosen,anchorX:marker.x,anchorY:marker.y};
    });
}
/** Pick an unused map point. Callers save this point; the image model does not choose it. */
export function freeMapPoint(used:{x:number;y:number}[]) {
    const spots=[{x:22,y:32},{x:50,y:46},{x:78,y:70},{x:32,y:74},{x:66,y:28},{x:18,y:58},{x:84,y:42}];
    return spots.find(spot=>used.every(point=>Math.hypot(point.x-spot.x,point.y-spot.y)>=14))||{x:Math.min(88,16+used.length*11),y:Math.min(80,24+(used.length%4)*14)};
}
