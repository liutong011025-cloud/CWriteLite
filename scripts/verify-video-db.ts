import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../lib/prisma';
import {claimAsset,finishAsset} from '../lib/asset-generation';
async function main(){
    const db=new URL(process.env.DATABASE_URL||'');assert.equal(db.hostname,'127.0.0.1');assert.equal(db.port,'54348','Run only against the disposable verification database.');
    const token=randomUUID();
    const claims=await Promise.all(Array.from({length:12},()=>claimAsset('test:'+token)));
    assert.equal(claims.filter(c=>c.claimed).length,1);
    await finishAsset('test:'+token,'https://example.test/result.png');
    assert.deepEqual(await claimAsset('test:'+token),{claimed:false,imageUrl:'https://example.test/result.png'});
    const user=await prisma.user.create({data:{username:'video-test-'+token,password:'test-only-unused'}});
    const story=await prisma.story.create({data:{userId:user.id,characterIds:[]}});
    const results=await Promise.allSettled(Array.from({length:10},()=>prisma.videoJob.create({data:{userId:user.id,storyId:story.id,revisionHash:'test',model:'mock',plan:{},clips:{create:{sceneId:'one',sequence:0,duration:4}}}})));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    const job=await prisma.videoJob.findUniqueOrThrow({where:{storyId_revisionHash:{storyId:story.id,revisionHash:'test'}}});
    const leases=await Promise.all(Array.from({length:10},()=>prisma.videoJob.updateMany({where:{id:job.id,leaseUntil:null},data:{leaseUntil:new Date(Date.now()+60000)}})));
    assert.equal(leases.reduce((n,r)=>n+r.count,0),1);
    console.log('Passed: 12 concurrent asset requests → one paid-call claim; 10 video requests → one job; 10 worker claims → one lease.');
}
void main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
