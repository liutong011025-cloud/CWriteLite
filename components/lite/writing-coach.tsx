'use client';
import {Bear} from './common';

export default function WritingCoach({message,busy}:{message:string;busy:boolean}) {
    return <div className="writing-coach-shelf">
        <div className="bear-bubble writing-coach-message" role="status" aria-live="polite">{message}{busy&&<span aria-label="Cagent is reading your latest ideas"> ···</span>}</div>
        <div className="writing-canvas-bear"><Bear pose="cagent-board.webp" busy={busy} showHelp={false}/></div>
    </div>;
}
