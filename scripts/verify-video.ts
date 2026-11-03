import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import ffmpeg from 'ffmpeg-static';
import {renderVideoClip,mergeVideoClips} from '../lib/video-render';
import {videoSubtitles} from '../lib/video-subtitles';
import {createSeedanceTask,readSeedanceTask} from '../lib/ark-video';
import {SEEDANCE_VIDEO_MODEL} from '../lib/ark-video-config';
import {videoAsset} from '../lib/video-assets';
async function main(){
    const words='I will help you carry every bag, then we can walk home together.';
    const beats=[{id:'a',sceneId:'one',characterId:'fox',kind:'dialogue',text:words,duration:4}];
    assert.ok(videoSubtitles(beats,{fox:'Fox'}).includes(words));
    await assert.rejects(()=>videoAsset('https://127.0.0.1/private'));
    await assert.rejects(()=>videoAsset('/../package.json'));
    const originalFetch=globalThis.fetch;process.env.ARK_API_KEY='unit-test-only';
    let submissions=0;
    globalThis.fetch=async(_url,init)=>{
        if(init?.method==='POST'){submissions++;const body=JSON.parse(String(init.body));assert.equal(body.duration,24);assert.equal(body.content[1].role,'first_frame');assert.equal(body.model,SEEDANCE_VIDEO_MODEL);return Response.json({id:'task-test'});}
        return Response.json({status:'succeeded',content:{video_url:'https://example.test/video.mp4'}});
    };
    try{assert.equal(await createSeedanceTask('test','https://example.test/frame.png',24,SEEDANCE_VIDEO_MODEL),'task-test');assert.equal((await readSeedanceTask('task-test')).status,'succeeded');assert.equal(submissions,1);}finally{globalThis.fetch=originalFetch;delete process.env.ARK_API_KEY;}
    assert.ok(ffmpeg);const run=promisify(execFile);
    const dir=await mkdtemp(join(resolve('.tool-cache'),'video-render-test-'));
    await run(ffmpeg!,['-y','-f','lavfi','-i','color=c=green:s=1280x720:r=24','-t','1','-c:v','libx264','raw.mp4'],{cwd:dir});
    await renderVideoClip(dir,'0.mp4',4,beats,{fox:'Fox'},ffmpeg!);
    await renderVideoClip(dir,'1.mp4',4,[{...beats[0],id:'b',kind:'thought',text:'I think my friend needs help.'}],{fox:'Fox'},ffmpeg!);
    assert.ok((await readFile(join(dir,'captions.srt'),'utf8')).includes('Fox thinks: I think my friend needs help.'));
    await mergeVideoClips(dir,2,ffmpeg!);
    assert.ok((await stat(join(dir,'final.mp4'))).size>10000);
    const info=await run(ffmpeg!,['-i','final.mp4','-f','null','-'],{cwd:dir});assert.match(info.stderr,/Duration: 00:00:08/);
    console.log('Passed: provider request mock, full subtitles, private URL rejection, two MP4 clips, padding and merged 8-second video.');
    console.log(`Test MP4: ${join(dir,'final.mp4')}`);
}
void main().catch(error=>{console.error(error);process.exitCode=1;});
