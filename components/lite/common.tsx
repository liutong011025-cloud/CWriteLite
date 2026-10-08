'use client';
import { useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Star } from 'lucide-react';
import type { Character, Story } from '@/lib/types';
import { observeProcessRequest } from '@/lib/process-bus';
import { retrySafeRequest } from '@/lib/retry-safe-request';
export async function api(path: string, body?: unknown) {
    const finish = observeProcessRequest(path, body);
    try { const {response, text} = await retrySafeRequest(path, body, async () => { const response = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}); return {response, text: await response.text()}; }); let data: any; try { data = JSON.parse(text); } catch { const requestId = response.headers.get('x-vercel-id'); console.error('API response incomplete', { path, status: response.status, requestId }); throw new Error(`The server returned an incomplete response (HTTP ${response.status}). Please try again.${requestId ? ` Reference: ${requestId}` : ''}`); } if (!response.ok) throw new Error(data?.error || `Request failed (HTTP ${response.status}). Please try again.`); if (!data || typeof data !== 'object') throw new Error('The server returned an invalid response. Please try again.'); finish(data); return data; }
    catch (error) { finish(undefined, (error as Error).message); throw error; }
}
export function Logo({ white = false }: { white?: boolean }) { return <div className="lite-logo"><img src="/cwrite-lite-logo.webp" alt="CWrite lite"/></div>; }
export function IdeaPackButton({ onClick }: { onClick: () => void }) {
    return <button className="surprise-pack deck-idea-pack" onClick={onClick} aria-label="Open Character Idea Pack"><div className="pack-seal" aria-hidden="true"/><svg className="pack-tear-wave" viewBox="0 0 100 7" aria-hidden="true"><path d="M0 4 Q5 0 10 4 T20 4 T30 4 T40 4 T50 4 T60 4 T70 4 T80 4 T90 4 T100 4" fill="none" stroke="currentColor" strokeWidth="1"/></svg><img className="pack-small-logo" src="/logosmall.webp" alt="CWrite"/><div className="pack-stars" aria-hidden="true">✦ ? ✦</div><b>Character<br/>Idea Pack</b><span>Open Pack ✦</span></button>;
}
export function WoodTitle({ children }: {
    children: React.ReactNode;
}) { return <h1 className="wood-title"><i aria-hidden="true"/>{children}<i aria-hidden="true"/></h1>; }
export function PortraitCard({ character, selected, onClick, small = false }: {
    character: Character;
    selected?: boolean;
    onClick?: () => void;
    small?: boolean;
}) { return <button type="button" className={`portrait-card ${selected ? 'selected' : ''} ${small ? 'small' : ''}`} onClick={onClick} aria-label={character.name} aria-pressed={selected}><span className="card-star"><Star size={22} fill="currentColor"/></span><div className="portrait-window">{character.imageUrl ? <img src={character.imageUrl} alt={character.name}/> : <span className="portrait-placeholder">{character.name.slice(0, 1)}</span>}</div><span className="card-name">{character.name}</span>{selected && <span className="selected-tick">✓</span>}</button>; }
export function Bear({ message, pose = 'cagent-welcome.webp', responsePose, variant = 'guide', hints = [], busy = false, onAction, actionLabel, showHelp = true, responding: controlledResponse = false }: {
    message?: string;
    pose?: string;
    responsePose?: string;
    variant?: 'guide' | 'planning' | 'drawing' | 'review';
    hints?: string[];
    busy?: boolean;
    onAction?: () => void;
    actionLabel?: string;
    showHelp?: boolean;
    responding?: boolean;
}) {
    const [response,setResponse]=useState({message,turn:0});
    const [responding,setResponding]=useState(false);
    const responseTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
    useEffect(()=>()=>{if(responseTimer.current)clearTimeout(responseTimer.current);},[]);
    const turn=response.message===message?response.turn:0;
    const lines=[message,...hints].filter(Boolean);
    const activePose=responsePose&&(responding||controlledResponse)?responsePose:pose;
    const src=`/${activePose.includes('.')?activePose:activePose+'.webp'}`;
    return <div className={`bear-guide cagent-scene cagent-${variant} ${busy?'is-thinking':''}`}>
        <div key={turn} className={`cagent-little-tools ${turn?'cagent-tools-reply':''}`} aria-hidden="true"><span className="cagent-star">✦</span><span className="cagent-paper">{variant==='drawing'?'✎':'?'}</span><span className="cagent-pencil">✎</span></div>
        <div className="cagent-figure"><div className="cagent-avatar" data-pose={responding||controlledResponse?'responding':'resting'}>
            {responsePose&&<img className="cagent-pose-preload" src={`/${responsePose.includes('.')?responsePose:responsePose+'.webp'}`} alt="" aria-hidden="true"/>}
            <img key={`${turn}-${activePose}`} className={`cagent-main-pose ${turn?'cagent-reply-motion':''}`} src={src} alt="Cagent, your writing buddy"/>
        </div>{showHelp&&<button type="button" className="cagent-help-button" onClick={e=>{e.stopPropagation();setResponse({message,turn:turn+1});setResponding(true);if(responseTimer.current)clearTimeout(responseTimer.current);responseTimer.current=setTimeout(()=>setResponding(false),2200);onAction?.();}} disabled={busy}><Sparkles size={16}/>{busy?'Thinking…':actionLabel||'Ask Cagent'}</button>}</div>
        {lines.length>0&&<div key={`${turn}-${message}`} className="bear-bubble cagent-reply" role="status">{busy?'Let’s think about your ideas…':lines[turn%lines.length]}</div>}
    </div>;
}
export function Modal({ title, children, onClose, wide = false }: {
    title: string;
    children: React.ReactNode;
    onClose: () => void;
    wide?: boolean;
}) { return <div className="modal-backdrop" onPointerDown={e => { if (e.target === e.currentTarget)
    onClose(); }}><section className={`cream-panel modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}><header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X size={20}/></button></header>{children}</section></div>; }
export function CagentPanel({ story, context, onEvent }: {
    story: Story | null;
    context?: unknown;
    onEvent?: (type: string, payload: unknown) => void;
}) {
    const [messages, setMessages] = useState<{
        role: 'user' | 'assistant';
        content: string;
    }[]>([]);
    const [input, setInput] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    async function send() { if (!input.trim() || busy)
        return; const message = input; setInput(''); setError(''); setMessages(m => [...m, { role: 'user', content: message }]); setBusy(true); try {
        const r = await api('/api/ai', { kind: 'chat', storyId: story?.id, canvas: story?.canvas, sections: story?.sections, selectedNode: context, history: messages, message });
        setMessages(m => [...m, { role: 'assistant', content: r.message }]);
        onEvent?.('chat_received', { requestId: r.requestId });
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    return <section className="cagent-panel cream-panel"><header><img src="/Cagentsit.webp" alt=""/><h3>Cagent</h3><span className="status-dot"/></header><div className="chat-scroll">{!messages.length && <p>Every good story starts with an idea. What could your character do next?</p>}{messages.map((m, i) => <p key={i} className={`chat-message ${m.role}`}>{m.content}</p>)}{busy && <p className="thinking">Cagent is thinking…</p>}{error && <p role="alert" className="error-text">{error}</p>}</div><form onSubmit={e => { e.preventDefault(); void send(); }} className="chat-input"><input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Cagent anything…" aria-label="Message to Cagent" maxLength={1500}/><button className="purple-button round" disabled={busy || !input.trim()} aria-label="Send message"><Send size={17}/></button></form></section>;
}
export function LoadingButton({ busy, children, ...props }: {
    busy?: boolean;
    children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button {...props} className={`purple-button ${props.className || ''}`} disabled={busy || props.disabled}><Sparkles size={17}/>{busy ? 'Thinking…' : children}</button>; }
