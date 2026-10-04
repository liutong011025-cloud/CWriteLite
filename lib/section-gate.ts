import { createHash } from 'node:crypto';
import type { Story } from './types';
import { sectionSignature } from './story-plan';

export const MIN_SECTION_WORDS = 12;
export const GATE_VERSION = 2;
export const gateHash = (story: Pick<Story,'sections'|'canvas'|'characterSnapshots'>, section:number) => createHash('sha256').update(`${GATE_VERSION}:`+sectionSignature(story, section)).digest('hex');
const tokensOf = (text:string) => text.toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)?/g) || [];
const phrases = (tokens:string[],size=4) => new Set(tokens.slice(0,Math.max(0,tokens.length-size+1)).map((_,i)=>tokens.slice(i,i+size).join(' ')));
const sentences = (text:string) => text.split(/[.!?\n]+/).map(tokensOf).filter(t=>t.length>=5);

export function repeatsEarlier(text:string, earlier:string[]) {
    const current=tokensOf(text), currentPhrases=phrases(current);
    return earlier.some(previous=>{
        const old=tokensOf(previous); if(old.length<5)return false;
        if(current.join(' ')===old.join(' '))return true;
        const oldPhrases=phrases(old);
        const shared=[...currentPhrases].filter(p=>oldPhrases.has(p)).length;
        if(currentPhrases.size&&shared/currentPhrases.size>=.68)return true;
        // Copying the same substantial dialogue with a new introduction is still repetition.
        const oldSentences=sentences(previous).map(t=>t.join(' '));
        const copied=sentences(text).filter(t=>oldSentences.includes(t.join(' '))).reduce((sum,t)=>sum+t.length,0);
        return copied>=8&&copied/current.length>=.5;
    });
}

export function draftBasics(text: string, previous: string[]) {
    const tokens = text.toLowerCase().match(/[a-z]+(?:'[a-z]+)?/g) || [];
    if (tokens.length < MIN_SECTION_WORDS) return `Add a little more: aim for at least ${MIN_SECTION_WORDS} words that tell this part of your story.`;
    if (new Set(tokens).size < 5 || /([a-z])\1{6,}/i.test(text)) return 'Use different words to explain what happens. Repeating letters or the same words does not tell a story.';
    if (repeatsEarlier(text,previous)) return 'This repeats an earlier part. Tell a new event that fits this story part.';
    return '';
}

type GateStory = Pick<Story,'sections'|'canvas'|'characterSnapshots'>;
const quoteIn = (text:string,quote:unknown) => typeof quote==='string' && tokensOf(quote).length>=2 && tokensOf(text).join(' ').includes(tokensOf(quote).join(' '));
export function reviewChecks(story:GateStory,section:number,review:any) {
    const text=story.sections[section]||'',evidence=review?.evidence;
    const characters=story.canvas.nodes.filter(n=>n.type==='character'&&n.characterId&&story.characterSnapshots.some(c=>c.id===n.characterId));
    const characterIds=new Set(characters.map(n=>n.characterId));
    const plotNodes=story.canvas.nodes.filter(n=>n.type!=='character'&&n.label.trim());
    const nodeIds=new Set((plotNodes.length||story.canvas.edges.length?plotNodes:characters).map(n=>n.id));
    const edgeIds=new Set(story.canvas.edges.map(e=>e.id));
    return {
        intelligible:review?.intelligible===true,
        characterGrounded:review?.characterGrounded===true&&characterIds.has(evidence?.character?.characterId)&&quoteIn(text,evidence?.character?.quote),
        planLinked:review?.planLinked===true&&(nodeIds.has(evidence?.plan?.nodeId)||edgeIds.has(evidence?.plan?.edgeId))&&quoteIn(text,evidence?.plan?.quote),
        sectionFit:review?.sectionFit===true&&quoteIn(text,evidence?.structure?.quote)&&typeof evidence?.structure?.reason==='string'&&evidence.structure.reason.trim().length>0,
        progresses:review?.progresses===true&&quoteIn(text,evidence?.progress?.quote)&&!repeatsEarlier(text,story.sections.slice(0,section)),
    };
}

export function approvedSections(story: Pick<Story,'sections'|'canvas'|'characterSnapshots'>, events: { payload:unknown }[]) {
    return Array.from({length:5},(_,section) => events.some(e => {
        const p = e.payload as {section?:number;hash?:string};
        return !draftBasics(story.sections[section]||'',story.sections.slice(0,section)) && p.section === section && p.hash === gateHash(story,section);
    }));
}
