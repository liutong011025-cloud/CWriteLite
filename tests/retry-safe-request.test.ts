import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retrySafeRequest } from '../lib/retry-safe-request';

const immediate = async () => {};
test('a draft response lost after saving retries the same draft, then returns the result', async () => {
    const request={action:'saveStory',story:{id:'existing-draft',sections:['unsaved writing']}};
    const received: unknown[]=[];
    const result=await retrySafeRequest('/api/data',request,async()=>{
        received.push(structuredClone(request));
        if(received.length===1)throw new TypeError('Failed to fetch');
        return {saved:true};
    },immediate);
    assert.deepEqual(result,{saved:true}); assert.equal(received.length,2);
    assert.deepEqual(received[0],received[1]);
});
test('login and read operations recover, with at most three attempts', async()=>{
    for(const [path,body] of [['/api/auth',undefined],['/api/data',undefined],['/api/auth',{action:'login'}]] as const){
        let calls=0;
        assert.equal(await retrySafeRequest(path,body,async()=>{if(++calls<3)throw new TypeError('Load failed');return 'ok';},immediate),'ok');
        assert.equal(calls,3);
    }
    let calls=0;
    await assert.rejects(retrySafeRequest('/api/data',undefined,async()=>{calls++;throw new TypeError('fetch failed');},immediate));
    assert.equal(calls,3);
});
test('paid providers, creation, deletion, registration and other writes are never retried',async()=>{
    for(const [path,body] of [['/api/ai',{kind:'image'}],['/api/video',{action:'generate'}],['/api/auth',{action:'register'}],['/api/data',{action:'newStory'}],['/api/data',{action:'deleteStory'}],['/api/data',{action:'saveCharacter'}],['/api/data',{action:'saveStory',story:{}}],['/api/data',{action:'saveStory',story:{id:'draft',status:'published'}}],['/api/data',{action:'saveStory',story:{id:'draft',stage:'drama-finish'}}]] as const){
        let calls=0;
        await assert.rejects(retrySafeRequest(path,body,async()=>{calls++;throw new TypeError('Failed to fetch');},immediate));
        assert.equal(calls,1,path+' '+JSON.stringify(body));
    }
});
test('code errors, cancelled requests and server errors are not mistaken for a network interruption',async()=>{
    for(const error of [new TypeError('invalid story data'),Object.assign(new Error('cancelled'),{name:'AbortError'}),new Error('HTTP 401'),new Error('HTTP 503')]){
        let calls=0;
        await assert.rejects(retrySafeRequest('/api/data',undefined,async()=>{calls++;throw error;},immediate),e=>e===error);
        assert.equal(calls,1);
    }
});
