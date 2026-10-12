import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateReferenceFlow} from '../lib/iran-progress/reference-public.mjs';
import {buildReferenceFlow} from '../lib/iran-progress/reference-flow-r1.mjs';
test('public news events require exact rule, source and single-source disclosure',()=>{
 const now=Date.UTC(2026,9,12,12),event={accepted:true,rule:'MARITIME_DISRUPTION',type:'MARITIME',delta:-20,date:'2026-10-12',sourceUrl:'https://www.tasnimnews.ir/en/news/2026/10/12/123/iran-tanker',evidence:'Tanker struck mine',reason:'선박 피해 보도',eventVerified:false,claimVerification:'SINGLE_SOURCE_REPORT'};
 const body={...buildReferenceFlow([event],{asOfDate:'2026-10-12'}),publishedAt:now,collectionCheckedAt:now,events:[event]};
 assert.equal(validateReferenceFlow(body,now),true);
 for(const change of [{delta:-99},{sourceUrl:'https://evil.example/news'},{eventVerified:true},{claimVerification:'VERIFIED'}])assert.equal(validateReferenceFlow({...body,events:[{...event,...change}]},now),false);
});
