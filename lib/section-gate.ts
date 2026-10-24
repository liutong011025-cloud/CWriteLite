import { createHash } from 'node:crypto';
import type { Story } from './types';
import { sectionSignature } from './story-plan';

export const GATE_VERSION = 3;
const versionHash = (story: Pick<Story,'sections'|'canvas'|'characterSnapshots'>, section:number, version:number) => createHash('sha256').update(`${version}:`+sectionSignature(story, section)).digest('hex');
export const gateHash = (story: Pick<Story,'sections'|'canvas'|'characterSnapshots'>, section:number) => versionHash(story, section, GATE_VERSION);
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

export function draftBasics(text: string, _previous: string[] = []) {
    if (!text.trim()) return 'Write your idea for this part. A short sentence is welcome.';
    const tokens = text.toLowerCase().match(/\p{L}+(?:['’]\p{L}+)?/gu) || [];
    if (!tokens.length) return 'Tell us your idea using words so we can understand it.';
    // No length or vocabulary-diversity requirement. Only obvious filler is blocked locally.
    const repeatedLetters = tokens.every(token => /^(\p{L})\1{5,}$/u.test(token));
    if (repeatedLetters) return 'Tell us what you mean instead of repeating the same letters.';
    return '';
}

type GateStory = Pick<Story,'sections'|'canvas'|'characterSnapshots'>;
const normalizeQuote = (text:string) => text.toLowerCase().replace(/\s+/g,' ').trim();
const quoteIn = (text:string,quote:unknown) => typeof quote==='string' && /\p{L}/u.test(quote) && normalizeQuote(text).includes(normalizeQuote(quote));
export function reviewChecks(story:GateStory,section:number,review:any) {
    const text=story.sections[section]||'';
    // Stage fit, plot development and canvas detail are optional coaching, not pass criteria.
    // A model cannot block a student using invented or missing quotations.
    const groundedIssue=quoteIn(text,review?.quote);
    return {
        intelligible:review?.blockingIssue === undefined ? review?.intelligible === true : !(review?.blockingIssue==='unintelligible' && groundedIssue),
        onTopic:!(review?.blockingIssue==='unrelated' && groundedIssue),
    };
}

export function approvedSections(story: Pick<Story,'sections'|'canvas'|'characterSnapshots'>, events: { payload:unknown }[]) {
    return Array.from({length:5},(_,section) => events.some(e => {
        const p = e.payload as {section?:number;hash?:string};
        // Previously passed, unchanged writing remains passed under the more lenient policy.
        return !draftBasics(story.sections[section]||'') && p.section === section && (p.hash === gateHash(story,section) || p.hash === versionHash(story,section,2));
    }));
}
