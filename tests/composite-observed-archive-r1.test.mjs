import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {COMPOSITE_OBSERVED_VERSION,compositeSampleFromVerified,mergeCompositeObservedDay} from '../lib/composite-observed-history-r1.mjs';
import {mergeCompositeObservedDisplay} from '../lib/market-score/composite-observed-display-r1.mjs';
import {appendCompositeObservedFromCurrent,publishCompositeObservedArchive} from '../scripts/pc-writer/composite-observed-archive-r1.mjs';

const calc=(score=50,observation='2026-10-31')=>({
 status:'SUCCESS',asOfDate:observation,overall:{status:'READY',score},domains:Array.from({length:12},(_,i)=>({id:'d'+i,status:'READY',score:50,asOfDate:observation}))
});
const at=text=>Date.parse(text);

test('observations preserve actual calculation times and only verified scores',()=>{
 const first=compositeSampleFromVerified(calc(40),at('2026-10-31T12:00:00Z'));
 const firstDay=mergeCompositeObservedDay(null,'2026-10-31',first);
 assert.equal(firstDay.body.version,COMPOSITE_OBSERVED_VERSION);
 assert.equal(firstDay.body.points.length,1);
 const unchangedScore=mergeCompositeObservedDay(firstDay.body,'2026-10-31',
  compositeSampleFromVerified(calc(40),at('2026-10-31T12:15:00Z')));
 assert.equal(unchangedScore.changed,true);
 assert.equal(mergeCompositeObservedDay(firstDay.body,'2026-10-31',
  compositeSampleFromVerified(calc(40.5),at('2026-10-31T12:05:00Z'))).changed,false);
 const later=mergeCompositeObservedDay(unchangedScore.body,'2026-10-31',
  compositeSampleFromVerified(calc(40.5),at('2026-10-31T12:30:00Z')));
 assert.equal(later.changed,true);
 assert.deepEqual(later.body.points.map(x=>x.score),[40,40,40.5]);
 assert.throws(()=>compositeSampleFromVerified({...calc(),overall:{status:'PARTIAL',score:42}},at('2026-10-31T12:15:00Z')),/UNVERIFIED/);
});

test('PC core.sqlite retains archived daily row separately from current and existing daily score',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'zgmini-comp-archive-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=localDatabase(join(dir,'core.sqlite'));t.after(()=>db.close());
 await db.prepare("CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)").run();
 let now=at('2026-10-31T12:00:00Z');
 const put=async body=>db.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES('current',?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at").bind(JSON.stringify(body),now).run();
 await put(calc(40));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).status,'LOCAL_STORED');
 now+=15*60000;
 await put(calc(40));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).status,'LOCAL_STORED');
 now+=15*60000;
 await put(calc(45));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).points,3);
 const archived=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind('composite-observed:2026-10-31').first();
 assert.deepEqual(JSON.parse(archived.body).points.map(p=>p.score),[40,40,45]);
 assert.equal(JSON.parse((await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='current'").first()).body).overall.score,45);
});

test('D1 score-only day publisher rechecks remote body and skips already published days',async()=>{
 const data=mergeCompositeObservedDay(null,'2026-10-31',compositeSampleFromVerified(calc(46),at('2026-10-31T12:00:00Z'))).body;
 const body=JSON.stringify(data),stored_at=at('2026-10-31T12:00:00Z');
 const local={prepare(){return {async all(){return {results:[{snapshot_key:'composite-observed:2026-10-31',body,stored_at}]}}}}};
 const remoteData=new Map();
 const remote={async query(_,sql,params=[]){
  if(sql.includes("snapshot_key='current'"))return {results:[{stored_at}]};
  if(sql.includes("SELECT snapshot_key,stored_at"))return {results:[...remoteData].map(([snapshot_key,row])=>({snapshot_key,stored_at:row.stored_at}))};
  return {results:remoteData.has(params[0])?[remoteData.get(params[0])]:[]};
 },async request(_,queries){const [key,body,stored_at]=queries[0].params;remoteData.set(key,{body,stored_at})}};
 assert.equal((await publishCompositeObservedArchive(local,remote,'core')).publishedDays,1);
 assert.equal((await publishCompositeObservedArchive(local,remote,'core')).publishedDays,0);
 assert.equal(remoteData.get('composite-observed:2026-10-31').body,body);
});

test('when archive is partial, existing daily year history remains',()=>{
 const daily=Array.from({length:365},(_,i)=>({label:new Date(Date.UTC(2025,10,1)+i*86400000).toISOString().slice(0,10),value:51}));
 const last=daily.at(-1).label;
 const obs=[{label:last+'T12:00:00Z',value:20},{label:last+'T12:15:00Z',value:70}];
 const merged=mergeCompositeObservedDisplay(daily,obs,365);
 assert.ok(merged.length>360);
 assert.ok(merged.some(p=>p.label===daily[0].label));
 assert.ok(!merged.some(p=>p.label===last));
 assert.ok(merged.some(p=>p.value===20));
 assert.ok(merged.some(p=>p.value===70));
 assert.deepEqual(mergeCompositeObservedDisplay(daily,obs,1).map(p=>p.value),[20,70]);
});

test('one-year dense display is bounded but retains observed low and high without synthetic prices',()=>{
 const start=Date.UTC(2025,10,1);
 const observed=Array.from({length:35040},(_,i)=>({label:new Date(start+i*900000).toISOString(),value:50}));
 observed[5000].value=7; observed[29000].value=98;
 const sampled=mergeCompositeObservedDisplay([],observed,365);
 assert.ok(sampled.length<=1200);
 assert.ok(sampled.some(p=>p.value===7));
 assert.ok(sampled.some(p=>p.value===98));
});

test('existing formula, refresh schedule, Korea and current publication remain unchanged',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const writer=read('scripts/pc-writer/run-local.mjs');
 const page=read('app/dashboard-ui.tsx');
 const api=read('app/api/market-score/observations/route.ts');
 assert.match(writer,/composite-archive-local/);
 assert.match(writer,/composite-observed-publication/);
 // 1D was already present before the archive feature: reuse it, never add a duplicate 1일 control.
 assert.match(page,/const marketPeriods=\[\{label:'1D',days:1\}/);
 assert.match(page,/\{marketPeriods\.map\(p=><button/);
 assert.doesNotMatch(page,/\{label:'1일',days:1\}/);
 assert.match(page,/mergeCompositeObservedDisplay/);
 assert.match(api,/timeMeaning:'PC_CALCULATED_AT'/);
 assert.doesNotMatch(api,/https:\/\/production\.dataviz\.cnn\.io|fetch\('https:/);
 assert.doesNotMatch(read('app/korea-composite-view.tsx'),/compositeArchive|COMPOSITE_OBSERVED_VERSION/);
});