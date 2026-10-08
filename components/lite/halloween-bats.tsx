import type {CSSProperties} from 'react';

const bats=[
 {x:197,y:113,w:72,h:52,flight:6.8,flap:.94,delay:-1.2},
 {x:775,y:12,w:105,h:76,flight:8.2,flap:1.08,delay:-3.4},
 {x:1291,y:39,w:97,h:70,flight:7.7,flap:.88,delay:-5.1},
 {x:1423,y:25,w:66,h:48,flight:7.1,flap:1.16,delay:-2.3},
];
const wing='M55 39C43 24 23 24 5 18L11 31Q18 27 23 35L18 45Q31 37 38 49L41 40Q47 39 55 48Z';
type BatStyle=CSSProperties & {'--bat-flight':string;'--bat-flap':string;'--bat-delay':string};

// Decoration only: CSS transforms animate four bats without timers or requests.
export default function HalloweenBats(){
 return <div className="farm-halloween-bats" aria-hidden="true">
  {bats.map((bat,index)=>{
   const style:BatStyle={left:`${bat.x/1905*100}%`,top:`${bat.y/826*100}%`,width:`${bat.w/1905*100}%`,height:`${bat.h/826*100}%`,'--bat-flight':`${bat.flight}s`,'--bat-flap':`${bat.flap}s`,'--bat-delay':`${bat.delay}s`};
   return <div className="farm-halloween-bat" key={index} style={style}>
    <svg viewBox="0 0 120 72" className="farm-halloween-bat-art" focusable="false">
     <g className="farm-halloween-bat-wing farm-halloween-bat-wing-left"><path d={wing} fill="#52294f" stroke="#2e1937" strokeWidth="1.8" strokeLinejoin="round"/><path d="M53 41Q32 30 13 24M53 43L23 35M53 45L38 49" fill="none" stroke="#784469" strokeWidth="1.1"/></g>
     <g className="farm-halloween-bat-wing farm-halloween-bat-wing-right"><g transform="translate(120 0) scale(-1 1)"><path d={wing} fill="#52294f" stroke="#2e1937" strokeWidth="1.8" strokeLinejoin="round"/><path d="M53 41Q32 30 13 24M53 43L23 35M53 45L38 49" fill="none" stroke="#784469" strokeWidth="1.1"/></g></g>
     <path d="M52 30L51 20L59 26Q60 24 62 26L69 20L68 30C76 38 74 55 65 60L60 63L55 60C46 55 44 38 52 30Z" fill="#442347" stroke="#2e1937" strokeWidth="1.8" strokeLinejoin="round"/>
     <ellipse cx="55.5" cy="36.5" rx="2.5" ry="3" fill="#f9d172"/><ellipse cx="64.5" cy="36.5" rx="2.5" ry="3" fill="#f9d172"/><circle cx="56" cy="37" r="1.2" fill="#2e1937"/><circle cx="64" cy="37" r="1.2" fill="#2e1937"/>
     <path d="M56 44Q60 47 64 44" fill="none" stroke="#ab7390" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
   </div>;
  })}
 </div>;
}
