import assert from 'node:assert/strict'
import {PrismaClient} from '@prisma/client'
const base='http://localhost:3010'
async function login(username,password){const r=await fetch(base+'/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')}
async function request(cookie,path,body){return fetch(base+path,{...(body?{method:'POST',body:JSON.stringify(body)}:{}),headers:{'Content-Type':'application/json',...(cookie?{Cookie:cookie}:{})}})}
const testCookie=await login('LiteVerification','VerifyOnly123321'),tonyCookie=await login('Tony','123321')
assert.equal((await request(null,'/api/data')).status,401)
const test=await(await request(testCookie,'/api/data')).json(),tony=await(await request(tonyCookie,'/api/data')).json()
assert.equal(tony.characters.length,0,'Tony must remain free of demonstration characters')
assert.equal(test.characters.length,1)
assert.equal((await request(tonyCookie,'/api/data',{action:'saveCharacter',character:{...test.characters[0],name:'Not mine'}})).status,404)
assert.equal((await request(testCookie,'/api/research')).status,403)
const story=test.stories.find(s=>s.canvas.nodes.length>=4)
assert.ok(story,'The actual browser canvas must persist')
assert.ok(story.canvas.edges.length>=2,'Accepted and manually created connections must persist')
assert.ok(story.characterSnapshots[0]?.id===test.characters[0].id)
assert.ok(story.sections[0].includes('grey fur'),'Current writing must persist')
const db=new PrismaClient()
try{
 const events=await db.researchEvent.findMany({where:{userId:test.user.id},select:{type:true,payload:true}})
 assert.ok(events.some(e=>e.type==='suggestions_shown'))
 assert.ok(events.some(e=>e.type==='suggestion_accepted'))
 assert.ok(events.some(e=>e.type==='suggestion_rejected'))
 const revisions=await db.revision.count({where:{storyId:story.id}})
 assert.ok(revisions>0)
 console.log(JSON.stringify({pass:true,unauthenticatedAccess:'blocked',crossAccountEdit:'blocked',studentResearchExport:'blocked',TonyDeck:'empty',canvas:{nodes:story.canvas.nodes.length,edges:story.canvas.edges.length},characterSnapshot:true,draftRestored:true,revisions,eventTypes:[...new Set(events.map(e=>e.type))]},null,2))
}finally{await db.$disconnect()}
