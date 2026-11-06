import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {planReleaseCalendarAdditive} from '../scripts/pc-writer/release-calendar-additive-plan.mjs';

const sha=text=>createHash('sha256').update(text).digest('hex');
const oldLines=[
 " bls:{url:'a',page:'a',format:'ics'},",
 " bea:{url:'b',page:'b',format:'ics'},",
 " fed:{url:'c',page:'c',format:'fed'},",
 " census:{url:'d',page:'d',format:'census'},",
];
const pcExtra=[
 " fed_calendar:{url:'e',page:'e',format:'fixture'},",
 " eia:{url:'f',page:'f',format:'fixture'},",
 " usda:{url:'g',page:'g',format:'fixture'},",
 " cftc:{url:'h',page:'h',format:'fixture'},",
 " treasury:{url:'i',page:'i',format:'fixture'},",
 " tic:{url:'j',page:'j',format:'fixture'},",
];
const newLines=[
 " eia_epm:{url:'k',page:'k',format:'eia_epm'},",
 " nyfed:{url:'l',page:'l',format:'nyfed'},",
];
const makeModule=(entries,{feature=false,pcVariant=false}={})=>
 "export const RELEASE_SOURCES=Object.freeze({\n"+entries.join('\n')+'\n});\n'+
 "const months=['January','February'];\n"+
 (feature?"export function nyFedCalendarPages(){return [];}\n":'')+
 (pcVariant?
  "export function parseReleaseCalendar(text){return ['pc-special',text];}\n":
  feature?"export function parseReleaseCalendar(text){return ['feature-special',text];}\n":
  "export function parseReleaseCalendar(text){return [text];}\n");
const importBase="import {RELEASE_SOURCES,parseReleaseCalendar} from '../../lib/release-calendar.mjs';\n";
const importFeature="import {RELEASE_SOURCES,parseReleaseCalendar,nyFedCalendarPages} from '../../lib/release-calendar.mjs';\n";
const baseRunner=importBase+'export async function collectReleaseCalendar(){return Object.keys(RELEASE_SOURCES);}\n';
const featureRunner=importFeature+
 'export async function collectReleaseCalendar(){nyFedCalendarPages();return Object.keys(RELEASE_SOURCES);}\n';

function fixture(t,{pcModule,pcRunner,featureModule,featureRunnerText}={}){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'calendar-additive-plan-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const data={
  baseModule:makeModule(oldLines),
  featureModule:featureModule??makeModule([...oldLines,...newLines],{feature:true}),
  pcModule:pcModule??makeModule([...oldLines,...pcExtra]),
  baseRunner,
  featureRunner:featureRunnerText??featureRunner,
  pcRunner:pcRunner??baseRunner,
 };
 const files={};
 for(const [name,content] of Object.entries(data)){
  const filename=path.join(root,name+'.mjs');fs.writeFileSync(filename,content);
  files[name]=filename;
 }
 return {
  files,
  data,
  plan:()=>planReleaseCalendarAdditive({
   ...files,expectedPcSha256:{module:sha(data.pcModule),runner:sha(data.pcRunner)},
  }),
 };
}

test('a synthetic 10-source PC module gets only the two new sources',t=>{
 const f=fixture(t);
 const oldHash=sha(fs.readFileSync(f.files.pcModule));
 const oldRunnerHash=sha(fs.readFileSync(f.files.pcRunner));
 const planned=f.plan();
 assert.equal(planned.status,'CANDIDATE_ONLY_NOT_INSTALLED');
 assert.equal(planned.sourceConflictResolved,true);
 assert.equal(planned.runtimeSourceVerified,false);
 assert.equal(planned.productionApproved,false);
 assert.equal(planned.sources.length,12);
 assert.equal(new Set(planned.sources).size,12);
 for(const key of ['bls','bea','fed','census','fed_calendar','eia','usda','cftc','treasury','tic','eia_epm','nyfed'])
  assert.ok(planned.sources.includes(key),key);
 for(const line of [...oldLines,...pcExtra])assert.ok(planned.candidate.module.includes(line),line);
 assert.equal(sha(fs.readFileSync(f.files.pcModule)),oldHash);
 assert.equal(sha(fs.readFileSync(f.files.pcRunner)),oldRunnerHash);
});

test('rejects an unexpected installed PC SHA before merging',t=>{
 const f=fixture(t);
 assert.throws(()=>planReleaseCalendarAdditive({...f.files,
  expectedPcSha256:{module:'0'.repeat(64),runner:sha(f.data.pcRunner)},
 }),{code:'CALENDAR_PC_SHA_MISMATCH'});
});

test('rejects source symlinks even if their bytes would match',t=>{
 const f=fixture(t);
 const alias=path.join(path.dirname(f.files.pcModule),'pc-module-link.mjs');
 fs.symlinkSync(f.files.pcModule,alias);
 assert.throws(()=>planReleaseCalendarAdditive({
  ...f.files,pcModule:alias,
  expectedPcSha256:{module:sha(f.data.pcModule),runner:sha(f.data.pcRunner)},
 }),{code:'CALENDAR_FILE_NOT_REGULAR'});
});

test('rejects missing or renamed preexisting providers',t=>{
 const changed=makeModule([...oldLines,...pcExtra].map(x=>x.replace(' tic:', ' other:')));
 const f=fixture(t,{pcModule:changed});
 assert.throws(f.plan,{code:'CALENDAR_PC_TEN_SOURCES_MISMATCH'});
});

test('rejects conflicting collector edits outside the provider table',t=>{
 const altered=baseRunner.replace('return Object.keys(RELEASE_SOURCES);','return Object.values(RELEASE_SOURCES);');
 const f=fixture(t,{pcRunner:altered});
 assert.throws(f.plan,{code:'CALENDAR_RUNNER_MERGE_CONFLICT'});
});

test('rejects concurrent parser conflicts outside RELEASE_SOURCES',t=>{
 const altered=makeModule([...oldLines,...pcExtra],{pcVariant:true});
 const f=fixture(t,{pcModule:altered});
 assert.throws(f.plan,{code:'CALENDAR_CONFLICT_UNSAFE'});
});

test('rejects duplicate or missing new source definitions',t=>{
 const bad=makeModule([...oldLines,newLines[0]],{feature:true});
 const f=fixture(t,{featureModule:bad});
 assert.throws(f.plan,{code:'CALENDAR_ADDITION_UNEXPECTED'});
});

test('rejects changes to the four baseline definitions in the feature file',t=>{
 const changed=makeModule([...oldLines,...newLines].map(line=>line.replace(" bls:{url:'a'"," bls:{url:'different'")),{feature:true});
 const f=fixture(t,{featureModule:changed});
 assert.throws(f.plan,{code:'CALENDAR_FEATURE_SOURCE_DRIFT'});
});

test('rejects unavailable Git and never attempts a shell fallback',t=>{
 const f=fixture(t);
 assert.throws(()=>planReleaseCalendarAdditive({
  ...f.files,gitBin:'not-a-real-git-binary',
  expectedPcSha256:{module:sha(f.data.pcModule),runner:sha(f.data.pcRunner)},
 }),{code:'CALENDAR_GIT_MERGE_UNAVAILABLE'});
});
