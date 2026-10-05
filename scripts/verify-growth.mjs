import assert from 'node:assert/strict';
import { explicitValueEvidence, evidenceQualifies, growthProfile } from '../lib/growth.ts';
import { arrangeMapMarkers, freeMapPoint } from '../lib/map-markers.ts';
import { sceneTitle, sceneSettingText } from '../lib/drama.ts';
import { illustrationPrompt } from '../lib/image-prompts.ts';
import { actorImage, hostedPicture } from '../lib/sprite.ts';
import { dramaRevisionHash, groupVideoBeats, missingVideoConfig } from '../lib/video-pipeline.ts';

const ids = text => explicitValueEvidence(text).map(item => item.treeId);
assert.deepEqual(ids('Fia did not tell the truth.'), []);
assert.deepEqual(ids('Fia told the truth about the broken pencil.'), [6]);
assert.deepEqual(ids('Fia never followed the rules.'), []);
assert.deepEqual(ids('Fia followed the rules and waited for her turn.'), [8]);
assert.deepEqual(ids('Fia did not keep trying.'), []);
assert.deepEqual(ids('Fia did not give up. She tried again.'), [1]);
assert.deepEqual(ids('Fia was not proud of my country.'), []);
assert.deepEqual(ids('Fia did not help my mother.'), []);
assert.ok(ids('Fia helped her mother carry the bags.').includes(11));
assert.deepEqual(ids('Honesty is important. I want to help someday.'), []);
assert.deepEqual(ids('“I helped,” said Fia, but she was lying.'), []);
assert.deepEqual(ids('Fox did not laugh. He helped his friend.'), [7]);
assert.deepEqual(ids('If Fia told the truth, everyone would smile.'), []);
assert.deepEqual(ids('Fia will tell the truth tomorrow.'), []);
assert.equal(evidenceQualifies('Fia never helped anyone.', {treeId:7,sentence:'helped anyone.'}), false);
assert.equal(evidenceQualifies('Fia did not tell the truth.', { treeId: 6, sentence: 'Fia did not tell the truth.' }), false);
assert.equal(evidenceQualifies('Fia told the truth about the broken pencil.', { treeId: 6, sentence: 'not in the story' }), false);
assert.equal(evidenceQualifies('Fia told the truth about the broken pencil.', { treeId: 6, sentence: 'Fia told the truth about the broken pencil.' }), true);

const work = { id: 'story-1', title: 'The pencil', content: 'Fia told the truth about the broken pencil.', workType: 'story' };
let profile = { trees: Array.from({ length: 12 }, (_, i) => ({ id: i + 1, stage: 2 })), treeGrowthDetails: {} };
for (let i = 0; i < 5; i++) profile = growthProfile(profile, work, [{ treeId: 6, sentence: work.content, reason: 'She told the truth.' }, { treeId: 6, sentence: 'Fia did not tell the truth.', reason: 'negated' }]);
assert.equal(profile.trees.find(tree => tree.id === 6).stage, 3);
assert.equal(profile.treeGrowthDetails[6].length, 1);

const arranged = arrangeMapMarkers([{ id: 'one', x: 40, y: 40, width: 168, height: 52 }, { id: 'two', x: 40, y: 40, width: 168, height: 52 }], 1000, 700);
assert.equal(arranged[1].anchorX, 40);
assert.equal(arranged[1].anchorY, 40);
assert.ok(arranged[1].x !== arranged[0].x || arranged[1].y !== arranged[0].y);
const spot = freeMapPoint([{ x: 22, y: 32 }]);
assert.ok(Math.hypot(spot.x - 22, spot.y - 32) >= 14);

assert.equal(sceneTitle(0, 'Scene 1'), 'Scene 1');
assert.equal(sceneTitle(0, 'The classroom'), 'Scene 1 — The classroom');
assert.equal(sceneSettingText({ backgroundPrompt: 'A classroom. No people or animals. No text.', settingDescription: 'The classroom is quiet.' }), 'The classroom is quiet.');
assert.ok(!illustrationPrompt('character', 'orange fox', false).toLowerCase().includes('forest'));
assert.ok(illustrationPrompt('object', 'blue bag', false).toLowerCase().includes('object'));
assert.ok(illustrationPrompt('setting', 'forest', false).toLowerCase().includes('no characters'));
assert.equal(hostedPicture('https://v3.fal.media/files/portrait.webp'), true);
assert.equal(hostedPicture('/dramacharacter/Fox Vendor.webp'), false);
assert.equal(hostedPicture('http://v3.fal.media/files/portrait.webp'), false);
assert.equal(actorImage({ spriteUrl: 'https://v3.fal.media/sprite.webp', imageUrl: 'https://v3.fal.media/card.webp' }), 'https://v3.fal.media/sprite.webp');
assert.equal(actorImage({ imageUrl: '/dramacharacter/Fox Vendor.webp' }), '/dramacharacter/Fox Vendor.webp');
assert.ok(missingVideoConfig({}).includes('ARK_API_KEY'));
assert.ok(missingVideoConfig({}).includes('VIDEO_WORKER_URL'));
assert.equal(missingVideoConfig({ ARK_API_KEY: 'k', TOS_ACCESS_KEY_ID: 'a', TOS_SECRET_ACCESS_KEY: 'b', TOS_BUCKET: 'c', TOS_REGION: 'd', TOS_ENDPOINT: 'e', VIDEO_WORKER_URL: 'f', VIDEO_WORKER_SECRET: 'g' }).length, 0);
const beats = [
    { id: 'bg', sceneId: 'one', kind: 'background', text: 'forest', duration: 2 },
    { id: 'line', sceneId: 'one', kind: 'dialogue', text: 'Hello there friend', duration: 20 },
    { id: 'next', sceneId: 'one', kind: 'dialogue', text: 'I will help you carry the bags', duration: 16 },
];
const clips = groupVideoBeats(beats);
assert.equal(clips.length, 2);
assert.equal(clips[0].beats.map(beat => beat.id).join(','), 'bg,line');
assert.equal(clips[1].beats[0].id, 'next');
assert.equal(clips.reduce((sum, clip) => sum + clip.beats.length, 0), beats.length);
assert.equal(groupVideoBeats([{id:'a',sceneId:'one',kind:'dialogue',text:'Hi',duration:4},{id:'b',sceneId:'two',kind:'dialogue',text:'Bye',duration:4}]).length,2);
assert.throws(()=>groupVideoBeats([{id:'a',sceneId:'one',kind:'dialogue',text:'Long',duration:31}]));
const story = { title: 'Forest', characterSnapshots: [{ id: 'fox', name: 'Fox', imageUrl: '/fox.webp', age: '', appearance: '', traits: '', background: '', strength: '', challenge: '', sketch: '' }], canvas: { nodes: [], edges: [], writingType: 'drama', drama: { scenes: [{ id: 'one', name: 'Scene 1', backgroundPrompt: 'forest', backgroundImageUrl: '/bg.webp', notes: '', actors: [], lines: [{ id: 'line', characterId: 'fox', kind: 'dialogue', text: 'Hello' }] }], activeScene: 0 } } };
assert.notEqual(dramaRevisionHash(story, 'model-a'), dramaRevisionHash({ ...story, canvas: { ...story.canvas, drama: { ...story.canvas.drama, scenes: [{ ...story.canvas.drama.scenes[0], lines: [{ ...story.canvas.drama.scenes[0].lines[0], text: 'Goodbye' }] }] } } }, 'model-a'));
console.log('Passed: value polarity, one reward per work, map anchors, scene titles, separate picture prompts, sprites, video clips.');
