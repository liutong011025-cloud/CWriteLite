'use client';
import {useId} from 'react';

/** A readable paper story tag held by one illustrated pin. */
export default function StoryPin({compact=false}:{compact?:boolean}) {
  const id=useId().replace(/:/g,'');
  return <span className={`story-pin-art ${compact?'compact':''}`} aria-hidden="true">
    <span className="story-pin-paper"><svg viewBox="0 0 28 24" className="story-pin-book" fill="none"><path d="M14 5 Q8 1 3 4 V19 Q8 16 14 20 Q20 16 25 19 V4 Q20 1 14 5Z" fill="#f7e6b7" stroke="#947144" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 5V20 M6 8L10 9 M6 12L10 13 M18 9L22 8 M18 13L22 12" stroke="#947144" strokeWidth="1.4" strokeLinecap="round"/></svg>{!compact&&<b>Story</b>}</span>
    <svg className="story-pin-head" viewBox="0 0 42 48"><defs><linearGradient id={`${id}-red`} x2=".7" y2="1"><stop stopColor="#ec8c71"/><stop offset=".5" stopColor="#cf5a48"/><stop offset="1" stopColor="#a84336"/></linearGradient></defs><path d="M22 31 L18 45 L27 32" fill="#cab277" stroke="#8c7042" strokeWidth="1.5" strokeLinejoin="round"/><path d="M10 25 Q11 20 15 18 L15 11 L29 11 L28 19 Q33 21 34 26 Q24 33 10 25Z" fill={`url(#${id}-red)`} stroke="#904234" strokeWidth="1.8"/><ellipse cx="22" cy="10" rx="11" ry="7" fill={`url(#${id}-red)`} stroke="#904234" strokeWidth="1.8"/><path d="M16 7 Q21 4 26 7" stroke="#ffd4a6" strokeWidth="2" strokeLinecap="round" fill="none"/></svg>
  </span>;
}
