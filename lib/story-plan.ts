import type { Story, StoryCanvas } from './types';
import { isDrama } from './drama';

export function editableStory(previous: Story | null, next: Story) {
    if (!previous || previous.id !== next.id || (isDrama(next) ? JSON.stringify({title:previous.title,scenes:previous.canvas.drama?.scenes,cast:previous.characterIds})===JSON.stringify({title:next.title,scenes:next.canvas.drama?.scenes,cast:next.characterIds}) : sectionSignature(previous,4) === sectionSignature(next,4))) return next;
    if(isDrama(next) && (previous.status==='published'||previous.stage==='drama-finish')) return {...next,status:'draft',stage:next.stage==='drama-finish'?'drama-write':next.stage};
    if (previous.status === 'published' || previous.stage === 'finish')
        return {...next,status:'draft',stage:next.stage === 'finish' ? 'write' : next.stage};
    return next;
}

export function sectionSignature(story: Pick<Story, 'sections' | 'canvas' | 'characterSnapshots'>, section: number) {
    const canvas = story.canvas as StoryCanvas;
    return JSON.stringify({
        section, sections: story.sections.slice(0, section + 1),
        characters: story.characterSnapshots.map(c => ({ id: c.id, name: c.name, traits: c.traits, appearance: c.appearance })).sort((a,b) => a.id.localeCompare(b.id)),
        nodes: canvas.nodes.map(n => ({ id:n.id, type:n.type, label:n.label, details:n.details || '' })).sort((a,b) => a.id.localeCompare(b.id)),
        edges: canvas.edges.map(e => ({ source:e.source, target:e.target, label:e.label })).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    });
}

export function planQuestion(story: Story, section: number) {
    const character = story.canvas.nodes.find(n => n.type === 'character')?.label || story.characterSnapshots[0]?.name || 'your character';
    const setting = story.canvas.nodes.find(n => n.type === 'setting')?.label;
    const goal = story.canvas.nodes.find(n => n.type === 'goal')?.label;
    const relationship = story.canvas.edges[0];
    const other = relationship && story.canvas.nodes.find(n => n.id === relationship.target)?.label;
    return [
        `Where is ${character}${setting ? ` in ${setting}` : ''}, and what are they doing when your story starts?`,
        `What gets in ${character}'s way${goal ? ` as they try to ${goal}` : ''}?`,
        `What important choice does ${character} make${other ? ` with ${other}` : ''}?`,
        `What happens because of ${character}'s choice?`,
        `How has ${character}'s situation changed, and how does the story end?`,
    ][section];
}
