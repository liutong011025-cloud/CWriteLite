import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hash} from 'bcryptjs';
import {PrismaClient} from '@prisma/client';

const database=new URL(process.env.DATABASE_URL||'');
assert.equal(database.hostname,'127.0.0.1');assert.equal(database.port,'54348');
assert.equal((await fetch('http://127.0.0.1:3010/api/local-setup').then(r=>r.json())).preview,true);
const db=new PrismaClient(),password=randomUUID();
const owner=await db.user.create({data:{username:'delcheck'+randomUUID().slice(0,8),password:await hash(password,4)}});
const stranger=await db.user.create({data:{username:'delother'+randomUUID().slice(0,8),password:await hash(password,4)}});
try{
    const card=await db.character.create({data:{userId:owner.id,name:'oo',species:'dog',imageUrl:'/dramacharacter/Fox Vendor.webp'}});
    const otherCard=await db.character.create({data:{userId:stranger.id,name:'Private card'}});
    const scene={id:'scene',name:'EdUHK',backgroundPrompt:'EdUHK campus',backgroundImageUrl:'/storybook-forest.webp',notes:'',actors:[{characterId:card.id,x:40,y:90,scale:1,flipped:false}],lines:[{id:'hello',characterId:card.id,kind:'dialogue',text:'Hi Tony, nice ride.'}]};
    const story=await db.story.create({data:{userId:owner.id,title:'Our campus',stage:'drama-write',characterIds:[card.id],characterSnapshots:[card],canvas:{writingType:'drama',drama:{mode:'tableau',activeScene:0,scenes:[scene]}}}});
    const login=await fetch('http://127.0.0.1:3010/api/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({username:owner.username,password})});
    assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
    async function post(body){const r=await fetch('http://127.0.0.1:3010/api/data',{method:'POST',headers:{'content-type':'application/json',cookie},body:JSON.stringify(body)});assert.ok(r.ok,await r.clone().text());return r.json();}
    await post({action:'deleteCharacter',id:otherCard.id});assert.ok(await db.character.findUnique({where:{id:otherCard.id}}));
    await post({action:'deleteCharacter',id:card.id});assert.equal(await db.character.findUnique({where:{id:card.id}}),null);
    const saved=await post({action:'saveStory',story:{...story,characterSnapshots:[]}});
    assert.equal(saved.story.characterSnapshots[0].name,'oo');assert.equal(saved.story.canvas.drama.scenes[0].actors[0].characterId,card.id);
    assert.equal(saved.story.canvas.drama.scenes[0].lines[0].text,'Hi Tony, nice ride.');
    console.log('Passed: real owner-scoped character deletion, another user protected, saved drama cast and dialogue preserved after another save. Disposable local data only.');
}finally{await db.user.deleteMany({where:{id:{in:[owner.id,stranger.id]}}});await db.$disconnect();}
