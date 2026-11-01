import test from 'node:test';
import assert from 'node:assert/strict';
import {generateBeginnerExplanation,BEGINNER_EXPLAINER_PROMPT_VERSION} from '../scripts/pc-writer/beginner-explainer.mjs';

const input={
 topic:'inflation',score:62.1,stage:'안정',asOfDate:'2026-10-15',
 positiveFactors:['Median CPI','평균 시간당 임금'],negativeFactors:['Core CPI 3M','PPI Final Demand'],
 base:{
  summary:'현재 물가 안정성 점수는 62.1점이며 안정 구간입니다.',
  whyItMatters:'물가가 높으면 연준이 금리를 오래 높게 유지할 가능성이 커집니다.',
  marketMeaning:'물가 안정은 금리에 민감한 자산에 우호적일 수 있지만 주가 방향을 보장하지 않습니다.'
 }
};
function okFetcher(copy){return async(_url,init)=>({ok:true,json:async()=>({response:JSON.stringify(copy),request:JSON.parse(init.body)})});}

test('beginner explainer returns copy only and preserves contract metadata',async()=>{
 const copy={summary:'현재 물가 안정성 점수는 62.1점이며 안정 구간입니다.',whyItMatters:'물가가 높으면 연준이 금리를 오래 높게 유지할 가능성이 커집니다.',marketMeaning:'물가 안정은 금리에 민감한 자산에 우호적일 수 있지만 주가 방향을 보장하지 않습니다.'};
 const out=await generateBeginnerExplanation(input,{fetcher:okFetcher(copy),modelDigest:'sha256:test',now:123});
 assert.equal(out.status,'COPY_ONLY');
 assert.equal(out.score,62.1);
 assert.equal(out.promptVersion,BEGINNER_EXPLAINER_PROMPT_VERSION);
 assert.equal(out.generatedAt,123);
});

test('beginner explainer rejects new numeric claims',async()=>{
 const copy={summary:'현재 점수는 62.1점이고 금리는 5%가 됩니다.',whyItMatters:'물가가 중요합니다.',marketMeaning:'주가 방향을 보장하지 않습니다.'};
 await assert.rejects(()=>generateBeginnerExplanation(input,{fetcher:okFetcher(copy),modelDigest:'sha256:test'}),/BEGINNER_OUTPUT_NEW_NUMBER/);
});

test('beginner explainer rejects investment certainty language',async()=>{
 const copy={summary:'현재 물가 안정성 점수는 62.1점입니다.',whyItMatters:'물가가 중요합니다.',marketMeaning:'이 상태에서는 반드시 상승합니다.'};
 await assert.rejects(()=>generateBeginnerExplanation(input,{fetcher:okFetcher(copy),modelDigest:'sha256:test'}),/BEGINNER_OUTPUT_INVESTMENT_CERTAINTY/);
});

test('beginner explainer requires model digest and known topic',async()=>{
 await assert.rejects(()=>generateBeginnerExplanation(input,{fetcher:okFetcher({})}),/BEGINNER_MODEL_DIGEST_REQUIRED/);
 await assert.rejects(()=>generateBeginnerExplanation({...input,topic:'unknown'},{fetcher:okFetcher({}),modelDigest:'sha256:test'}),/BEGINNER_INPUT_TOPIC_INVALID/);
});

test('beginner explainer source forbids scoring and weight exposure',async()=>{
 let captured;
 const fetcher=async(_url,init)=>{captured=JSON.parse(init.body);return {ok:true,json:async()=>({response:JSON.stringify({summary:'현재 물가 안정성 점수는 62.1점입니다.',whyItMatters:'물가가 중요합니다.',marketMeaning:'주가 방향을 보장하지 않습니다.'})})};};
 await generateBeginnerExplanation(input,{fetcher,modelDigest:'sha256:test'});
 assert.match(captured.system,/Never calculate, rescore, reclassify/);
 assert.match(captured.system,/Never expose model weights or formulas/);
 assert.equal(captured.options.temperature,0);
 assert.equal(captured.model,'gemma3:4b');
});
