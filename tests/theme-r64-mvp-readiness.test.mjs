import test from 'node:test';
import assert from 'node:assert/strict';
import {buildR64MvpReadiness} from '../lib/market-score/theme-r64-mvp-readiness.mjs';
const pairs=[['사이버보안','CIBR','BUG'],['AI 신약개발','GNOM','ARKG'],['원전·SMR','NLR','URA'],['로봇·자동화','BOTZ','ROBO'],['AI 반도체','SMH','SOXX'],['자율주행','DRIV','BOTZ'],['클라우드·SaaS','SKYY','CLOU'],['바이오테크','IBB','GNOM'],['게임·e스포츠','HERO','ESPO'],['핀테크','FINX','ARKF'],['방산','ITA','SHLD'],['블록체인·디지털자산','BLOK','ARKF']];
const levels={CIBR:50,BUG:54.21,GNOM:50,ARKG:54.33,NLR:50,URA:55.3,BOTZ:50,ROBO:56.79,SMH:50,SOXX:59.19,DRIV:62.02,SKYY:50,CLOU:62.14,IBB:63.12,HERO:50,ESPO:64.33,FINX:44.88,ARKF:20,ITA:50,SHLD:82.78,BLOK:86.96};
function fixture(){
 const funds=Object.fromEntries(Object.entries(levels).map(([ticker,trend])=>[ticker,{matches:1,review:'UNIQUE_R21_TICKER_OBJECT',items:[{metrics:{history252Ready:true,eligiblePriceBars:1202,reference756Verified:false,breadthScored:false,demandScored:false,researchAxisScores:{trend,relativeStrength:50,volatility:50}}}]}]));
 return {audit:'R53_R21_12_THEME_EXISTING_RESEARCH_EVIDENCE',source:{verified:true,sha256:'03612f0bc4a1b6ce2cd62f2706142c1aac8a08a1c84f610afdcc8bf6dca2b880',observationTarget:'2026-10-16'},topLevel:{metrics:{status:'THREE_APPROVED_R3_PRICE_AXES_RESEARCH_ONLY',fundsWith252ActuallyScoredResearchAxes:30,stockBreadthActualScores:0,stockDemandActualScores:0,reference756StillRequiresUpstreamProof:true}},policy:{fiveAxisCompositeComputed:false,pricePublicationAuthorized:false,dbOrDeploymentModified:false},verdict:'READ_ONLY_SHADOW_EVIDENCE_ONLY',funds,themes:pairs.map(([theme,a,b])=>({theme,etfs:[a,b],r21PriceHistoryClaim:'RESEARCH_252_CLAIM_BOTH',fiveAxisStatus:'NOT_VERIFIED',rights:'NOT_VERIFIED'}))};
}
test('twelve candidates and 21 unique ETFs remain research-only',()=>{
 const r=buildR64MvpReadiness({r53:fixture()});assert.equal(r.themeCandidates,12);assert.equal(r.uniqueEtfs,21);
 assert.equal(r.validatedFiveAxisScores,0);assert.equal(r.publishedThemes,0);
 assert.ok(r.items.every(x=>x.publishedScore===null&&x.validatedFiveAxisScore===null));
});
test('R22 ETF gap ordering is unchanged',()=>{
 const r=buildR64MvpReadiness({r53:fixture()});
 assert.deepEqual(r.items.map(x=>x.maxInterEtfPriceAxisGap),[4.21,4.33,5.3,6.79,9.19,12.02,12.14,13.12,14.33,24.88,32.78,66.96]);
});
test('falsified source SHA is rejected',()=>{
 const a=fixture();a.source.sha256='changed';assert.throws(()=>buildR64MvpReadiness({r53:a}),/R53_SOURCE/);
});
test('missing 252 points and fake breadth are not zero-filled',()=>{
 const a=fixture();a.funds.CIBR.items[0].metrics.history252Ready=false;
 assert.throws(()=>buildR64MvpReadiness({r53:a}),/FUND_AXES/);
 const b=fixture();b.funds.BUG.items[0].metrics.breadthScored=true;
 assert.throws(()=>buildR64MvpReadiness({r53:b}),/FUND_AXES/);
});
test('unapproved ETF gap changes are rejected',()=>{
 const a=fixture();a.funds.BUG.items[0].metrics.researchAxisScores.trend=60;
 assert.throws(()=>buildR64MvpReadiness({r53:a}),/R22_GAP_DRIFT/);
});
test('partial cyber evidence never becomes ready',()=>{
 assert.throws(()=>buildR64MvpReadiness({r53:fixture(),r57:{}}),/INCOMPLETE_CYBER_PROVENANCE/);
});
test('production/publication claims are rejected',()=>{
 const a=fixture();a.policy.pricePublicationAuthorized=true;
 assert.throws(()=>buildR64MvpReadiness({r53:a}),/R53_PUBLISH_POLICY/);
});
