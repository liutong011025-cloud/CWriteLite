import assert from 'node:assert/strict';
import { test } from 'node:test';
import { retryPageImport } from '../lib/retry-page-import';

test('a temporary map chunk interruption recovers without reloading the page', async () => {
    let calls=0;
    const map={default:()=>null};
    assert.equal(await retryPageImport(async()=>{if(++calls===1)throw Object.assign(new Error('Loading chunk 815 failed.'),{name:'ChunkLoadError'});return map;}),map);
    assert.equal(calls,2);
});
test('persistent network failure stops after three attempts and can be attempted afresh', async () => {
    let calls=0,online=false;
    const load=async()=>{calls++;if(!online)throw new Error('Failed to fetch dynamically imported module');return 'drama';};
    await assert.rejects(retryPageImport(load),/Failed to fetch/);
    assert.equal(calls,3);
    online=true;
    assert.equal(await retryPageImport(load),'drama');
});
test('a component code error is surfaced immediately rather than retried as a network error', async () => {
    let calls=0;
    await assert.rejects(retryPageImport(async()=>{calls++;throw new TypeError('invalid scene data');}),/invalid scene/);
    assert.equal(calls,1);
});
