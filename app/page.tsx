'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Home, BookOpen, UsersRound, Plus, ChevronRight, ArrowLeft, LogOut, Search, Trash2, Pencil, Check, Layers, Map as MapIcon, PackageOpen, Flag, Download } from 'lucide-react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';
import LoginPage from '@/components/auth/login-page';
import UserProfilePage from '@/components/stages/user-profile-page';
import UserSettingsPage from '@/components/stages/user-settings-page';
import NavigationPage from '@/components/stages/navigation-page';
import type { User, Character, Story, MapFlagItem } from '@/lib/types';
import { STAGES } from '@/lib/types';
import { editableStory } from '@/lib/story-plan';
import { api, Logo, IdeaPackButton, PortraitCard, WoodTitle, Bear, Modal } from '@/components/lite/common';
import CharacterStudio from '@/components/lite/character-studio';
import PageGuide from '@/components/lite/page-guide';
import DeckCoach from '@/components/lite/deck-coach';
import { characterDeck, packCardKey } from '@/lib/character-library';
import StoryCanvasPage, { CanvasView } from '@/components/lite/story-canvas';
import { Mountain, WritingPage, FinishPage } from '@/components/lite/writing';
import {isDrama,writingType} from '@/lib/drama';
import DiscardDraft from '@/components/lite/discard-draft';
import CharacterPackCard from '@/components/lite/character-pack-card';
const JourneyMap = dynamic(() => import('@/components/stages/journey-map'), { ssr: false });
const DramaEditor=dynamic(()=>import('@/components/lite/drama').then(m=>m.DramaEditor));
const DramaFinish=dynamic(()=>import('@/components/lite/drama').then(m=>m.DramaFinish));
type Screen = 'login' | 'farm' | 'map' | 'characters' | 'studio' | 'detail' | 'canvas' | 'mountain' | 'write' | 'finish' | 'stories' | 'pack' | 'settings' | 'visits' | 'otherFarm' | 'teacher' | 'drama-scenes' | 'drama-write' | 'drama-finish';
type Chapter = {
    mapImageUrl: string;
    mapFlags: MapFlagItem[];
    currentPin: {
        x: number;
        y: number;
    } | null;
};
type MapState = {
    activeChapterIndex: number;
    chapters: Chapter[];
};
const blankChapter = (i = 0): Chapter => ({ mapImageUrl: i ? '/secondmap.webp' : '/firstmap.webp', mapFlags: [], currentPin: null });
const initialMap: MapState = { activeChapterIndex: 0, chapters: [blankChapter()] };
export default function Page() {
    const [user, setUser] = useState<User | null>(null), [screen, setScreen] = useState<Screen>('login'), [loading, setLoading] = useState(true), [characters, setCharacters] = useState<Character[]>([]), [stories, setStories] = useState<Story[]>([]), [story, setStory] = useState<Story | null>(null), [editing, setEditing] = useState<Character | undefined>(), [detail, setDetail] = useState<Character | null>(null), [chosen, setChosen] = useState<string[]>([]), [search, setSearch] = useState(''), [profile, setProfile] = useState<any>({}), [mapState, setMapState] = useState<MapState>(initialMap), [saveStatus, setSaveStatus] = useState(''), [publishing, setPublishing] = useState(false), [confirmDelete, setConfirmDelete] = useState<Character | null>(null), [users, setUsers] = useState<any[]>([]), [other, setOther] = useState(''), [vocabUser, setVocabUser] = useState(''), [vocab, setVocab] = useState(''), [pack, setPack] = useState(false), [mapBusy, setMapBusy] = useState(false);
    const [creatingPin,setCreatingPin]=useState<{x:number;y:number;kind:'story'|'drama'}|null>(null);
    const creatingStory=useRef(false);
    const [characterDeleteBusy,setCharacterDeleteBusy]=useState(false);
    const deletingCharacter=useRef(false);
    const [growthTrees,setGrowthTrees]=useState<number[]>([]);
    const finishGrowthAnimation=useCallback(()=>setGrowthTrees([]),[]);
    const packPending = useRef(new Set<string>());
    const [packSaving,setPackSaving] = useState('');
    const packDeck = characterDeck(characters, chosen);
    const deck = characterDeck([...characters,...(story?.characterSnapshots||[]).filter(saved=>!characters.some(c=>c.id===saved.id))], chosen);
    const storyDeck = deck.filter(c=>chosen.includes(c.id));
    const latest = useRef<Story | null>(null), pending = useRef<ReturnType<typeof setTimeout> | null>(null), queue = useRef(Promise.resolve()), mapRef = useRef(mapState);
    const chapter = mapState.chapters[mapState.activeChapterIndex] || blankChapter();
    const repairedMapArt=useRef(new Set<string>());
    useEffect(()=>{
        if(screen!=='map'||mapBusy)return;
        const old=chapter.mapFlags.filter(flag=>flag.previewArt?.imageUrl?.startsWith('https://')&&flag.previewArt.source!=='local-preview'&&!flag.previewArt.backgroundRemoved&&!repairedMapArt.current.has(flag.id+flag.previewArt.imageUrl));
        if(!old.length)return;
        old.forEach(flag=>repairedMapArt.current.add(flag.id+flag.previewArt!.imageUrl));
        setMapBusy(true);
        void (async()=>{
            try{for(const flag of old){
                let result=await api('/api/map-update',{storyId:flag.id,repairOnly:true});
                for(let attempt=0;attempt<12&&result.previewArt&&!result.previewArt.backgroundRemoved&&!result.error;attempt++){
                    await new Promise(resolve=>setTimeout(resolve,5000));
                    result=await api('/api/map-update',{storyId:flag.id,repairOnly:true});
                }
                if(result.mapState?.chapters?.length){mapRef.current=result.mapState;setMapState(result.mapState);}
                if(result.error)toast.error(result.message);
            }}catch(error){toast.error((error as Error).message);}finally{setMapBusy(false);}
        })();
    },[screen,mapBusy,chapter.mapFlags]);
    const [studioReturn,setStudioReturn]=useState<'characters'|'drama-scenes'|'drama-write'>('characters');
    const [discardDraft,setDiscardDraft]=useState<Story|null>(null),[discardBusy,setDiscardBusy]=useState(false),[growthRetry,setGrowthRetry]=useState<string|null>(null),[growthBusy,setGrowthBusy]=useState(false);
    const refresh = useCallback(async () => { const data = await api('/api/data'); setUser(data.user); setCharacters(data.characters); setStories(data.stories); setProfile(data.profile || {}); if (data.mapState?.chapters?.length) {
        setMapState(data.mapState);
        mapRef.current = data.mapState;
    } return data; }, []);
    useEffect(() => { api('/api/auth').then(async (d) => { if (d.user) {
        await refresh();
        setScreen('farm');
    } }).catch(() => toast.error('Could not connect. Please refresh.')).finally(() => setLoading(false)); }, [refresh]);
    function save(s: Story) { setSaveStatus('Saving…'); const operation = queue.current.catch(() => { }).then(async () => { const data = await api('/api/data', { action: 'saveStory', story: s }); setStories(items => [data.story, ...items.filter(x => x.id !== s.id)]); setSaveStatus('Saved'); }); queue.current = operation; void operation.catch(e => { setSaveStatus('Not saved — retry'); toast.error(e.message); }); return operation; }
    function update(s: Story) { s = editableStory(latest.current,s); latest.current = s; setStory(s); if (pending.current)
        clearTimeout(pending.current); pending.current = setTimeout(() => { void save(s); pending.current = null; }, 800); }
    async function flush() { if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
        if (latest.current)
            await save(latest.current);
    } await queue.current; }
    useEffect(() => { const listener = (e: BeforeUnloadEvent) => { if (pending.current || saveStatus === 'Saving…' || saveStatus.startsWith('Not saved')) {
        e.preventDefault();
        e.returnValue = '';
    } }; window.addEventListener('beforeunload', listener); return () => window.removeEventListener('beforeunload', listener); }, [saveStatus]);
    useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [screen]);
    async function go(to: Screen) { await flush(); setScreen(to); if (['farm', 'stories'].includes(to))
        void refresh(); }
    function event(type: string, payload: unknown) { void api('/api/data', { action: 'event', storyId: story?.id, type, payload }).catch(() => { }); }
    async function saveMap(next: MapState) { mapRef.current = next; setMapState(next); const result=await api('/api/data', { action: 'saveMap', state: next }); if(result.mapState){mapRef.current=result.mapState;setMapState(result.mapState);} }
    async function deleteCharacter(){
        if(!confirmDelete||deletingCharacter.current)return;
        const target=confirmDelete;deletingCharacter.current=true;setCharacterDeleteBusy(true);
        try{
            await flush();
            await api('/api/data',{action:'deleteCharacter',id:target.id});
            setCharacters(cards=>cards.filter(card=>card.id!==target.id));
            setChosen(ids=>ids.filter(id=>id!==target.id||latest.current?.characterIds.includes(id)));
            setConfirmDelete(null);
            if(screen==='detail'){setDetail(null);setScreen('characters');}
            toast.success(`${target.name} was removed from your character pack. Saved writing keeps its character.`);
        }catch(error){toast.error((error as Error).message);}finally{deletingCharacter.current=false;setCharacterDeleteBusy(false);}
    }
    async function newStory(pin?: {
        x: number;
        y: number;
    }, kind:'story'|'drama'='story') { if(creatingStory.current)return; creatingStory.current=true; setCreatingPin({...pin||chapter.currentPin||{x:50,y:50},kind}); try { await flush(); const r = await api('/api/data', { action: 'newStory', writingType:kind, pin: pin || chapter.currentPin, chapterIndex: mapState.activeChapterIndex }); latest.current = r.story; setStory(r.story); setChosen([]); setStudioReturn('characters'); setScreen(kind==='drama'?'drama-scenes':'characters'); setSaveStatus('Saved'); setStories(s => [r.story, ...s]); }catch(e){toast.error((e as Error).message);}finally{creatingStory.current=false;setCreatingPin(null);} }
    function openStory(s: Story) { latest.current = s; setStory(s); setChosen(s.characterIds); setStudioReturn('characters'); setScreen((isDrama(s) ? (['drama-scenes','drama-write','drama-finish'].includes(s.stage)?s.stage:'drama-scenes') : (s.stage === 'characters' ? 'characters' : ['canvas', 'mountain', 'write', 'finish'].includes(s.stage) ? s.stage : 'write')) as Screen); }
    async function deleteDraft() {
        if(!discardDraft||discardBusy)return;
        const target=discardDraft;setDiscardBusy(true);
        try {
            await flush();
            const result=await api('/api/data',{action:'deleteStory',id:target.id,expectedUpdatedAt:target.updatedAt});
            setStories(items=>items.filter(item=>item.id!==target.id));
            if(result.mapState?.chapters?.length){mapRef.current=result.mapState;setMapState(result.mapState);}
            if(latest.current?.id===target.id){latest.current=null;setStory(null);setChosen([]);setSaveStatus('');}
            setDiscardDraft(null);toast.success('Your unfinished writing was deleted.');
        }catch(e){
            toast.error((e as Error).message);
            try {const data=await refresh();setDiscardDraft(data.stories.find((item:Story)=>item.id===target.id&&item.status==='draft')||null);}catch{}
        }finally{setDiscardBusy(false);}
    }
    async function toStage(stage: Screen) { if (!latest.current)
        return; const s = { ...latest.current, stage }; update(s); await flush(); setScreen(stage); }
    function toggle(id: string) { const card=characters.find(c=>c.id===id); const aliases=card?characters.filter(c=>packCardKey(c)===packCardKey(card)).map(c=>c.id):[id]; const remaining=chosen.filter(x=>!aliases.includes(x)); const ids = chosen.includes(id) ? remaining : [...remaining, id]; setChosen(ids); if (story && story.status !== 'published') {
        update({ ...story, characterIds: ids, characterSnapshots: ids.map(x => story.characterSnapshots.find(c => c.id === x) || characters.find(c => c.id === x)!).filter(Boolean) });
    } }
    async function startCanvas() { try {
        let s = story;
        if (!s || s.status === 'published') {
            const r = await api('/api/data', { action: 'newStory', pin: chapter.currentPin, chapterIndex: mapState.activeChapterIndex });
            s = r.story;
        }
        const snapshots = characterDeck(chosen.map(id => s!.characterSnapshots.find(c => c.id === id) || characters.find(c => c.id === id)!).filter(Boolean));
        const castIds = snapshots.map(c=>c.id);
        const old = s!.canvas;
        const nodes = old.nodes.filter(n=>n.type!=='character'||castIds.includes(n.characterId||''));
        snapshots.forEach((c, i) => { if (!nodes.some(n => n.characterId === c.id))
            nodes.push({ id: crypto.randomUUID(), type: 'character', label: c.name, imageUrl: c.imageUrl, characterId: c.id, details: c.traits, x: 80 + (i % 4) * 200, y: 70 + Math.floor(i / 4) * 210 }); });
        const nodeIds = new Set(nodes.map(n=>n.id));
        const next = { ...s!, stage: 'canvas', characterIds: castIds, characterSnapshots: snapshots, canvas: { ...old, nodes, edges: old.edges.filter(e=>nodeIds.has(e.source)&&nodeIds.has(e.target)) } };
        setChosen(castIds);
        update(next);
        await flush();
        setScreen('canvas');
    }
    catch (e) {
        toast.error((e as Error).message);
    } }
    async function savedCharacter(c: Character) { setCharacters(cs => [c, ...cs.filter(x => x.id !== c.id)]); setDetail(c); setScreen('detail'); setEditing(undefined); toast.success(`${c.name} is saved in your character deck.`); }
    const resume = stories.find(s => s.status === 'draft' && s.chapterIndex === mapState.activeChapterIndex);
    async function publish() { if (!story)
        return; setPublishing(true); try {
        await flush();
        const result=await api('/api/data',{action:'saveStory',story:{...latest.current,status:'published',stage:isDrama(story)?'drama-finish':'finish'}});
        const s=result.story as Story;
        latest.current=s;setStory(s);setStories(items=>[s,...items.filter(x=>x.id!==s.id)]);setSaveStatus('Saved');
        if(result.mapState){mapRef.current=result.mapState;setMapState(result.mapState);}
        setScreen('map');
        toast.success(`Your ${writingType(s)} is saved on your map.`);
        void requestGrowth(s.id);
        void updateMapArt(s);
    }
    catch (e) {
        toast.error((e as Error).message);
    }
    finally {
        setPublishing(false);
    } }
    async function requestGrowth(storyId: string) { setGrowthBusy(true); try {
        const result = await api('/api/ai', { kind: 'growth', storyId });
        if (result.growthStatus === 'pending') setGrowthRetry(storyId);
        else { setGrowthRetry(null); if(result.grownTreeIds?.length)setGrowthTrees(ids=>[...new Set([...ids,...result.grownTreeIds])]); if(result.profile)setProfile(result.profile); }
    } catch { setGrowthRetry(storyId); }
    finally { setGrowthBusy(false); } }
    async function updateMapArt(s: Story) { setMapBusy(true); try {
        const r = await api('/api/map-update', { storyId: s.id });
        if (r.mapState?.chapters?.length) { mapRef.current = r.mapState; setMapState(r.mapState); }
        if(r.error||r.previewArt?.source==='fal'&&!r.previewArt.backgroundRemoved)toast.info(r.message||'Your transparent map picture is being made. Check again shortly.');
        else if (r.previewArt) toast.success(r.previewArt.source==='local-preview' ? 'Local preview: example picture shown. No AI image was generated.' : r.reused ? 'Saved picture shown. No new AI request needed.' : 'Your writing map has a new illustration.');
        else toast.info(r.message || 'Story saved. Map illustration could not update; you can try again.');
    }
    catch {
        toast.info('Story saved. Map illustration can be retried.');
    }
    finally {
        setMapBusy(false);
    } }
    async function refreshChapterArt() {
        if(mapBusy)return;
        const works=stories.filter(s=>s.status==='published'&&s.chapterIndex===mapState.activeChapterIndex);
        setMapBusy(true);
        try {
            let updated=0,examples=0;const issues:string[]=[];
            for(const work of works){
                const r=await api('/api/map-update',{storyId:work.id});
                if(r.mapState?.chapters?.length){mapRef.current=r.mapState;setMapState(r.mapState);}
                if(r.error||r.previewArt?.source==='fal'&&!r.previewArt.backgroundRemoved)issues.push(r.message||'Your transparent map picture is being made. Check again shortly.');
                else if(r.previewArt){updated++;if(r.previewArt.source==='local-preview')examples++;}
                else issues.push(r.message||'Some pictures could not be made. Try again.');
            }
            if(issues.length)toast.info(issues[0]);
            else toast.success(examples ? 'Local preview: example pictures shown. No AI requests were sent.' : updated+' saved pictures are shown on your map.');
        }catch(e){toast.error((e as Error).message);}finally{setMapBusy(false);}
    }
    async function logout() { await flush(); await fetch('/api/auth', { method: 'DELETE' }); setUser(null); setStory(null); latest.current = null; setScreen('login'); setCharacters([]); setStories([]); setMapState(initialMap); mapRef.current = initialMap; setProfile({}); setSaveStatus(''); }
    const storyFlow = Boolean(story) && ['characters', 'canvas', 'mountain', 'write', 'finish','drama-scenes','drama-write','drama-finish'].includes(screen);
    const stages = story&&isDrama(story)?[['drama-scenes','Create Scenes'],['drama-write','Write Script'],['drama-finish','Review & Finish']]:[['characters', 'Characters'], ['canvas', 'Story Canvas'], ['write', 'Start writing'], ['finish', 'Finish']];
    if (loading)
        return <main data-stage="login" className="initial-loading"><img src="/Cagentsit.webp" alt="Cagent"/><p>Opening your writing world…</p></main>;
    if (!user || screen === 'login')
        return <main data-stage="login"><LoginPage onLogin={async (u) => { await refresh(); setScreen('farm'); }}/></main>;
    const legacy = ['farm', 'settings', 'otherFarm', 'visits'].includes(screen);
    const screenTitles: Partial<Record<Screen, string>> = { map: 'My Writing Map', characters: 'Start a New Story', studio: 'Create a New Character', detail: 'My Character Card', canvas: 'Story Canvas', mountain: 'Your Story Mountain', write: 'Time to Write Your Story', finish: 'My Finished Story', stories: 'My Writing Board', pack: 'Character Card Pack', visits: 'Visit a Friend’s Farm', teacher: 'Teacher’s Word Collection','drama-scenes':'Set the scene','drama-write':'Write your scene','drama-finish':'My Finished Drama' };
    return <main data-stage={screen} className={legacy ? 'legacy-stage' : 'lite-stage'}>
 {legacy ? null : <div className="storybook-app"><div className="story-shell"><header className="story-header"><div className="header-left"><button className="header-brand" onClick={() => void go('farm')} aria-label="CWrite Lite home"><Logo white /></button><div className="header-title"><WoodTitle>{screenTitles[screen]}</WoodTitle><PageGuide key={`${user.id}-${screen}`} screen={screen} userId={user.id} firstVisit={screen==='canvas'&&!profile.guideSeen?.canvas} onSeen={()=>{setProfile((p:any)=>({...p,guideSeen:{...p.guideSeen,canvas:true}}));void api('/api/data',{action:'guideSeen',screen:'canvas'}).catch(()=>{});}}/></div></div><nav className="progress-nav" aria-label="Story progress">{storyFlow && stages.map(([id, label], i) => <span key={id}><button className={screen === id ? 'active' : ''} disabled={i > Math.max(0, stages.findIndex(([stageId]) => stageId === (story?.stage === 'mountain' ? 'write' : story?.stage)))} onClick={() => void go(id as Screen)}>{screen === id && <span>✦</span>}{label}</button>{i < stages.length - 1 && <ChevronRight size={14}/>}</span>)}</nav><div className="header-user"><span>{user.username}</span><button className="icon-button" onClick={logout} aria-label="Log out"><LogOut size={16}/></button></div></header><div className="story-shell-body"><div className="story-content">
 {screen === 'characters' && <><WoodTitle>Who will be in your story?</WoodTitle><div className="deck-controls"><label className="search-field"><Search size={17}/><input aria-label="Search characters" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your character…"/></label><span className="deck-count"><Layers size={16}/>My Story Deck ({storyDeck.length})</span></div><div className="character-deck-layout"><aside className="deck-pack-corner"><p>Open to see characters<br/>you created before.</p><IdeaPackButton onClick={() => { setPack(true); void event('idea_pack_opened', {}); }}/></aside><div className="character-deck"><div className="deck-grid">{storyDeck.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map(c => <div className="deck-item" key={c.id}><CharacterPackCard character={c} selected={chosen.includes(c.id)} onClick={() => toggle(c.id)} onDelete={characters.some(card=>card.id===c.id)?()=>setConfirmDelete(c):undefined}/><button className="card-detail-link" onClick={() => { setDetail(c); setScreen('detail'); }}>View card</button></div>)}<button className="new-character-card" onClick={() => { setStudioReturn('characters'); setEditing(undefined); setScreen('studio'); }}><Plus size={48}/><b>Create a New<br />Character</b></button>{!storyDeck.length && <div className="deck-empty"><span>✦</span><h2>Who joins this story?</h2><p>Open your pack or create a character.</p></div>}</div></div></div><div className="deck-bottom"><DeckCoach story={story} cast={deck.filter(c=>chosen.includes(c.id))}/><button className="purple-button" disabled={!chosen.length} onClick={startCanvas}>{chosen.length ? `${chosen.length} character${chosen.length === 1 ? '' : 's'} chosen` : 'Choose a character'}<ChevronRight size={18}/></button></div></>}
 {screen === 'studio' && <CharacterStudio initial={editing} onSaved={async c => { if(studioReturn!=='characters'&&latest.current&&isDrama(latest.current)){setCharacters(cs=>[c,...cs.filter(x=>x.id!==c.id)]);const s=latest.current;update({...s,characterIds:[...new Set([...s.characterIds,c.id])],characterSnapshots:[...s.characterSnapshots.filter(x=>x.id!==c.id),c]});await flush();setEditing(undefined);setScreen(studioReturn);toast.success(`${c.name} is ready for your drama.`);return;} await savedCharacter(c); if (!chosen.includes(c.id)) { const ids = [...chosen, c.id]; setChosen(ids); if (story && story.status !== 'published') update({ ...story, characterIds: ids, characterSnapshots: [...story.characterSnapshots.filter(x => ids.includes(x.id)), c] }); } }} onCancel={() => setScreen(studioReturn)}/>}
 {screen === 'detail' && detail && <><div className="character-detail"><div className="detail-portrait"><PortraitCard character={detail}/></div><section className="cream-panel character-facts"><header><h2>{detail.name}</h2>{characters.some(c=>c.id===detail.id)&&<div><button className="icon-button" aria-label="Edit character" onClick={() => { setEditing(detail); setScreen('studio'); }}><Pencil size={18}/></button><button className="icon-button" aria-label="Delete character" onClick={() => setConfirmDelete(detail)}><Trash2 size={18}/></button></div>}</header><dl>{[['Character type', detail.species], ['Age', detail.age], ['Appearance', detail.appearance], ['Traits', detail.traits], ['Background / Role', detail.background], ['Strength', detail.strength], ['Challenge', detail.challenge]].filter(([, v]) => v).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><div className="character-story-list"><h3>Appeared in {stories.filter(s => s.characterIds.includes(detail.id)).length === 1 ? '1 piece of writing' : `${stories.filter(s => s.characterIds.includes(detail.id)).length} pieces of writing`}</h3>{stories.filter(s => s.characterIds.includes(detail.id)).map(s => <button onClick={() => openStory(s)} key={s.id}><BookOpen size={18}/>{s.title}<ChevronRight size={16}/></button>)}{!stories.some(s => s.characterIds.includes(detail.id)) && <p>A new adventure is waiting.</p>}</div><button className="purple-button" onClick={() => { if (!chosen.includes(detail.id))
            toggle(detail.id); setScreen('characters'); }}><Plus size={16}/>Use in my story</button></section></div></>}
 {['drama-scenes','drama-write'].includes(screen) && story && isDrama(story) && <DramaEditor key={story.id} story={story} characters={characters} onDeleteCharacter={setConfirmDelete} onChange={update} script={screen==='drama-write'} onCreateCharacter={()=>{setStudioReturn(screen==='drama-write'?'drama-write':'drama-scenes');setEditing(undefined);setScreen('studio');}} onBack={()=>screen==='drama-write'?toStage('drama-scenes'):go('map')} onContinue={()=>toStage(screen==='drama-write'?'drama-finish':'drama-write')}/> }
 {screen === 'drama-finish' && story && isDrama(story) && <DramaFinish story={story} onBack={()=>toStage('drama-write')} onPublish={publish} publishing={publishing}/> }
 {screen === 'canvas' && story && <StoryCanvasPage story={story} characters={characters} onChange={update} onContinue={() => void toStage('write')} onEvent={event}/>}
 {screen === 'mountain' && story && <Mountain story={story} onContinue={() => void toStage('write')}/>}
 {screen === 'write' && story && <WritingPage onBeforeCheck={flush} key={story.id} story={story} onChange={update} onCanvas={() => void toStage('canvas')} onFinish={() => void toStage('finish')} onEvent={event}/>}
 {screen === 'finish' && story && <FinishPage story={story} onChange={update} onBack={() => void toStage('write')} onPublish={publish} publishing={publishing}/>}
 {screen === 'stories' && <><WoodTitle>My Writing Board</WoodTitle><p className="page-intro">Every adventure leaves a little piece of you.</p><div className="stories-grid">{stories.map(s => <button className="cream-panel story-tile" key={s.id} onClick={() => openStory(s)}><div className="story-tile-art">{s.characterSnapshots[0]?.imageUrl ? <img src={s.characterSnapshots[0].imageUrl} alt=""/> : <BookOpen size={45}/>}</div><span className={`story-status ${s.status}`}>{s.status === 'published' ? 'On my map' : 'In progress'}</span><h2>{s.title}</h2><p>{s.content.slice(0, 120) || 'A new adventure is taking shape…'}</p><small>{new Date(s.updatedAt).toLocaleDateString()} · {isDrama(s)?`${s.canvas.drama?.scenes.length||0} scenes · Drama`:`${s.sections.filter(x => x.trim()).length}/5 sections · Story`}</small><b>{s.status === 'published' ? `Read ${writingType(s)}` : 'Continue writing'} →</b></button>)}<button className="new-story-tile" onClick={() => void go('map')}><Plus size={40}/>Start New Writing</button></div></>}
 {screen === 'characters' && pack && <Modal title="Character Idea Pack" wide onClose={() => setPack(false)}><div className="pack-cards">{packDeck.map(c=><CharacterPackCard key={c.id} character={c} selected={chosen.includes(c.id)} onClick={()=>toggle(c.id)} onDelete={()=>setConfirmDelete(c)}/>)}</div>{!packDeck.length&&<p>Your saved characters will appear here.</p>}<details className="pack-new-ideas"><summary>Meet a new character</summary><div className="pack-cards">{[
    { name: 'Fox', species: 'Fox', imageUrl: '/dramacharacter/Fox Vendor.webp', traits: 'clever, curious' },
    { name: 'Robin', species: 'Bird', imageUrl: '/dramacharacter/Bird Scholar.webp', traits: 'thoughtful, patient' },
    { name: 'Pip', species: 'Rabbit', imageUrl: '/dramacharacter/Rabbit Postman.webp', traits: 'helpful, quick' }
 ].map(p => <div key={p.name}><PortraitCard character={{ id: '', age: '', appearance: '', background: '', strength: '', challenge: '', sketch: '', ...p }}/><p>{p.traits}</p><button className="outline-button" disabled={Boolean(packSaving)||characters.some(c=>c.name===p.name&&c.imageUrl===p.imageUrl)} onClick={async () => { if(packPending.current.has(p.name))return;packPending.current.add(p.name);setPackSaving(p.name);try {
    const r = await api('/api/data', { action: 'saveCharacter', source: 'ideaPack', character: p });
    setCharacters(cs => [r.character, ...cs.filter(c => c.id !== r.character.id)]);
    toast.success(`${p.name} is saved in your character deck.`);
    void event('idea_pack_character_saved', { characterId: r.character.id, species: p.species });
 } catch(e) { toast.error((e as Error).message); } finally {packPending.current.delete(p.name);setPackSaving('');} }}><Plus size={15}/>{packSaving===p.name?'Saving…':characters.some(c=>c.name===p.name&&c.imageUrl===p.imageUrl)?'In my deck ✓':'Keep this character'}</button></div>)}</div></details></Modal>}

 {screen === 'teacher' && <><WoodTitle>Teacher’s word collection</WoodTitle><section className="cream-panel teacher-panel"><p>Add vocabulary to a student’s AI hints. Suggestions still follow their current writing.</p><label>Student username<input value={vocabUser} onChange={e => setVocabUser(e.target.value)}/></label><label>Words and short phrases <small>(one per line)</small><textarea value={vocab} onChange={e => setVocab(e.target.value)}/></label><button className="purple-button" onClick={async () => { try {
            await api('/api/data', { action: 'vocabulary', username: vocabUser, words: vocab.split('\n').filter(Boolean) });
            toast.success('Word collection saved.');
        }
        catch (e) {
            toast.error((e as Error).message);
        } }}>Save word collection</button><a className="outline-button" href="/api/research" download="cwrite-research.json"><Download size={17}/>Export research records</a></section></>}
 {screen === 'map' && <><JourneyMap illustrating={mapBusy} creatingPin={creatingPin} type="story" mapImageUrl={chapter.mapImageUrl} mapFlags={chapter.mapFlags} pin={resume?.pin || chapter.currentPin} onPinChange={pin => { mapRef.current = { ...mapRef.current, chapters: mapRef.current.chapters.map((c, i) => i === mapRef.current.activeChapterIndex ? { ...c, currentPin: pin } : c) }; void saveMap(mapRef.current); }} chapterIndex={mapState.activeChapterIndex} onPrevChapter={() => void saveMap({ ...mapState, activeChapterIndex: Math.max(0, mapState.activeChapterIndex - 1) })} onNextChapter={() => { const index = mapState.activeChapterIndex + 1; void saveMap({ ...mapState, activeChapterIndex: index, chapters: mapState.chapters[index] ? mapState.chapters : [...mapState.chapters, blankChapter(index)] }); }} canMoveToNextChapter={chapter.mapFlags.length >= 2} storyState={{}} bookReviewState={{}} letterState={{}} onStartJourney={(kind,pin) => void newStory(pin,kind==='drama'?'drama':'story')} drafts={stories.filter(s=>s.status==='draft'&&s.chapterIndex===mapState.activeChapterIndex).map(s=>({id:s.id,title:s.title,pin:s.pin,workType:writingType(s)}))} onResumeDraft={id=>{const s=stories.find(s=>s.id===id);if(s)openStory(s);}} onDeleteDraft={id=>setDiscardDraft(stories.find(s=>s.id===id&&s.status==='draft')||null)} resumeJourney={Boolean(resume)} onContinue={() => resume && openStory(resume)} onNavigate={() => void newStory()} onGoProfile={() => void go('farm')} onEditStory={id => { const s = stories.find(s => s.id === id); if (s) openStory({ ...s, stage: isDrama(s)?'drama-write':'write' }); }}/>{!mapBusy && chapter.mapFlags.length > 0 && <button className="map-refresh-button" onClick={() => void refreshChapterArt()}>✦ Refresh map illustration</button>}</>}
 </div></div><div className="shell-save-status" role="status">{storyFlow && saveStatus}<button onClick={() => latest.current && void save(latest.current)} hidden={!saveStatus.startsWith('Not saved')}>Retry</button></div></div></div>}
 {screen === 'visits' && <NavigationPage currentUsername={user.username} onBack={() => void go('farm')} onSelectFarm={name => { setOther(name); setScreen('otherFarm'); }}/>}
 {screen === 'farm' && <UserProfilePage userId={user.username} userRole={user.role} currentUsername={user.username} currentUserRole={user.role} avatarUrl={profile.avatarUrl} avatarEmoji={profile.avatarEmoji} trees={profile.trees || Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 }))} treeGrowthDetails={profile.treeGrowthDetails || {}} recentGrowthTreeIds={growthTrees} onGrowthAnimationComplete={finishGrowthAnimation} onEditStory={id => { const s = stories.find(s => s.id === id); if (s) openStory({ ...s, stage: isDrama(s)?'drama-write':'write' }); }} onBack={() => void go('map')} onOpenSettings={() => setScreen('settings')} onVisitOthersFarm={() => setScreen('visits')}/>}
 {screen === 'otherFarm' && <UserProfilePage key={other} userId={other} userRole="student" currentUsername={user.username} currentUserRole={user.role} onBack={() => setScreen('visits')} onOpenSettings={() => { }} isOtherFarm/>}
 {screen === 'settings' && <UserSettingsPage userId={user.username} onBack={() => void go('farm')} onProfileUpdated={() => void refresh()}/>}

 {growthRetry&&<div className="growth-retry" role="status"><span>Your writing is saved. Growth check needs another try.</span><button className="outline-button" disabled={growthBusy} onClick={()=>void requestGrowth(growthRetry)}>{growthBusy?'Checking…':'Retry'}</button></div>}
 {discardDraft&&<DiscardDraft work={discardDraft} busy={discardBusy} onClose={()=>setDiscardDraft(null)} onConfirm={()=>void deleteDraft()}/> }
 {confirmDelete && <Modal title={`Delete ${confirmDelete.name}?`} onClose={()=>{if(!characterDeleteBusy)setConfirmDelete(null);}}><p>This removes the card from your character pack. Saved stories and drama scenes keep their own copy.</p><div className="draft-delete-actions"><button className="outline-button" disabled={characterDeleteBusy} onClick={()=>setConfirmDelete(null)}>Keep character</button><button className="danger-button" disabled={characterDeleteBusy} onClick={()=>void deleteCharacter()}>{characterDeleteBusy?'Deleting…':'Delete this character'}</button></div></Modal>}
 </main>;
}
