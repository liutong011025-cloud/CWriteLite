type Evidence={treeId:number;sentence:string;reason?:string};
/** Conservative fallback when the text service is unavailable; never infer from portraits/traits. */
export function explicitValueEvidence(content:string):Evidence[] {
    const rules:[number,RegExp,string][]=[
        [7,/\b(?:can|may|let)\s+(?:i|me)\s+help\b|\bhelp(?:ing)?\s+(?:a|my|our|your)\s+friend\b/i,'The character offers to help someone.'],
        [12,/\b(?:work(?:ed|ing)?|look(?:ed|ing)?|find|found|help(?:ed|ing)?)\b[^.!?\n]{0,70}\btogether\b/i,'The characters act together to help each other.'],
        [1,/\b(?:keep|kept)\s+try(?:ing)?\b|\b(?:did not|never|won.t)\s+give\s+up\b/i,'The character continues trying through a difficulty.'],
        [2,/\b(?:listen(?:ed)?\s+to|respect(?:ed)?\s+(?:others|your|their|my))\b/i,'The character listens to or respects someone else.'],
        [3,/\b(?:take|took|taking)\s+care\s+of\b|\b(?:my|our)\s+responsibility\b/i,'The character takes responsibility for something.'],
        [4,/\bproud\s+of\s+(?:my|our)\s+country\b/i,'The character expresses care for their country.'],
        [5,/\b(?:keep|kept)\s+(?:my|our|the)\s+promise\b/i,'The character keeps a promise.'],
        [6,/\b(?:tell|told|telling)\s+the\s+truth\b|\b(?:admit|admitted)\s+(?:my|the)\s+mistake\b/i,'The character tells the truth or admits a mistake.'],
        [8,/\b(?:follow|followed|obey|obeyed)\s+(?:the\s+)?(?:rules|law)\b/i,'The character follows a shared rule.'],
        [9,/\bi\s+understand\s+how\s+you\s+feel\b/i,'The character acknowledges another person’s feelings.'],
        [10,/\b(?:worked|studied|practised|practiced)\s+hard\b/i,'The character works carefully and persistently.'],
        [11,/\b(?:help|helped|care\s+for)\s+(?:my|our)\s+(?:mother|father|parents|grandmother|grandfather)\b/i,'The character helps or cares for their family.'],
    ];
    const lines=content.split(/\n/).map(s=>s.trim()).filter(Boolean);
    return rules.flatMap(([treeId,pattern,reason])=>{const sentence=lines.find(s=>pattern.test(s));return sentence?[{treeId,sentence,reason}]:[];}).slice(0,2);
}
/** Only the student's saved, published words can grow a value; once per work/value. */
export function growthProfile(profile: any, work:{id:string;title:string;content:string;workType:string}, evidence:Evidence[]) {
    const trees=(profile?.trees||Array.from({length:12},(_,i)=>({id:i+1,stage:2}))).map((t:any)=>({...t}));
    const details={...(profile?.treeGrowthDetails||{})};
    for(const e of evidence.slice(0,2)) {
        if(!Number.isInteger(e.treeId)||e.treeId<1||e.treeId>12||!e.sentence?.trim()||!work.content.includes(e.sentence))continue;
        if((details[e.treeId]||[]).some((r:any)=>r.storyId===work.id))continue;
        const tree=trees.find((t:any)=>t.id===e.treeId);if(tree)tree.stage=Math.min(4,tree.stage+1);
        details[e.treeId]=[...(details[e.treeId]||[]),{storyId:work.id,workTitle:work.title,workType:work.workType,excerpt:e.sentence,triggerSentence:e.sentence,reason:String(e.reason||'').slice(0,800),timestamp:Date.now()}];
    }
    return {...profile,trees,treeGrowthDetails:details};
}
