import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {hash} from 'bcryptjs';
import {PrismaClient} from '@prisma/client';
import {arrangeMapMarkers} from '../lib/map-markers.ts';

const database=new URL(process.env.DATABASE_URL||'');
assert.equal(database.hostname,'127.0.0.1');
assert.equal(database.port,'54348','Only run against the disposable local preview database.');
const setup=await fetch('http://127.0.0.1:3010/api/local-setup').then(r=>r.json());
assert.equal(setup.preview,true,'A simulated local server must be running.');
const db=new PrismaClient();
const username='map-check-'+randomUUID().slice(0,8),password=randomUUID();
const user=await db.user.create({data:{username,password:await hash(password,4)}});
try {
    const login=await fetch('http://127.0.0.1:3010/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});
    assert.equal(login.status,200);
    const cookie=login.headers.get('set-cookie').split(';')[0];
    async function post(path,body){
        const response=await fetch('http://127.0.0.1:3010'+path,{method:'POST',headers:{'Content-Type':'application/json',cookie},body:JSON.stringify(body)});
        const result=await response.json();assert.ok(response.ok,JSON.stringify(result));return result;
    }
    const story=await db.story.create({data:{userId:user.id,status:'published',stage:'finish',characterIds:[],title:'Saved map test',content:'Fox helped Rabbit.',pin:{x:50,y:46}}});
    const staleMap={activeChapterIndex:0,chapters:[{mapImageUrl:'/firstmap.webp',mapFlags:[],currentPin:null}]};
    const first=await post('/api/map-update',{storyId:story.id});
    assert.equal(first.previewArt.source,'local-preview');
    // A navigation request captured before generation must not erase the new illustration.
    const navigation=await post('/api/data',{action:'saveMap',state:staleMap});
    assert.equal(navigation.mapState.chapters[0].mapFlags[0].previewArt.imageUrl,first.previewArt.imageUrl);
    const second=await post('/api/map-update',{storyId:story.id});
    assert.equal(second.reused,true);
    assert.equal(second.previewArt.version,first.previewArt.version);
    const labels=arrangeMapMarkers([{id:'story',x:500,y:354,width:142,height:44}],1000,800,[{id:'picture',x:500,y:300,width:164,height:164}]);
    const label=labels[0];
    assert.ok(label.y-label.height>=314||label.x+label.width/2<=404||label.x-label.width/2>=596||label.y<=122,'Title must avoid the picture bounds.');
    assert.equal(label.anchorX,500);
    console.log('Passed: real HTTP map generation/cache, stale navigation preserving artwork, compact titles avoiding picture bounds. No provider calls.');
}finally{await db.user.delete({where:{id:user.id}});await db.$disconnect();}
