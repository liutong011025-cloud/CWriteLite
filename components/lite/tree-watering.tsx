'use client';

/** The wrapper follows the tree's farm coordinates, including responsive cover scaling. */
export default function TreeWatering() {
    return <span className="tree-watering" aria-hidden="true">
        <span className="watering-can"><svg viewBox="0 0 140 110" fill="none">
            <path d="M88 33C122 8 140 67 100 70" stroke="#326e72" strokeWidth="10"/>
            <path d="M49 36H99L106 89Q76 104 43 89Z" fill="#80bfbb" stroke="#326e72" strokeWidth="4"/>
            <path d="M49 46L22 67L12 56L3 67L24 82L54 65" fill="#80bfbb" stroke="#326e72" strokeWidth="4" strokeLinejoin="round"/>
            <ellipse cx="74" cy="36" rx="25" ry="7" fill="#b9e1d7" stroke="#326e72" strokeWidth="4"/>
            <path d="M65 43V87" stroke="#b9e1d7" strokeWidth="5" strokeLinecap="round"/>
            <path d="M4 64L20 78" stroke="#e9f5df" strokeWidth="5"/>
            <path d="M69 65L74 59L79 65L74 74Z" fill="#ffdf79"/>
        </svg></span>
        <span className="watering-drops">{Array.from({length:6},(_,i)=><i key={i} style={{left:`${i*9}%`,animationDelay:`${.8+i*.12}s`}}/>)}</span>
        <span className="watering-splash">✦</span>
    </span>;
}
