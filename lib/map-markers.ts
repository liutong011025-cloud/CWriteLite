export type MapMarker = {id:string;x:number;y:number;width:number;height:number;anchorX?:number;anchorY?:number};
/** Move only the wooden title. anchorX/anchorY stay on the saved pin so the illustration does not move with the label. */
export function arrangeMapMarkers(markers:MapMarker[],width:number,height:number,obstacles:MapMarker[]=[]){
    const placed:MapMarker[]=[{id:'pin-dock',x:width-126,y:height-145,width:224,height:310},{id:'farm',x:85,y:180,width:150,height:180},{id:'coach',x:Math.min(300,width/2),y:height,width:Math.min(600,width),height:185},{id:'chapter',x:width-95,y:75,width:180,height:75},{id:'actions',x:width-145,y:height,width:290,height:145},...obstacles];
    return markers.map(marker=>{
        const candidates:MapMarker[]=[];
        const minX=marker.width/2+12,maxX=Math.max(minX,width-marker.width/2-12),minY=marker.height+12,maxY=Math.max(minY,height-12);
        const candidate=(x:number,y:number)=>({...marker,x:Math.max(minX,Math.min(maxX,x)),y:Math.max(minY,Math.min(maxY,y))});
        candidates.push(candidate(marker.x,marker.y));
        for(let y=minY;y<=maxY;y+=24)for(let x=minX;x<=maxX;x+=36)candidates.push(candidate(x,y));
        const overlapArea=(a:MapMarker,b:MapMarker)=>Math.max(0,Math.min(a.x+a.width/2+14,b.x+b.width/2)-Math.max(a.x-a.width/2-14,b.x-b.width/2))*Math.max(0,Math.min(a.y+14,b.y)-Math.max(a.y-a.height-14,b.y-b.height));
        const score=(c:MapMarker)=>placed.reduce((total,p)=>total+overlapArea(c,p),0)*10000+Math.hypot(c.x-marker.x,c.y-marker.y);
        let chosen=candidates[0],best=score(chosen);
        for(const c of candidates){const value=score(c);if(value<best){chosen=c;best=value;}}
        placed.push(chosen);
        return {...chosen,anchorX:marker.x,anchorY:marker.y};
    });
}
/** Pick an unused map point. Callers save this point; the image model does not choose it. */
export function freeMapPoint(used:{x:number;y:number}[]) {
    const spots=[{x:22,y:32},{x:50,y:46},{x:78,y:70},{x:32,y:74},{x:66,y:28},{x:18,y:58},{x:84,y:42}];
    return spots.find(spot=>used.every(point=>Math.hypot(point.x-spot.x,point.y-spot.y)>=14))||{x:Math.min(88,16+used.length*11),y:Math.min(80,24+(used.length%4)*14)};
}
