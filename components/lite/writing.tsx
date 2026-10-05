'use client';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, Shuffle, Copy, ChevronRight, ChevronLeft, Maximize2, Check, Bold, Italic, List, Undo2, Download, Printer, Map, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import type { Story } from '@/lib/types';
import { STAGES, QUESTIONS } from '@/lib/types';
import { api, Bear, LoadingButton, Modal, WoodTitle } from './common';
import { planQuestion, sectionSignature } from '@/lib/story-plan';
import { CanvasView } from './story-canvas';
import WritingCoach from './writing-coach';
export function Mountain({ story, onContinue }: {
    story: Story;
    onContinue: () => void;
}) { return <div className="mountain-page"><WoodTitle>Your story mountain</WoodTitle><p className="page-intro">A little climb. A big adventure. Plan what happens along the way.</p><div className="mountain-card cream-panel"><svg viewBox="0 0 1000 325" className="mountain-illustration" role="img" aria-label="Freytag story mountain with five stages"><defs><linearGradient id="mountain-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a1b279" stopOpacity=".3"/><stop offset="1" stopColor="#a1b279" stopOpacity=".03"/></linearGradient></defs><path d="M80 278L285 175L500 42L715 175L920 278Z" fill="url(#mountain-fill)"/><path d="M80 278L285 175L500 42L715 175L920 278" stroke="#778d4f" strokeWidth="6" strokeLinejoin="round" fill="none"/>{[[80, 278], [285, 175], [500, 42], [715, 175], [920, 278]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="18" fill={story.sections[i] ? '#8fa755' : '#fffaf0'} stroke="#75864f" strokeWidth="3"/><text x={x} y={y + 6} textAnchor="middle" fontSize="17" fill={story.sections[i] ? 'white' : '#75864f'}>{i + 1}</text></g>)}</svg><div className="mountain-stages">{STAGES.map((name, i) => <div key={name}><b>{i + 1} · {name}</b><p>{QUESTIONS[i]}</p></div>)}</div></div><div className="mountain-bottom"><Bear pose="Cagentsleep.webp" responsePose="cagent-thinking.webp" variant="review" hints={["How does the ending follow the choice?","Which detail makes your story clearer?"]} message="Your cards have ideas. Now turn them into your own story!"/><button className="purple-button" onClick={onContinue}>Let’s start writing<ChevronRight size={18}/></button></div></div>; }
export function WritingPage({ story, onChange, onCanvas, onFinish, onEvent, onBeforeCheck }: {
    story: Story;
    onChange: (s: Story) => void;
    onCanvas: () => void;
    onFinish: () => void;
    onBeforeCheck: () => Promise<void>;
    onEvent: (type: string, payload: unknown) => void;
}) {
    const [tips, setTips] = useState<{
        keywords: string[];
        frames: string[];
        focus: string;
        question: string;
        requestId: string;
    } | null>(null);
    const [tab, setTab] = useState<'words' | 'frames'>('words');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [fullCanvas, setFullCanvas] = useState(false);
    const [canvasCollapsed, setCanvasCollapsed] = useState(false);
    const [history, setHistory] = useState<string[]>([]);
    const [coach,setCoach]=useState(''),[coachBusy,setCoachBusy]=useState(false),[checking,setChecking]=useState(false);
    const [checkpoint,setCheckpoint]=useState<{pass:boolean;message:string;question?:string}|null>(null);
    const [approvals,setApprovals]=useState<string[]>(Array(5).fill(''));
    const editor = useRef<HTMLTextAreaElement>(null);
    const i = story.activeSection, text = story.sections[i] || '';
    const signature=sectionSignature(story,i);
    useEffect(()=>{
        let active=true; setApprovals(Array(5).fill(''));
        void api('/api/section-gate?storyId='+encodeURIComponent(story.id)).then(r=>{if(active)setApprovals(r.signatures);}).catch(()=>{});
        return ()=>{active=false;};
    },[story.id]);
    useEffect(()=>{
        let active=true; setCoach(''); setCoachBusy(false);
        const timer=setTimeout(()=>{
            setCoachBusy(true);
            void api('/api/ai',{kind:'coach',storyId:story.id,sections:story.sections,section:i,canvas:story.canvas,cursorContext:text.slice(-700)}).then(r=>{if(active)setCoach(r.message);}).catch(()=>{}).finally(()=>{if(active)setCoachBusy(false);});
        },2400);
        return ()=>{active=false;clearTimeout(timer);};
    },[signature,story.id,i]);
    async function checkPart(target:number){
        setChecking(true);setError('');setCheckpoint(null);
        try{
            await onBeforeCheck();
            const r=await api('/api/section-gate',{storyId:story.id,section:i});
            setCheckpoint(r);onEvent('section_check_used',{section:i,pass:r.pass});
            if(r.pass){setApprovals(a=>a.map((x,j)=>j===i?r.signature:x));if(target===5)onFinish();else section(target);}
        }catch(e){setError((e as Error).message);}finally{setChecking(false);}
    }
    function isUnlocked(index:number){return index===0||Array.from({length:index},(_,j)=>approvals[j]===sectionSignature(story,j)).every(Boolean);}
    function write(value: string) { setCheckpoint(null); onChange({ ...story, sections: story.sections.map((t, j) => j === i ? value : t) }); }
    function section(index: number) { setTips(null); setCheckpoint(null); setHistory([]); onChange({ ...story, activeSection: index }); onEvent('section_changed', { from: i, to: index }); }
    async function suggest() { setCanvasCollapsed(true); setBusy(true); setError(''); if (tips)
        onEvent('suggestions_shuffled', { requestId: tips.requestId }); try {
        const p = editor.current?.selectionStart ?? text.length;
        const r = await api('/api/ai', { kind: 'tips', storyId: story.id, sections: story.sections, section: i, cursorContext: text.slice(Math.max(0, p - 500), Math.min(text.length, p + 150)), shuffle: Boolean(tips) });
        setTips(r);
        onEvent('suggestions_requested', { requestId: r.requestId, section: i, focus: r.focus });
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function insert(value: string) { const area = editor.current!; const before = text; const start = area.selectionStart, end = area.selectionEnd; const word = value; const replacement = (start && text[start - 1] !== ' ' ? ' ' : '') + word; setHistory(h => [...h, before]); write(text.slice(0, start) + replacement + text.slice(end)); setTimeout(() => { area.focus(); area.setSelectionRange(start + replacement.length, start + replacement.length); }, 0); onEvent('suggestion_accepted', { requestId: tips?.requestId, value, section: i, insertionAt: start }); }
    function format(prefix: string, suffix = prefix) { const area = editor.current!, start = area.selectionStart, end = area.selectionEnd; setHistory(h => [...h, text]); write(text.slice(0, start) + prefix + text.slice(start, end) + suffix + text.slice(end)); setTimeout(() => { area.focus(); area.setSelectionRange(start + prefix.length, end + prefix.length); }, 0); }
    return <div className="writing-page"><div className="writing-top"><div><h1>{story.title === 'Untitled adventure' ? 'Let your story unfold' : story.title}</h1></div></div><div className="writing-progress-board"><div className="section-tabs" role="group" aria-label="Writing stages">{STAGES.map((s, j) => <button key={s} className={j === i ? 'active' : ''} disabled={checking || (j > i && !isUnlocked(j))} onClick={() => section(j)}><span>{approvals[j] === sectionSignature(story,j) && j !== i ? <Check size={13}/> : j + 1}</span>{s}</button>)}</div></div><div className="writing-layout"><section className="writing-editor cream-panel"><WoodTitle>{i + 1} — {STAGES[i]}</WoodTitle><p>{QUESTIONS[i]}</p><div className="editor-box"><div className="editor-toolbar"><button onClick={() => format('**')} aria-label="Bold"><Bold size={16}/></button><button onClick={() => format('_')} aria-label="Italic"><Italic size={16}/></button><button onClick={() => format('\n- ', '')} aria-label="Add list"><List size={17}/></button><button disabled={!history.length} onClick={() => { write(history[history.length - 1]); setHistory(h => h.slice(0, -1)); }} aria-label="Undo insertion"><Undo2 size={16}/></button><span>Write in your own words</span></div><textarea ref={editor} aria-label={`Write ${STAGES[i]}`} value={text} disabled={checking} onChange={e => write(e.target.value)} placeholder="Start writing here…" spellCheck maxLength={30000}/><div className="editor-word-count">{text.trim() ? text.trim().split(/\s+/).length : 0} words</div></div>{checkpoint && !checkpoint.pass && <div className="section-check-note" role="status"><b>A little more before the next part</b><p>{checkpoint.message}</p><small>{checkpoint.question}</small></div>}{error && <p role="alert" className="error-text">{error}</p>}<div className="editor-bottom">{i < 4 ? <button className="purple-button" disabled={!text.trim() || checking} onClick={() => void checkPart(i + 1)}>{checking ? 'Cagent is reading…' : 'Next section'}<ChevronRight size={17}/></button> : <button className="purple-button" disabled={!story.sections.every(s => s.trim()) || checking} onClick={() => void checkPart(5)}>{checking ? 'Cagent is reading…' : 'Review my story'}<ChevronRight size={17}/></button>}</div><button className="text-button" onClick={onCanvas}>← Back to Story Canvas</button></section><aside className="writing-sidebar"><WritingCoach message={checkpoint && !checkpoint.pass ? checkpoint.question || checkpoint.message : coach || planQuestion(story,i)} busy={coachBusy}/><section className="cream-panel canvas-preview"><header><h3>My Story Canvas</h3><div><button className="icon-button" aria-label={canvasCollapsed ? "Show story canvas" : "Hide story canvas"} onClick={() => setCanvasCollapsed(v => !v)}><ChevronRight size={16} style={{ transform: canvasCollapsed ? "rotate(90deg)" : "rotate(-90deg)" }}/></button><button className="icon-button" aria-label="Expand canvas" onClick={() => setFullCanvas(true)}><Maximize2 size={16}/></button></div></header>{!canvasCollapsed && <CanvasView value={story.canvas} small/>}{!canvasCollapsed && <button className="tiny-button" onClick={() => setFullCanvas(true)}><Maximize2 size={14}/>View Full Canvas<ArrowRight size={13}/></button>}</section><section className="cream-panel ai-suggestions"><header><h3><Sparkles size={17}/>AI Suggestions</h3><button className="tiny-button" disabled={busy} onClick={suggest}>{tips ? <Shuffle size={14}/> : <PlusIcon />}{busy ? 'Thinking…' : tips ? 'Try again' : 'Get Suggestions'}</button></header>{tips ? <><p className="suggestion-focus">{tips.focus}</p><div className="suggestion-tabs"><button className={tab === 'words' ? 'active' : ''} onClick={() => setTab('words')}>Vocabulary</button><button className={tab === 'frames' ? 'active' : ''} onClick={() => setTab('frames')}>Sentence Structures</button></div>{tab === 'words' ? <div className="word-chips">{tips.keywords.map(word => <button key={word} onClick={() => insert(word)} title="Add to your writing">{word}</button>)}</div> : <div className="sentence-frames">{tips.frames.map(frame => <button key={frame} onClick={() => insert(frame)}>{frame}<Copy size={14}/></button>)}</div>}<p className="field-hint">Tap to use a word or a frame. Fill the blanks with your ideas.</p><button className="text-button" onClick={() => { onEvent('suggestions_dismissed', { requestId: tips.requestId }); setTips(null); }}>I’ll keep writing on my own</button></> : <div className="suggestions-empty"><Sparkles size={23}/><p>Need a word or a little starting point?</p></div>}</section></aside></div>{fullCanvas && <Modal title="My Story Canvas" wide onClose={() => setFullCanvas(false)}><CanvasView value={story.canvas}/><button className="outline-button" onClick={onCanvas}>Edit my canvas</button></Modal>}</div>;
}
function PlusIcon() { return <span style={{ fontSize: 18 }}>+</span>; }
export function FinishPage({ story, onChange, onBack, onPublish, publishing }: {
    story: Story;
    onChange: (s: Story) => void;
    onBack: () => void;
    onPublish: () => void;
    publishing: boolean;
}) {
    function download() { const blob = new Blob([story.title + '\n\n' + story.sections.join('\n\n')], { type: 'text/plain;charset=utf-8' }), url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = story.title.replace(/[^a-z0-9]/gi, '_') + '.txt'; a.click(); URL.revokeObjectURL(url); }
    return <div className="finish-page"><WoodTitle>Your story, ready to share</WoodTitle><div className="finish-layout"><article className="cream-panel story-paper"><label className="title-label">Story title<input aria-label="Story title" value={story.title} onChange={e => onChange({ ...story, title: e.target.value })} maxLength={120}/></label><div className="story-byline">An adventure by you · {story.sections.join(' ').trim().split(/\s+/).length} words</div>{story.sections.map((s, i) => <section key={i}><h3>{STAGES[i]}</h3><ReactMarkdown allowedElements={['p', 'strong', 'em', 'ul', 'ol', 'li', 'br']} unwrapDisallowed>{s}</ReactMarkdown></section>)}</article><aside><Bear pose="cagent-thinking.webp" responsePose="cagent-celebrate-v2.webp" variant="review" hints={["How does the ending follow the choice?","Which detail makes your story clearer?"]} message="Read it once more. Do your character’s choices make sense?"/><section className="cream-panel final-check"><h3>One last look</h3><p>Does my character have a goal?</p><p>Do my events connect to one another?</p><p>Does my ending follow my character’s choice?</p><p>Which part are you proudest of?</p><button className="outline-button" onClick={download}><Download size={16}/>Download story</button><button className="outline-button" onClick={() => window.print()}><Printer size={16}/>Print story</button><button className="text-button" onClick={onBack}>← Keep editing</button><button className="purple-button" disabled={publishing || !story.title.trim() || !story.sections.every(s => s.trim())} onClick={onPublish}><Map size={17}/>{publishing ? 'Saving your adventure…' : 'Save to My Writing Map'}</button></section></aside></div></div>;
}
