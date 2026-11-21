import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {registerDefinition,readRegistered,digest} from '../scripts/pc-writer/theme-config-registry.mjs';
import {scoreRegistered} from '../scripts/pc-writer/theme-config-score.mjs';
import {preflightConfiguredPublication} from '../scripts/pc-writer/theme-config-publication-preflight.mjs';
const definition={schema:'ZGMINI_THEME_CONFIG_V1',id:'fixture-public',label:'공개 검증 fixture',provider:'getmarkethistory',profile:'ADAPTIVE_R2_PAIR_R3',etfs:['AAA','BBB'],benchmark:'SPY',startDate:'2022-01-01'};
function setup(t,{approved=true}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zg-config-public-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 registerDefinition({dataRoot:root,definition,legacyRegistry:{themes:[]}});
 const r=readRegistered(root,definition.id),home=path.join(root,'themes',r.internalId),raw=path.join(home,'raw');fs.mkdirSync(raw,{recursive:true});
 const nyHour=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'}),dates=[];
 for(let d=new Date('2022-01-03T20:00:00Z');dates.length<1000;d=new Date(+d+86400000))if(![0,6].includes(d.getUTCDay()))dates.push(new Date(+d-(Number(nyHour.format(d))-15)*3600000).toISOString());
 const observationDate=dates.at(-1).slice(0,10),sourceStoredAt=observationDate+'T23:00:00Z',now=Date.parse(observationDate+'T23:30:00Z'),files=[];
 for(const [j,symbol] of ['AAA','BBB','SPY'].entries()){
  const rows=dates.map((timestamp,i)=>({symbol,timestamp,close:100*Math.exp(.0003*i+.02*Math.sin(i/(9+j*4))),is_gap:false}));
  const body=rows.map(JSON.stringify).join('\n')+'\n',sha=digest(body),name=symbol+'_'+sha+'.jsonl';fs.writeFileSync(path.join(raw,name),body);
  files.push({path:'raw/'+name,sha256:sha,source:'https://getmarkethistory.com',priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',collectedAt:sourceStoredAt,observationThrough:observationDate});
 }
 fs.writeFileSync(path.join(home,'raw-manifest.json'),JSON.stringify({version:1,themeId:r.internalId,files}));
 const score=scoreRegistered({dataRoot:root,registration:r}),bytes=Buffer.from(JSON.stringify(score,null,2)+'\n'),sha=digest(bytes),derived=path.join(home,'derived');fs.mkdirSync(derived);
 const candidateFile=path.join(derived,'score-'+sha+'.json');fs.writeFileSync(candidateFile,bytes);
 const approval={schema:'ZGMINI_CONFIGURED_PUBLIC_APPROVAL_V1',themeId:definition.id,definitionSha256:r.sha256,profile:definition.profile,etfs:definition.etfs,benchmark:'SPY',selectionReviewed:true,publicationAuthorized:true,derivedOnlyNoRaw:true,
  rights:{mode:'VERIFIED_DERIVED_PUBLICATION_RIGHTS',termsUrl:'https://getmarkethistory.com/docs/terms',evidenceReference:'TEST_FIXTURE_ATTESTATION_NOT_REAL_APPROVAL'},approvedAt:new Date(now-3600000).toISOString(),expiresAt:new Date(now+86400000).toISOString()};
 const dir=path.join(root,'theme-config','public-approvals');fs.mkdirSync(dir);const approvalFile=path.join(dir,definition.id+'.json');if(approved)fs.writeFileSync(approvalFile,JSON.stringify(approval));
 return {root,r,home,now,approval,approvalFile,candidateFile};
}
const run=f=>preflightConfiguredPublication({dataRoot:f.root,id:definition.id,now:f.now});
const hashes=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(root,file),digest(fs.readFileSync(file))];}));
test('offline preflight replays saved scores, matches exact approval and leaves all files unchanged',t=>{
 const f=setup(t),before=hashes(f.root),result=run(f);assert.equal(result.status,'PREFLIGHT_PASS_NO_REMOTE_ACCESS');
 assert.equal(result.d1Queries,0);assert.equal(result.d1Writes,0);assert.equal(result.providerCalls,0);assert.equal(result.publicationExecuted,false);
 assert.equal(result.feedKey,'theme-configured:'+definition.id);assert.equal(result.candidate.history.length,252);
 assert.equal(result.candidate.candidateSha256,digest(fs.readFileSync(f.candidateFile)));assert.deepEqual(hashes(f.root),before);
 assert.equal(JSON.stringify(result.candidate).includes('"close"'),false);
});
test('registration and tests never grant public authorization',t=>{
 const f=setup(t,{approved:false}),before=hashes(f.root),result=run(f);
 assert.equal(result.reason,'PUBLIC_APPROVAL_MISSING');assert.equal(result.candidate,undefined);assert.deepEqual(hashes(f.root),before);
});
test('approval cannot be reused for another configuration or hidden changed ETF list',t=>{
 const f=setup(t);for(const changes of [{definitionSha256:'b'.repeat(64)},{etfs:['BBB','AAA']},{profile:'OTHER'},{publicationAuthorized:false}]){
  fs.writeFileSync(f.approvalFile,JSON.stringify({...f.approval,...changes}));const result=run(f);assert.equal(result.status,'PREFLIGHT_BLOCKED');assert.equal(result.candidate,undefined);
 }
});
test('stale, future and unsupported anonymous approval are rejected',t=>{
 const f=setup(t);for(const changes of [{expiresAt:new Date(f.now-1).toISOString()},{approvedAt:new Date(f.now+1).toISOString()},{rights:{...f.approval.rights,mode:'UNVERIFIED_ANONYMOUS'}}]){
  fs.writeFileSync(f.approvalFile,JSON.stringify({...f.approval,...changes}));assert.equal(run(f).status,'PREFLIGHT_BLOCKED');
 }
});
test('a changed stored candidate or raw byte cannot pass replay',t=>{
 const f=setup(t);fs.appendFileSync(f.candidateFile,' ');assert.equal(run(f).reason,'PUBLIC_STORED_SCORE_SHA');
 const raw=path.join(f.home,'raw');fs.appendFileSync(path.join(raw,fs.readdirSync(raw)[0]),' ');assert.equal(run(f).reason,'CONFIG_RAW_SHA');
});
test('source aging blocks only this publication and does not refresh original checkpoints',t=>{
 const f=setup(t),before=hashes(f.root),result=preflightConfiguredPublication({dataRoot:f.root,id:definition.id,now:f.now+9*86400000});
 assert.equal(result.reason,'PUBLIC_SOURCE_STALE');assert.deepEqual(hashes(f.root),before);
});
