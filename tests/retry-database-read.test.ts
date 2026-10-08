import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryDatabaseRead } from '../lib/retry-database-read';
const immediate=async()=>{};
test('a closed pooled connection is replaced by another read without disconnecting other users',async()=>{
    let calls=0;
    const result=await retryDatabaseRead(async()=>{if(++calls===1)throw Object.assign(new Error('Server has closed the connection.'),{code:'P1017'});return {user:'same-session',stories:[]};},immediate);
    assert.deepEqual(result,{user:'same-session',stories:[]});assert.equal(calls,2);
});
test('persistent closure is bounded and remains an error',async()=>{
    let calls=0;
    await assert.rejects(retryDatabaseRead(async()=>{calls++;throw Object.assign(new Error('Server has closed the connection.'),{errorCode:'P1017'});},immediate));
    assert.equal(calls,3);
});
test('first-connection failures recover within a bounded, staggered read retry',async()=>{
    for(const code of ['P1001','P1002']){
        let calls=0;const waits:number[]=[];
        const result=await retryDatabaseRead(async()=>{if(++calls<3)throw Object.assign(new Error('First connection failed'),{errorCode:code});return 'authenticated';},async ms=>{waits.push(ms);});
        assert.equal(result,'authenticated');assert.equal(calls,3);
        assert.ok(waits[0]>=700&&waits[0]<1400);assert.ok(waits[1]>=1400&&waits[1]<2100);
        calls=0;await assert.rejects(retryDatabaseRead(async()=>{calls++;throw Object.assign(new Error('Offline'),{code});},immediate));assert.equal(calls,3);
    }
});
test('missing tables, permission errors, exhausted pools and ordinary code errors are not retried',async()=>{
    for(const code of ['P2021','P2002','P2024',undefined]){
        let calls=0;const error=Object.assign(new Error('Permanent or unclassified problem'),{code});
        await assert.rejects(retryDatabaseRead(async()=>{calls++;throw error;},immediate),e=>e===error);
        assert.equal(calls,1);
    }
});
