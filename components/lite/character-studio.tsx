'use client';
import { useEffect, useRef, useState } from 'react';
import { Pencil, Eraser, Undo2, Trash2, Shuffle, Plus } from 'lucide-react';
import type { Character } from '@/lib/types';
import { api, LoadingButton, PortraitCard, WoodTitle, Bear } from './common';
const empty = { id: '', name: '', age: '', appearance: '', traits: '', background: '', strength: '', challenge: '', imageUrl: '', sketch: '', species: '' };
const drawingQuestions: Record<string,string> = {
    Appearance:'What small detail will make your character easy to recognise?',
    Personality:'What would your character do to show this personality?',
    'Personality / Traits':'What would your character do to show this personality?',
    Background:'Where did your character live before this adventure?',
    'Background / Role':'Where did your character live before this adventure?',
    Strength:'What can your character do to help someone?',
    Challenge:'What is difficult for your character?',
    Name:'What name would suit your character?',
    Age:'How old is your character?',
};
export default function CharacterStudio({ initial, onSaved, onCancel }: {
    initial?: Character;
    onSaved: (c: Character) => void | Promise<void>;
    onCancel: () => void;
}) {
    const [character, setCharacter] = useState<Character>(initial || empty);
    const canvas = useRef<HTMLCanvasElement>(null);
    const strokes = useRef<string[]>([]);
    const drawing = useRef(false);
    const [tool, setTool] = useState<'pencil' | 'eraser'>('pencil');
    const [color, setColor] = useState('#293245');
    const [busy, setBusy] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const generationPending = useRef(false);
    const savePending = useRef(false);
    const creationKey = useRef('');
    const [focus, setFocus] = useState('Appearance');
    const focusRef = useRef('Appearance');
    const [mockPreview, setMockPreview] = useState(false);
    const selectedSpecies = character.species || '';
    const [tips, setTips] = useState<string[]>(['curly hair', 'sparkling eyes', 'warm smile', 'freckles', 'bright outfit', 'tiny wings']);
    const [tipBusy, setTipBusy] = useState(false);

    const [drawingReady, setDrawingReady] = useState(Boolean(initial?.sketch));
    const update = (key: keyof Character, value: string) => setCharacter(c => ({ ...c, [key]: value }));
    useEffect(() => { const c = canvas.current; if (!c)
        return; const ctx = c.getContext('2d')!; ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, c.width, c.height); if (initial?.sketch) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height);
        img.src = initial.sketch;
    } }, [initial]);
    function point(e: React.PointerEvent<HTMLCanvasElement>) { const c = canvas.current!, r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * c.width / r.width, y: (e.clientY - r.top) * c.height / r.height }; }
    function start(e: React.PointerEvent<HTMLCanvasElement>) { const c = canvas.current!; strokes.current.push(c.toDataURL()); if (strokes.current.length > 30)
        strokes.current.shift(); drawing.current = true; c.setPointerCapture(e.pointerId); const p = point(e), ctx = c.getContext('2d')!; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = tool === 'eraser' ? 24 : 4; ctx.strokeStyle = tool === 'eraser' ? '#fffdf5' : color; }
    function move(e: React.PointerEvent<HTMLCanvasElement>) { if (!drawing.current)
        return; const p = point(e); const ctx = canvas.current!.getContext('2d')!; ctx.lineTo(p.x, p.y); ctx.stroke(); setDrawingReady(true); }
    function undo() { const url = strokes.current.pop(); if (!url)
        return; const img = new Image(); img.onload = () => { canvas.current!.getContext('2d')!.drawImage(img, 0, 0); }; img.src = url; }
    function clear() { const c = canvas.current!; strokes.current.push(c.toDataURL()); const ctx = c.getContext('2d')!; ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, c.width, c.height); setDrawingReady(false); }
    async function generate() { if (generationPending.current || character.imageUrl || savePending.current) return; if (!selectedSpecies.trim()) { setError('Choose your character’s species first.'); return; } if (!character.name.trim()) {
        setError('Give your character a name first.');
        return;
    } if (!drawingReady && !character.appearance.trim()) {
        setError('Draw your character or describe how they look.');
        return;
    } generationPending.current = true; setBusy(true); setError(''); try {
        const r = await api('/api/ai', { kind: 'image', elementType: 'character', species: selectedSpecies, sketch: drawingReady ? canvas.current?.toDataURL('image/png') : undefined, description: `Species: ${selectedSpecies}; name: ${character.name}; appearance: ${character.appearance}; traits: ${character.traits}; background: ${character.background}` });
        setMockPreview(Boolean(r.mock));
        update('imageUrl', r.imageUrl);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        generationPending.current = false;
        setBusy(false);
    } }
    async function shuffle() { setTipBusy(true); setError(''); try {
        const requestedFocus = focus;
        const r = await api('/api/ai', { kind: 'characterTips', focus: requestedFocus, character, shuffle: true });
        if (focusRef.current === requestedFocus) setTips(r.keywords);
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setTipBusy(false);
    } }
    function focusField(next: string) { if (focusRef.current === next) return; focusRef.current = next; setFocus(next); setTips(TIP_WORDS[next] || TIP_WORDS.Appearance); }
    function addTip(word: string) { const key = TIP_FIELDS[focus] || 'appearance'; update(key, [character[key], word].filter(Boolean).join(', ')); }
    async function save() { if (savePending.current || generationPending.current || !character.imageUrl) return; savePending.current = true; creationKey.current ||= crypto.randomUUID(); setSaving(true); setError(''); try {
        const r = await api('/api/data', { action: 'saveCharacter', creationKey: creationKey.current, character: { ...character, sketch: drawingReady ? canvas.current?.toDataURL('image/png') : character.sketch } });
        await onSaved(r.character);
    }
    catch (e) {
        savePending.current = false;
        setError((e as Error).message);
    }
    finally {
        setSaving(false);
    } }

    const currentStep = character.imageUrl ? 3 : busy ? 2 : drawingReady || character.appearance ? 1 : 0;
    return <div className="studio-page">
      <div className="studio-steps" aria-label="Character creation progress">{['Choose & draw', 'Add details', 'Make a portrait', 'Save your card'].map((label, index) => <span key={label} className={index === currentStep ? 'active' : ''}><b>{index + 1}</b>{label}{index < 3 && <span>›</span>}</span>)}</div>
      <p className="studio-instruction">{character.imageUrl ? 'Your portrait is ready. Save your card!' : 'Choose · Draw · Imagine'}</p>
      <div className="studio-grid">
        <section className="species-picker" aria-label="Choose character species"><h2>Species <span>*</span></h2><div>{SPECIES.map(item => <button key={item.name} className={selectedSpecies === item.name ? 'selected' : ''} aria-pressed={selectedSpecies === item.name} aria-label={`Species: ${item.name}`} onClick={() => update('species', item.name)}><span>{item.icon}</span><b>{item.name}</b></button>)}</div><label>Or imagine one<input aria-label="Custom species" value={SPECIES.some(item => item.name === selectedSpecies) ? '' : selectedSpecies} onChange={e => update('species', e.target.value)} placeholder="e.g. robot" maxLength={60}/></label></section>
        <section className="sketch-section"><h2>Your drawing</h2><div className="drawing-tools"><button className={tool === 'pencil' ? 'active' : ''} onClick={() => setTool('pencil')} aria-label="Pencil"><Pencil size={19}/></button><button className={tool === 'eraser' ? 'active' : ''} onClick={() => setTool('eraser')} aria-label="Eraser"><Eraser size={19}/></button><button onClick={undo} aria-label="Undo drawing"><Undo2 size={19}/></button><button onClick={clear} aria-label="Clear drawing"><Trash2 size={19}/></button><input type="color" aria-label="Pencil colour" value={color} onChange={e => setColor(e.target.value)}/></div><div className="sketch-paper"><canvas ref={canvas} width={450} height={550} aria-label="Draw your character" onPointerDown={start} onPointerMove={move} onPointerUp={() => drawing.current = false} onPointerCancel={() => drawing.current = false}/>{!drawingReady && <div className="sketch-hint"><Pencil size={34}/><b>Bring your idea to life</b><span>{selectedSpecies ? `What does your ${selectedSpecies.toLowerCase()} look like?` : 'Choose a species on the left, then draw here.'}</span></div>}</div></section>
        <section className="portrait-section"><h2>Your portrait</h2><div className="portrait-preview">{character.imageUrl ? <PortraitCard character={{ ...character, name: character.name || 'Your character' }}/> : <div className="empty-portrait"><span>✦</span><p>Your portrait appears here<br/>after you click Generate.</p></div>}</div>{mockPreview && <p className="mock-preview-note">Local preview · image generation is simulated.</p>}</section>
        <section className="character-fields"><div className="tips-box"><header><h3>AI Tips <small>({focus})</small></h3><button className="tiny-button" onClick={shuffle} disabled={tipBusy}><Shuffle size={14}/>{tipBusy ? 'Thinking…' : 'Shuffle'}</button></header><div className="word-chips">{tips.map(t => <button key={t} onClick={() => addTip(t)}>{t}<Plus size={11}/></button>)}</div><Bear variant="drawing" pose="Cagentdraw" responsePose="cagent-planning-v2.webp" busy={tipBusy} onAction={()=>void shuffle()} message={drawingQuestions[focus] || 'What makes your character special?'} hints={["Tap a word you like, then make it your own.","Your drawing and your details help me imagine your character."]}/></div></section>
      </div>
      <section className="character-input-fields" aria-label="Character details">
        <label><span className="field-label">Name <em>*</em></span><input aria-label="Character name" value={character.name} onFocus={() => focusField('Name')} onChange={e => update('name', e.target.value)} placeholder="What is their name?" maxLength={80}/></label>
        <label><span className="field-label">Age <small>(optional)</small></span><input aria-label="Character age" value={character.age} onFocus={() => focusField('Age')} onChange={e => update('age', e.target.value)} placeholder="e.g. 10" maxLength={20}/></label>
        <label><span className="field-label">Personality / Traits</span><input aria-label="Personality / Traits" value={character.traits} onFocus={() => focusField('Personality / Traits')} onChange={e => update('traits', e.target.value)} placeholder="curious, kind…"/></label>
        <label><span className="field-label">Appearance</span><input aria-label="Appearance" value={character.appearance} onFocus={() => focusField('Appearance')} onChange={e => update('appearance', e.target.value)} placeholder="How do they look?"/></label>
        <details><summary>More about my character <small>(optional)</small></summary>{[['background', 'Background / Role', 'Who are they?'], ['strength', 'Strength', 'What are they good at?'], ['challenge', 'Challenge', 'What is difficult for them?']].map(([key, title, placeholder]) => <label key={key}>{title}<input value={character[key as keyof Character] || ''} onFocus={() => focusField(title)} onChange={e => update(key as keyof Character, e.target.value)} placeholder={placeholder}/></label>)}</details>
      </section>
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="studio-footer"><button className="text-button" onClick={onCancel}>← Back to character selection</button><div>{!character.imageUrl && <LoadingButton busy={busy} disabled={saving} onClick={generate}>Generate portrait</LoadingButton>}<LoadingButton busy={saving} disabled={!character.name.trim() || !selectedSpecies || !character.imageUrl || busy} onClick={save}>Save character & continue</LoadingButton></div></div>
    </div>;
}
const SPECIES = [{name:'Boy',icon:'👦'},{name:'Girl',icon:'👧'},{name:'Cat',icon:'🐱'},{name:'Dog',icon:'🐶'},{name:'Rabbit',icon:'🐰'},{name:'Bear',icon:'🐻'},{name:'Fox',icon:'🦊'},{name:'Dragon',icon:'🐉'}];
const TIP_FIELDS: Record<string, keyof Character> = {'Name':'name','Age':'age','Appearance':'appearance','Personality / Traits':'traits','Background / Role':'background','Strength':'strength','Challenge':'challenge'};
const TIP_WORDS: Record<string, string[]> = {
  Name:['Luna','Milo','Kai','Pip','Nova','Rex','Zoe','Sunny'],
  Age:['8','9','10','11','12','young','ancient','ageless'],
  Appearance:['curly hair','sparkling eyes','warm smile','freckles','bright outfit','tiny wings','soft fur','striped tail'],
  'Personality / Traits':['curious','brave','kind','thoughtful','playful','patient','cheerful','determined'],
  'Background / Role':['young explorer','forest guardian','inventor','helpful neighbour','student','traveller','musician','secret keeper'],
  Strength:['solving puzzles','quick runner','good listener','creative ideas','teamwork','climbing','singing','remembering clues'],
  Challenge:['easily distracted','afraid of heights','too impatient','shy','loses things','gets lost','worries easily','needs practice']
};
