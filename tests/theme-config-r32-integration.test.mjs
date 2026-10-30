import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {R32} from '../scripts/pc-writer/theme-platform.mjs';
import {digest,registerDefinition,readRegistered,validateDefinition} from '../scripts/pc-writer/theme-config-registry.mjs';
import {scoreRegistered,readConfiguredSessions} from '../scripts/pc-writer/theme-config-score.mjs';
import {configuredProvisionalCandidate} from '../scripts/pc-writer/theme-config-provisional.mjs';
import {preflightConfiguredPublication} from '../scripts/pc-writer/theme-config-publication-preflight.mjs';
import {publishConfiguredThemeD1,publishPreparedConfiguredThemeD1} from '../scripts/pc-writer/theme-config-publication-d1.mjs';
import {readConfiguredThemes} from '../worker/theme-configured-public.mjs';
const now=Date.parse('2026-10-31T01:00:00Z');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'theme-config-r32-'));t.after(()=>fs.rmSync(root,{recursive:true}));
 const etfs=['AAA','BBB','CCC'];
 const write=(rel,value)=>{const bytes=Buffer.from(JSON.stringify(value)+'\n');const file=path.join(root,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return {path:rel,sha256:digest(bytes)};};
 const selectionEvidence=write('theme-evidence/selection.json',{schema:'ZGMINI_THEME_SELECTION_EVIDENCE_V1',themeId:'fixture-r32',selectionApproved:true,approvalReference:'UNIT_FIXTURE_NOT_PRODUCTION_APPROVAL',rows:etfs.map(ticker=>({ticker,holdingsUrl:'https://issuer.example/holdings',providerLookupVerified:true,operatorGrade:'B'}))});
 const aumEvidence=write('theme-evidence/aum.json',{schema:'ZGMINI_THEME_AUM_EVIDENCE_V1',themeId:'fixture-r32',approvalReference:'UNIT_FIXTURE_NOT_PRODUCTION_APPROVAL',datedOfficialAumApproved:true,rows:etfs.map((ticker,i)=>({ticker,aumUsd:i+1,aumAsOf:'2026-10-28',sourceUrl:'https://issuer.example/aum'}))});
 const definition={schema:'ZGMINI_THEME_CONFIG_V2',id:'fixture-r32',label:'테스트 R32',provider:'getmarkethistory',profile:R32,etfs,benchmark:'SPY',startDate:'2023-01-01',selectionEvidence,aumEvidence,provisionalPolicy:'GMH_CONFIRMED_MARKETPARQUET_PROVISIONAL_R8_OVERLAP_GUARD'};
 registerDefinition({dataRoot:root,definition,legacyRegistry:{themes:[]}});
 const home='themes/registered-fixture-r32',manifest={version:1,themeId:'registered-fixture-r32',files:[]};
 const hour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
 const days=[];for(let n=0;n<1100;n++){const date=new Date(Date.parse('2023-10-27T00:00:00Z')+n*86400000);if(date>new Date('2026-10-29T00:00:00Z'))break;if(![0,6].includes(date.getUTCDay()))days.push(date.toISOString().slice(0,10));}
 for(const [j,symbol] of [...etfs,'SPY'].entries()){
  const data=days.map((date,i)=>JSON.stringify({symbol,timestamp:date+'T'+(hour.format(new Date(date+'T19:00:00Z'))==='15'?'19':'20')+':00:00Z',close:100+i*.04+(j+1)*Math.sin(i/(j+8))})).join('\n')+'\n';
  const sha256=digest(data),rel='raw/'+symbol+'_'+sha256+'.jsonl';
  fs.mkdirSync(path.join(root,home,'raw'),{recursive:true});fs.writeFileSync(path.join(root,home,rel),data);
  manifest.files.push({path:rel,sha256,source:'https://getmarkethistory.com',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',collectedAt:'2026-10-30T10:00:00Z'});
 }
 write(home+'/raw-manifest.json',manifest);
 const registration=readRegistered(root,definition.id),score=scoreRegistered({dataRoot:root,registration});
 const bytes=Buffer.from(JSON.stringify(score,null,2)+'\n');fs.mkdirSync(path.join(root,home,'derived'));fs.writeFileSync(path.join(root,home,'derived/score-'+digest(bytes)+'.json'),bytes);
 write('theme-config/public-approvals/fixture-r32.json',{schema:'ZGMINI_CONFIGURED_PUBLIC_APPROVAL_V1',themeId:definition.id,definitionSha256:registration.sha256,profile:R32,etfs,benchmark:'SPY',selectionReviewed:true,publicationAuthorized:true,derivedOnlyNoRaw:true,rights:{mode:'VERIFIED_DERIVED_PUBLICATION_RIGHTS',termsUrl:'https://getmarkethistory.com/docs/terms',evidenceReference:'UNIT_FIXTURE_ONLY'},approvedAt:'2026-10-30T11:00:00Z',expiresAt:'2026-11-10T00:00:00Z'});
 return {root,definition,score};
}
test('existing registration/scoring uses approved R32 without per-theme code or fixed ETF count',t=>{
 const {definition,score}=fixture(t);assert.equal(score.profile,R32);assert.equal(score.status,'PRIVATE_SCORE_READY');assert.equal(score.history.length,252);
 assert.equal(score.history.at(-1).mode,'NORMALIZED_DATED_OFFICIAL_AUM_THREE_PLUS');
 assert.deepEqual(score.history.at(-1).weightsPercent,{AAA:16.666667,BBB:33.333333,CCC:50});
 const many={...definition,etfs:Array.from({length:1001},(_,i)=>String.fromCharCode(65+Math.floor(i/676),65+Math.floor(i/26)%26,65+i%26))};
 assert.equal(validateDefinition(many).etfs.length,1001);
});
test('common preflight -> existing CAS publisher -> actual Reader contract -> duplicate no-write',async t=>{
 const {root,score}=fixture(t);let row=null,writes=0;
 const query=async(sql,params)=>{
  if(sql.startsWith('SELECT'))return {results:row?[row]:[]};
  assert.ok(sql.startsWith('INSERT'));writes++;row={feed_key:params[0],body:params[1],stored_at:params[2]};return {meta:{changes:1}};
 };
 const preflight=preflightConfiguredPublication({dataRoot:root,id:'fixture-r32',now});
 assert.equal(preflight.status,'PREFLIGHT_PASS_NO_REMOTE_ACCESS');assert.equal(preflight.candidate.history.at(-1).score,score.score);
 const posted=await publishConfiguredThemeD1({dataRoot:root,id:'fixture-r32',query,now});assert.equal(posted.written,1);
 const db={prepare(){return {bind(){return {all:async()=>({results:[row]})};}};}};
 const response=await readConfiguredThemes(db,{now});const body=await response.json();
 assert.equal(body.status,'READY');assert.equal(body.themes[0].methodologyVersion,R32);assert.equal(body.themes[0].score,score.score);
 assert.equal((await publishConfiguredThemeD1({dataRoot:root,id:'fixture-r32',query,now:now+1,expectedStoredAt:now})).written,0);assert.equal(writes,1);
});
test('changed input evidence fails before D1 access',async t=>{
 const {root}=fixture(t);fs.appendFileSync(path.join(root,'theme-evidence/aum.json'),' ');let queries=0;
 await assert.rejects(publishConfiguredThemeD1({dataRoot:root,id:'fixture-r32',now,query:async()=>{queries++;}}));assert.equal(queries,0);
});

test('same common publisher and Reader expose R32 provisional without replacing confirmed history',async t=>{
 const {root,definition}=fixture(t),prepared=preflightConfiguredPublication({dataRoot:root,id:definition.id,now});
 const registration=readRegistered(root,definition.id),{sessions}=readConfiguredSessions({dataRoot:root,registration});
 const anchor=prepared.candidate.observationDate,target='2026-10-30';
 const rows=new Map([anchor,target].map(date=>[date,[...definition.etfs,'SPY'].map(symbol=>({symbol,date,asset_type:'etf',close:sessions.get(symbol).at(-1).close*(date===anchor?1:1.01)}))]));
 const hashes=new Map([[anchor,'a'.repeat(64)],[target,'b'.repeat(64)]]);
 const aum=JSON.parse(fs.readFileSync(path.join(root,definition.aumEvidence.path)));
 const candidate=configuredProvisionalCandidate({definition,sessions,aum,confirmed:prepared.candidate,rows,hashes,sourceStoredAt:'2026-10-30T23:00:00Z'});
 const records=new Map();
 const query=async(sql,p)=>{
  if(sql.startsWith('SELECT'))return {results:records.has(p[0])?[records.get(p[0])]:[]};
  assert.ok(sql.startsWith('INSERT'));records.set(p[0],{feed_key:p[0],body:p[1],stored_at:p[2]});return {meta:{changes:1}};
 };
 await publishConfiguredThemeD1({dataRoot:root,id:definition.id,query,now});
 const feedKey='theme-configured-provisional:'+definition.id;
 const candidateSha256=digest(JSON.stringify(candidate)),pending={...prepared,feedKey,candidateSha256,observationDate:target,sourceStoredAt:candidate.sourceStoredAt,candidate:{...candidate,candidateSha256}};
 assert.equal((await publishPreparedConfiguredThemeD1({preflight:pending,query,now})).written,1);
 const db={prepare(sql){return {bind(cursor){return {all:async()=>({results:[...records.values()].filter(r=>r.feed_key.startsWith(sql.includes("LIKE 'theme-configured-provisional:")?'theme-configured-provisional:':'theme-configured:')&&r.feed_key>cursor).sort((a,b)=>a.feed_key.localeCompare(b.feed_key))})};}};}};
 const body=await (await readConfiguredThemes(db,{now})).json();
 assert.equal(body.themes[0].observationDate,anchor);assert.equal(body.themes[0].history.length,252);
 assert.equal(body.themes[0].provisionalStatus,'READY');assert.equal(body.themes[0].provisional.date,target);
 assert.equal(body.themes[0].provisional.methodologyVersion,R32);
 const changed=new Map(rows);changed.set(anchor,rows.get(anchor).map(r=>({...r,close:r.close*2})));
 assert.throws(()=>configuredProvisionalCandidate({definition,sessions,aum,confirmed:prepared.candidate,rows:changed,hashes,sourceStoredAt:candidate.sourceStoredAt}),/PRICE_MODE_DIFFERENCE/);
});
