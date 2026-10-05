import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {videoSubtitles} from './video-subtitles';
import type {VideoBeat} from './video-pipeline';
const run=promisify(execFile);
export async function renderVideoClip(dir:string,output:string,duration:number,beats:VideoBeat[],names:Record<string,string>,ffmpeg='ffmpeg'){
    const subtitles=videoSubtitles(beats,names);await writeFile(join(dir,'captions.srt'),subtitles,'utf8');
    const filter=`scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=24,tpad=stop_mode=clone:stop_duration=${duration}${subtitles?",subtitles=captions.srt:force_style='FontName=DejaVu Sans,FontSize=24,Outline=2,MarginV=28'":''}`;
    await run(ffmpeg,['-y','-i','raw.mp4','-vf',filter,'-t',String(duration),'-an','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',output],{cwd:dir,timeout:240000,maxBuffer:1024*1024});
}
export async function mergeVideoClips(dir:string,count:number,ffmpeg='ffmpeg'){
    await writeFile(join(dir,'clips.txt'),Array.from({length:count},(_,i)=>`file '${i}.mp4'`).join('\n'));
    await run(ffmpeg,['-y','-f','concat','-safe','1','-i','clips.txt','-c','copy','-movflags','+faststart','final.mp4'],{cwd:dir,timeout:240000,maxBuffer:1024*1024});
}
