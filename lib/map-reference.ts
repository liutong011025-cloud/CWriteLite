import {readFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {fal} from '@fal-ai/client';

/** Supply a small style reference to /edit, while keeping the original map untouched. */
export async function mapReference(chapterIndex:number,pin:{x:number;y:number}) {
    const buffer=await readFile(path.join(process.cwd(),'public',chapterIndex?'secondmap.webp':'firstmap.webp'));
    const metadata=await sharp(buffer).metadata();
    if(!metadata.width||!metadata.height)throw new Error('Map reference is unavailable.');
    const size=Math.min(320,metadata.width,metadata.height);
    const left=Math.max(0,Math.min(metadata.width-size,Math.round(metadata.width*pin.x/100-size/2)));
    const top=Math.max(0,Math.min(metadata.height-size,Math.round(metadata.height*pin.y/100-size/2)));
    const cropped=await sharp(buffer).extract({left,top,width:size,height:size}).png().toBuffer();
    return fal.storage.upload(new Blob([new Uint8Array(cropped)],{type:'image/png'}));
}
