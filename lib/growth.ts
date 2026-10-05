type Evidence = { treeId: number; sentence: string; reason?: string };
type Rule = { treeId: number; pattern: RegExp; reason: string; affirmativeNegation?: boolean };

const NEGATION = /\b(?:did not|do not|does not|was not|were not|is not|are not|am not|has not|have not|had not|will not|would not|could not|should not|didn't|doesn't|wasn't|weren't|isn't|aren't|haven't|hasn't|hadn't|won't|wouldn't|couldn't|shouldn't|never)\b/gi;
const RULES: Rule[] = [
    { treeId: 6, pattern: /\b(?:tell|told|tells|telling)\s+the\s+truth\b|\b(?:admit(?:ted)?)\s+(?:my|the|her|his|their|a)\s+(?:mistake|that)\b/i, reason: 'The character tells the truth or admits what happened.' },
    { treeId: 11, pattern: /\b(?:helped|carried|cared for)\b[^.!?\n]{0,50}\b(?:mother|father|parents|grandmother|grandfather|mum|mom|dad)\b/i, reason: 'The character helps or cares for family.' },
    { treeId: 8, pattern: /\b(?:follow(?:ed|s)?|obey(?:ed|s)?)\s+(?:the\s+)?(?:rules|law)\b|\bwait(?:ed|s)?\s+for\s+(?:her|his|their|my|a)\s+turn\b/i, reason: 'The character follows a shared rule.' },
    { treeId: 1, pattern: /\b(?:did not|didn't|never|would not|wouldn't)\s+give\s+up\b/i, reason: 'The character keeps going instead of giving up.', affirmativeNegation: true },
    { treeId: 1, pattern: /\b(?:keep|kept|keeps)\s+try(?:ing)?\b|\btried\s+again\b/i, reason: 'The character continues trying through a difficulty.' },
    { treeId: 4, pattern: /\bproud\s+of\s+(?:my|our|her|his|their)\s+country\b/i, reason: 'The character shows care for their country.' },
    { treeId: 5, pattern: /\b(?:keep|kept|keeps)\s+(?:my|our|the|her|his|their)\s+promise\b/i, reason: 'The character keeps a promise.' },
    { treeId: 2, pattern: /\b(?:listen(?:ed|s)?\s+to|respect(?:ed|s)?)\b/i, reason: 'The character listens to or respects someone else.' },
    { treeId: 3, pattern: /\b(?:take|took|takes|taking)\s+care\s+of\b/i, reason: 'The character takes care of something that is theirs to do.' },
    { treeId: 9, pattern: /\bunderstand(?:s|ed)?\s+how\s+(?:you|she|he|they)\s+feel/i, reason: 'The character notices another person’s feelings.' },
    { treeId: 10, pattern: /\b(?:worked|studied|practised|practiced)\s+hard\b/i, reason: 'The character works carefully and keeps at it.' },
    { treeId: 12, pattern: /\b(?:worked|looked|found|helped)\b[^.!?\n]{0,70}\btogether\b/i, reason: 'The characters do the work together.' },
    { treeId: 7, pattern: /\b(?:helped|returned|gave back)\b/i, reason: 'The character helps someone or gives something back.' },
];

const sentencesOf = (text: string) => text.split(/\n+|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const unrealized = (clause: string) => /\b(?:if|unless|will|shall|might|could|would|should|may|want(?:s|ed)? to|hope(?:s|d)? to|wish(?:es|ed)? to|would like to|going to|someday|one day|tomorrow)\b/i.test(clause);
const sloganOnly = (clause: string) => /\b(?:is|are|was|were)\s+important\b/i.test(clause);
const falseReport = (sentence: string) => /\b(?:lying|lied|a lie|was not true|wasn't true)\b/i.test(sentence);
function negatedAt(clause: string, index: number) {
    NEGATION.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = NEGATION.exec(clause))) if (index >= match.index) return true;
    return false;
}
function ruleMatches(clause: string, rule: Rule) {
    if (unrealized(clause) || sloganOnly(clause)) return false;
    const flags = rule.pattern.flags.includes('g') ? rule.pattern.flags : `${rule.pattern.flags}g`;
    const pattern = new RegExp(rule.pattern.source, flags);
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(clause))) {
        if (rule.affirmativeNegation || !negatedAt(clause, match.index)) return true;
    }
    return false;
}

/** Conservative, completed-action evidence. Negation, wishes, slogans and false reports do not count. */
export function explicitValueEvidence(content: string): Evidence[] {
    const found: Evidence[] = [];
    for (const sentence of sentencesOf(content)) {
        if (falseReport(sentence)) continue;
        for (const part of sentence.split(/\s+\b(?:but|however)\b\s+/i)) {
            for (const rule of RULES) {
                if (found.some(item => item.treeId === rule.treeId)) continue;
                if (!ruleMatches(part, rule)) continue;
                found.push({ treeId: rule.treeId, sentence, reason: rule.reason });
                if (found.length === 2) return found;
            }
        }
    }
    return found;
}

export function evidenceQualifies(content: string, evidence: Evidence) {
    const quote = evidence.sentence?.trim();
    if (!quote || !content.includes(quote)) return false;
    if (!Number.isInteger(evidence.treeId) || evidence.treeId < 1 || evidence.treeId > 12) return false;
    // Validate the enclosing saved sentence, so an extracted quote cannot drop "never" or "if".
    return explicitValueEvidence(content).some(item => item.treeId === evidence.treeId && item.sentence.includes(quote));
}

/** Only the student's saved words can grow a value, and only once per work and value. */
export function growthProfile(profile: any, work: { id: string; title: string; content: string; workType: string }, evidence: Evidence[]) {
    const trees = (profile?.trees || Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 }))).map((t: any) => ({ ...t }));
    const details = { ...(profile?.treeGrowthDetails || {}) };
    for (const item of evidence.filter(entry => evidenceQualifies(work.content, entry)).slice(0, 2)) {
        if ((details[item.treeId] || []).some((record: any) => record.storyId === work.id)) continue;
        const tree = trees.find((entry: any) => entry.id === item.treeId);
        if (tree) tree.stage = Math.min(4, tree.stage + 1);
        details[item.treeId] = [...(details[item.treeId] || []), { storyId: work.id, workTitle: work.title, workType: work.workType, excerpt: item.sentence, triggerSentence: item.sentence, reason: String(item.reason || '').slice(0, 800), timestamp: Date.now() }];
    }
    return { ...profile, trees, treeGrowthDetails: details };
}
