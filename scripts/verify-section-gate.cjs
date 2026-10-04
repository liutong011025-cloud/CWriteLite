const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = new Map();
function sourceModule(filename) {
  const absolute = path.resolve(filename);
  if (cache.has(absolute)) return cache.get(absolute).exports;
  const mod = { exports: {} }; cache.set(absolute, mod);
  const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = name => name.startsWith('.') ? sourceModule(path.resolve(path.dirname(absolute), name + '.ts')) : require(name);
  new Function('require', 'module', 'exports', compiled)(localRequire, mod, mod.exports);
  return mod.exports;
}
const { draftBasics, gateHash, approvedSections } = sourceModule('lib/section-gate.ts');
const { wrapConnectionLabel, connectionLabelBoxes, validDraggedConnection } = sourceModule('lib/canvas-geometry.ts');
const { editableStory } = sourceModule('lib/story-plan.ts');
const geometryNodes = [{id:'fox',type:'character',x:90,y:90},{id:'pip',type:'character',x:390,y:90},{id:'goal',type:'goal',x:420,y:370}];
const geometryEdges = [{source:'fox',target:'pip',label:'helper for river crossing'}, {source:'pip',target:'goal',label:'knows where the lost letter might have fallen'}, {source:'fox',target:'goal',label:'cleverness could help reach the letter in a dark forest'}];
const boxes = connectionLabelBoxes(geometryNodes, geometryEdges);
for (const box of boxes) assert.ok(box.x >= 8 && box.y >= 8 && box.x + box.width <= 992 && box.y + box.height <= 612, 'Labels stay within the canvas');
for (let a=0;a<boxes.length;a++) for (let b=a+1;b<boxes.length;b++) {
  const x=boxes[a],y=boxes[b];
  assert.ok(x.x+x.width<=y.x || y.x+y.width<=x.x || x.y+x.height<=y.y || y.y+y.height<=x.y, 'Nearby connection labels do not overlap');
}
assert.ok(wrapConnectionLabel('Extraordinarilylongunbrokenconnectionkeyword').every(line=>line.length<=22), 'Unbroken long words wrap');
assert.equal(validDraggedConnection('fox','pip',25),true);
assert.equal(validDraggedConnection('fox','fox',25),false);
assert.equal(validDraggedConnection('fox',null,25),false);
assert.equal(validDraggedConnection('fox','pip',2),false);
const story = { sections: ['Fox live in a forest. He is kind and has a small bag.', '', '', '', ''], characterSnapshots: [{id:'fox', name:'Fox', traits:'kind', appearance:'orange'}], canvas:{nodes:[{id:'fox-node',type:'character',label:'Fox',x:50,y:50},{id:'forest',type:'setting',label:'forest',x:350,y:50}],edges:[]} };
const finished = {...story,id:'finished',status:'published',stage:'finish'};
const revisedFinished = editableStory(finished,{...finished,sections:['Fox found his friend in the forest.', '', '', '', '']});
assert.equal(revisedFinished.status,'draft','A revised finished story can save as a draft');
assert.equal(revisedFinished.stage,'write','Revisions return to writing before another completion check');
assert.equal(editableStory(finished,{...finished,canvas:{...finished.canvas,nodes:finished.canvas.nodes.map(n=>({...n,x:n.x+10}))}}).status,'published','Moving a card does not unpublish the story');
assert.equal(draftBasics(story.sections[0],[]),'', 'Understandable short EFL draft survives basic checks');
assert.ok(draftBasics('hello hello hello hello hello hello hello hello hello hello hello hello',[]), 'Repetition blocked');
assert.ok(draftBasics('Fox is here.',[]), 'Insufficient development blocked');
assert.ok(draftBasics(story.sections[0],[story.sections[0]]), 'Copying earlier section blocked');
const events=[{payload:{section:0,hash:gateHash(story,0)}}];
assert.deepEqual(approvedSections(story,events),[true,false,false,false,false]);
const moved=structuredClone(story); moved.canvas.nodes[0].x=500;
assert.equal(gateHash(moved,0),gateHash(story,0),'Moving cards retains approval');
const changed=structuredClone(story); changed.canvas.nodes[1].label='city';
assert.equal(approvedSections(changed,events)[0],false,'Changed story plan invalidates old approval');
const edited=structuredClone(story); edited.sections[0]+=' A bird flew past.';
assert.equal(approvedSections(edited,events)[0],false,'Revised text needs a fresh check');
console.log('Section gate checks passed: short EFL, repetition, copying, insufficient detail and approval invalidation.');
