import sharp,{type OverlayOptions} from 'sharp';
import {videoAsset} from './video-assets';
import {DRAMA_ACTOR_WIDTH} from './drama';
import {actorImage} from './sprite';
import type {DramaScene,Story} from './types';

/** Same relative width and bottom-center anchors as the Drama stage; words become prompt text. */
export async function dramaVideoReference(story:Story,scene:DramaScene){
    const width=1280,height=880,layers:OverlayOptions[]=[];
    const assets=await Promise.all([videoAsset(scene.backgroundImageUrl),...scene.actors.map(actor=>{
        const character=story.characterSnapshots.find(c=>c.id===actor.characterId);
        if(!character)throw new Error('A character is missing from this scene.');
        return videoAsset(actorImage(character));
    })]);
    for(const [index,actor] of scene.actors.entries()){
        const character=story.characterSnapshots.find(c=>c.id===actor.characterId);
        if(!character)throw new Error('A character is missing from this scene.');
        let image=sharp(assets[index+1]).resize({width:Math.round(width*DRAMA_ACTOR_WIDTH/100*actor.scale)});
        if(actor.flipped)image=image.flop();
        const {data,info}=await image.png().toBuffer({resolveWithObject:true});
        // Clip at the stage edge instead of changing an actor's saved size or position.
        const x=Math.round(actor.x/100*width-info.width/2),y=Math.round(actor.y/100*height-info.height);
        const left=Math.max(0,x),top=Math.max(0,y),cropWidth=Math.min(width,left+info.width+Math.min(0,x))-left,cropHeight=Math.min(height,top+info.height+Math.min(0,y))-top;
        if(cropWidth>0&&cropHeight>0)layers.push({input:await sharp(data).extract({left:Math.max(0,-x),top:Math.max(0,-y),width:cropWidth,height:cropHeight}).png().toBuffer(),left,top});
    }
    return sharp(assets[0]).resize(width,height,{fit:'cover'}).composite(layers).png().toBuffer();
}
