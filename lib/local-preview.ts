import type {Story,StoryCanvas} from './types';
export const localPreviewEnabled=()=>process.env.NODE_ENV==='development'&&process.env.CWRITE_LOCAL_PREVIEW==='true';
/** Deterministic UI examples only. Never creates a real structure approval or calls a provider. */
export function localPreviewReply(kind:string,input:any,story:Story|null){
    const canvas=(input.canvas||story?.canvas||{nodes:[],edges:[]}) as StoryCanvas;
    const scene=canvas.drama?.scenes.find(s=>s.id===input.selectedNode?.sceneId)||canvas.drama?.scenes[canvas.drama?.activeScene||0];
    const actor=input.selectedNode?.characterId||scene?.actors[0]?.characterId;
    const base={mock:true,preview:true};
    if(kind==='characterTips'||kind==='tips')return {...base,focus:input.focus||'Your next idea',keywords:['carefully','brave','quiet','together','helpful','curious'],frames:['I want to ___','I feel ___ because ___','Then ___ happened'],question:'What does your character want to do?'};
    if(kind==='canvas'){
        const nodes=canvas.nodes.filter(n=>n.type!=='setting');
        return {...base,connections:nodes.length>1?[{source:nodes[0].id,target:nodes[1].id,label:'notices',question:'How could these ideas connect?'}]:[],question:'What could connect your character to another card?'};
    }
    if(kind==='canvasReview'||kind==='dramaReview')return {...base,ready:false,message:'Local preview: look at your ideas and decide what happens next.',suggestions:['What does your character want?','How will the other character respond?']};
    if(kind==='dramaTips')return {...base,suggestions:actor?[{characterId:actor,kind:input.focus==='thought'?'thought':'dialogue',prompt:'Think of one thing this character needs.',keywords:['help','together','carefully'],frame:input.focus==='thought'?'I wonder if ___':'Could you help me ___?'}]:[],question:'What could happen in this scene?'};
    if(kind==='growth')return {...base,evidence:[],growthStatus:'succeeded',message:'Local preview does not award AI growth.'};
    return {...base,message:'Local preview: what does your character want, and what happens next?'};
}
