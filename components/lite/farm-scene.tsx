'use client';
const birds=[{name:'hen',x:110,y:660,w:98,h:106},{name:'chick',x:238,y:650,w:62,h:59},{name:'white-hen',x:420,y:710,w:108,h:103},{name:'duck',x:630,y:740,w:88,h:65}];
const place=(p:{x:number;y:number;w:number;h:number})=>({left:`${p.x/19.2}%`,top:`${p.y/8.32}%`,width:`${p.w/19.2}%`,height:`${p.h/8.32}%`});
// No static birds, bear or canopies remain underneath the moving layers.
export default function FarmScene({leftInset=0}:{leftInset?:number}){
// Keep the foreground flock inside the visible picture when object-cover crops its sides.
const birdShift=Math.max(0,leftInset+18-110);
return <div className="farm-motion" aria-hidden="true">
<svg className="farm-clouds" viewBox="0 0 1920 832" preserveAspectRatio="none"><defs><linearGradient id="farm-cloud-light" x2="0" y2="1"><stop stopColor="#fff8e2"/><stop offset="1" stopColor="#f1efdc"/></linearGradient></defs>{[{x:18,y:20,w:255,h:70,d:55},{x:410,y:71,w:225,h:68,d:70},{x:741,y:79,w:156,h:49,d:64},{x:1010,y:55,w:146,h:44,d:78},{x:1310,y:43,w:235,h:71,d:60},{x:1662,y:35,w:150,h:44,d:86}].map((cloud,index)=><svg key={index} x={cloud.x} y={cloud.y} width={cloud.w} height={cloud.h} viewBox="0 0 260 85" className={`farm-cloud farm-cloud-${index}`} style={{animationDuration:`${cloud.d}s`}}><path d="M4 72Q-1 58 23 56Q20 37 48 36Q57 4 92 9Q122 5 135 33Q162 14 183 41Q217 26 232 57Q257 53 260 71Q180 84 80 80Q27 82 4 72Z" fill="url(#farm-cloud-light)" opacity=".94"/><path d="M13 72Q75 80 127 73Q181 81 247 70" stroke="#dfe7dd" strokeWidth="4" fill="none" opacity=".45"/></svg>)}</svg>
{/* Keep the painted soil and watering tools in the original scenery. */}
<svg width="0" height="0" className="farm-motion-definitions"><defs>
{/* The fixed roof silhouette occludes moving leaves; it never trims their sky-facing edges. */}
<mask id="farm-canopy-buildings" maskUnits="userSpaceOnUse" x="0" y="0" width="1920" height="832"><rect width="1920" height="832" fill="white"/><path d="M109 383 L181 291 L303 294 L377 374 L356 411 L356 560 L280 600 L160 640 L114 609 L114 402Z" fill="black"/><path d="M485 279 L636 117 L851 292 L833 313 L833 832 L486 832Z" fill="black"/></mask>
</defs></svg>
<svg className="farm-canopy" viewBox="0 0 1920 832" preserveAspectRatio="none"><g mask="url(#farm-canopy-buildings)"><image className="farm-canopy-leaves" href="/farm-canopies.webp" x="-75" y="135" width="550" height="215" preserveAspectRatio="none"/></g></svg>
{birds.map(b=><img key={b.name} className={`farm-motion-patch farm-motion-${b.name}`} src={`/farm-${b.name}.webp`} alt="" style={place({...b,x:b.x+birdShift})}/>)}
<svg className="farm-motion-swing" viewBox="889 235 127 185">
<g fill="none" stroke="#b29661" strokeWidth="3.8" strokeLinecap="round"><path d="M910 240 L908 386"/><path d="M996 240 L1000 386"/></g>
<g fill="none" stroke="#776346" strokeWidth="1.2" strokeDasharray="2 3"><path d="M910 240 L908 386"/><path d="M996 240 L1000 386"/></g>
<path d="M899 382 Q952 391 1008 382 L1006 394 Q952 405 901 392Z" fill="#c79564" stroke="#785234" strokeWidth="2.8"/><path d="M904 388 Q953 396 1003 387" fill="none" stroke="#e1b180" strokeWidth="2"/>
<image href="/cagent-farm-swing.webp" x="899" y="264" width="109" height="146"/>
</svg>
<svg className="farm-direction-post" viewBox="0 0 1920 832" preserveAspectRatio="none"><ellipse cx="1412" cy="428" rx="27" ry="5" fill="#587647" opacity=".3"/><path d="M1400 176 Q1412 171 1424 176 L1420 426 L1402 425Z" fill="#ba8d5b" stroke="#775331" strokeWidth="3"/><path d="M1408 182 L1408 417 M1418 182 L1416 417" fill="none" stroke="#e1b982" strokeWidth="1.8"/></svg>
<svg className="farm-rice" viewBox="0 0 1920 832" preserveAspectRatio="none">{[[211,771],[221,776],[218,780],[241,706],[233,711],[237,718],[540,814],[548,810]].map(([x,y],i)=><ellipse key={i} cx={x+birdShift} cy={y} rx="2.5" ry="1.2" transform={`rotate(${i*27} ${x+birdShift} ${y})`}/>)}</svg>
</div>}
