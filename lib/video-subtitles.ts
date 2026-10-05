import type {VideoBeat} from './video-pipeline';
const clean=(s:string)=>s.replace(/[\r\n]+/g,' ').replace(/-->/g,'→');
const time=(seconds:number)=>{const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};
export function videoSubtitles(beats:VideoBeat[],names:Record<string,string>) {
    let cursor=0,index=0;
    const entries:string[]=[];
    for(const beat of beats){
        if(beat.kind==='dialogue'||beat.kind==='thought'){
            const words=clean(beat.text).split(/\s+/).filter(Boolean);
            const pages=Math.max(1,Math.ceil(words.length/14));
            for(let page=0;page<pages;page++){
                const start=cursor+beat.duration*page/pages,end=cursor+beat.duration*(page+1)/pages;
                const prefix=`${clean(names[beat.characterId||'']||'Character')} ${beat.kind==='thought'?'thinks':'says'}: `;
                entries.push(`${++index}\n${time(start)} --> ${time(end)}\n${prefix}${words.slice(page*14,(page+1)*14).join(' ')}\n`);
            }
        }
        cursor+=beat.duration;
    }
    return entries.join('\n');
}
