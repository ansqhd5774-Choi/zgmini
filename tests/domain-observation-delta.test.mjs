import {test} from 'node:test';
import assert from 'node:assert/strict';
import {domainObservationDelta as delta} from '../lib/market-score/domain-observation-delta.mjs';
test('compares distinct monthly observations and preserves zero',()=>{
 assert.equal(delta([{label:'2026-07-01',value:10},{label:'2026-08-01',value:0}],0).delta,-10);
 assert.equal(delta([{date:'2026-10-12',score:10},{date:'2026-10-13',score:10}],10).delta,0);
});
test('rejects missing, duplicate conflicts and current vintage mismatch',()=>{
 assert.equal(delta([{label:'2026-07-01',value:null},{label:'2026-08-01',value:10}],10),null);
 assert.equal(delta([{label:'2026-07-01',value:9},{label:'2026-08-01',value:10}],12),null);
 assert.equal(delta([{label:'2026-07-01',value:9},{label:'2026-07-01',value:8},{label:'2026-08-01',value:10}],10),null);
});
test('stored prior-day calculation works when reconstructed trend has a different vintage',()=>{
 assert.equal(delta([{label:'2026-09-01',value:52}],51,{date:'2026-10-13',currentDate:'2026-10-14',score:50}).delta,1);
 assert.equal(delta([],0,{date:'2026-10-13',currentDate:'2026-10-14',score:0}).delta,0);
 assert.equal(delta([],51,{date:'2026-10-14',currentDate:'2026-10-14',score:50}),null);
});
