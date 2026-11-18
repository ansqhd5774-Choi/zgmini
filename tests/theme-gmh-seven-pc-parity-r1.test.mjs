import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {GMH_SEVEN_SYMBOLS} from '../scripts/pc-writer/theme-gmh-seven-private-bridge.mjs';
import {DATA_SCHEMA,HOME} from '../scripts/pc-writer/theme-seven-gmh-history-r1.mjs';
import {compareSavedGmhSeven}
 from '../scripts/pc-writer/theme-gmh-seven-pc-parity-r1.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const nyHour=new Intl.DateTimeFormat('en-US',{
 timeZone:'America/New_York',hour:'2-digit',hourCycle:'h23'});
const days=[];
for(let d=new Date('2022-01-03T00:00:00Z');days.length<628;
 d=new Date(d.getTime()+86_400_000)){
 if(d.getUTCDay()!==0&&d.getUTCDay()!==6)days.push(d.toISOString().slice(0,10));
}
function hour(day){
 for(const h of ['19','20']){
  const t=day+'T'+h+':00:00Z';
  if(nyHour.format(new Date(t))==='15')return t;
 }
 throw Error('NY_HOUR_FIXTURE');
}
const stamp='2024-06-01T00:00:00Z';
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'zgmini-w03-real-pc-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,...HOME.split('/'));
 const raw=path.join(home,'raw'),state=path.join(home,'state');
 fs.mkdirSync(raw,{recursive:true});
 fs.mkdirSync(state,{recursive:true});
 const manifest={schema:DATA_SCHEMA,version:1,start:days[0],end:days.at(-1),files:[]};
 const cp={schema:DATA_SCHEMA,version:1,start:days[0],end:days.at(-1),symbols:{}};
 for(const [offset,symbol] of GMH_SEVEN_SYMBOLS.entries()){
  const content=days.map((day,i)=>JSON.stringify({
   symbol,timestamp:hour(day),
   close:Number((120+i*.11+offset*2+Math.sin(i/19+offset)).toFixed(6)),
   is_gap:false})).join('\n')+'\n';
  const bytes=Buffer.from(content),digest=sha(bytes);
  const file=symbol+'_'+digest+'.jsonl',rel='raw/'+file;
  fs.writeFileSync(path.join(raw,file),bytes);
  manifest.files.push({path:rel,sha256:digest,symbol,
   source:'GETMARKETHISTORY_FREE_1H',
   priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',
   observationFrom:days[0],observationThrough:days.at(-1),
   rowCount:628});
  cp.symbols[symbol]={complete:true,cursor:null,pages:1,
   files:[{path:rel,sha256:digest}]};
 }
 const window=sha(DATA_SCHEMA+':'+manifest.start+':'+manifest.end).slice(0,16);
 const manifestFile=path.join(home,'raw-manifest.json');
 const stateFile=path.join(state,'manual-'+window+'.json');
 fs.writeFileSync(manifestFile,JSON.stringify(manifest));
 fs.writeFileSync(stateFile,JSON.stringify(cp));
 return {root,home,manifestFile,stateFile,manifest};
}
test('real PC on-disk manifest, checkpoint and 14 GMH pages yield exact 1764-point parity and immutable private storage',t=>{
 const {root,home,manifestFile,stateFile}=fixture(t);
 const result=compareSavedGmhSeven({dataRoot:root,asOf:stamp,save:true});
 assert.equal(result.status,'PRIVATE_GMH_7X252_PARITY_VERIFIED_NOT_PUBLISHED');
 assert.equal(result.historyPoints,1764);
 assert.equal(result.rawPagesVerified,14);
 assert.equal(result.commonSessionCount,628);
 assert.equal(result.providerCalls,0);
 assert.equal(result.d1Writes,0);
 assert.equal(result.publicWrites,0);
 assert.equal(result.schedulerWrites,0);
 assert.equal(result.publicationAuthorized,false);
 assert.equal(result.upstreamCommercialRightsVerified,false);
 assert.equal(result.derivedLicenseVerified,false);
 assert.equal(result.localSaved,true);
 assert.equal(result.rawManifestSha256,sha(fs.readFileSync(manifestFile)));
 assert.equal(result.checkpointSha256,sha(fs.readFileSync(stateFile)));
 const files=fs.readdirSync(path.join(home,'derived')).filter(x=>x.endsWith('.json'));
 assert.equal(files.length,1);
 const stored=fs.readFileSync(path.join(home,'derived',files[0]));
 assert.equal(sha(stored),result.privateArtifactSha256);
 const again=compareSavedGmhSeven({dataRoot:root,asOf:stamp,save:true});
 assert.equal(again.privateArtifactSha256,result.privateArtifactSha256);
 assert.equal(fs.readdirSync(path.join(home,'derived')).length,1);
 assert.doesNotMatch(JSON.stringify(result),/"(?:close|timestamp|rawBars|rawPrices|volume)"/);
});
test('tampered stored raw page cannot compute or create derived artifacts',t=>{
 const {root,home,manifest}=fixture(t);
 const file=path.join(home,...manifest.files[0].path.split('/'));
 fs.appendFileSync(file,'{"symbol":"SPY"}\n');
 assert.throws(()=>compareSavedGmhSeven({dataRoot:root,asOf:stamp,save:true}),
  {code:'W03_SAVED_SAVED_PAGE_SHA_OR_IDENTITY'});
 assert.equal(fs.existsSync(path.join(home,'derived')),false);
});
test('checkpoint incomplete or missing prevents write and missing window does not invent a new one',t=>{
 const {root,home,stateFile}=fixture(t);
 const cp=JSON.parse(fs.readFileSync(stateFile));
 cp.symbols.SPY.complete=false;
 fs.writeFileSync(stateFile,JSON.stringify(cp));
 assert.throws(()=>compareSavedGmhSeven({dataRoot:root,asOf:stamp,save:true}),
  {code:'W03_SAVED_CHECKPOINT_NOT_COMPLETE'});
 fs.unlinkSync(stateFile);
 assert.throws(()=>compareSavedGmhSeven({dataRoot:root,asOf:stamp,save:true}));
 assert.equal(fs.existsSync(path.join(home,'derived')),false);
});
test('non-GMH provenance, wrong path and untrusted price fields are rejected',t=>{
 const {root,manifestFile}=fixture(t);
 const m=JSON.parse(fs.readFileSync(manifestFile));
 m.files[0].source='MARKETPARQUET_FREE_SAMPLE';
 fs.writeFileSync(manifestFile,JSON.stringify(m));
 assert.throws(()=>compareSavedGmhSeven({dataRoot:root,asOf:stamp}),
  {code:'W03_SAVED_MANIFEST_FILE_CONTRACT'});
 m.files[0].source='GETMARKETHISTORY_FREE_1H';
 m.files[0].path='../tmp/escape.jsonl';
 fs.writeFileSync(manifestFile,JSON.stringify(m));
 assert.throws(()=>compareSavedGmhSeven({dataRoot:root,asOf:stamp}),
  {code:'W03_PC_PARITY_MANIFEST_RAW_PATH'});
});
