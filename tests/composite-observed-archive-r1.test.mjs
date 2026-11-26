import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {localDatabase} from '../scripts/pc-writer/local-db.mjs';
import {COMPOSITE_OBSERVED_VERSION,COMPOSITE_OBSERVED_MAX_POINTS_PER_DAY,compositeSampleFromVerified,mergeCompositeObservedDay} from '../lib/composite-observed-history-r1.mjs';
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
 assert.equal(unchangedScore.changed,false);
 assert.equal(mergeCompositeObservedDay(firstDay.body,'2026-10-31',
  compositeSampleFromVerified(calc(40.5),at('2026-10-31T12:05:00Z'))).changed,true);
 const later=mergeCompositeObservedDay(firstDay.body,'2026-10-31',
  compositeSampleFromVerified(calc(40.5),at('2026-10-31T12:30:00Z')));
 assert.equal(later.changed,true);
 assert.deepEqual(later.body.points.map(x=>x.score),[40,40.5]);
 assert.throws(()=>compositeSampleFromVerified({...calc(),overall:{status:'PARTIAL',score:42}},at('2026-10-31T12:15:00Z')),/UNVERIFIED/);
});

test('PC core.sqlite retains archived daily row separately from current and existing daily score',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'zgmini-comp-archive-'));
 const db=localDatabase(join(dir,'core.sqlite'));
 // Windows cannot remove the directory while the SQLite handle is open.
 t.after(()=>db.close());
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 await db.prepare("CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)").run();
 let now=at('2026-10-31T12:00:00Z');
 const put=async body=>db.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES('current',?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at").bind(JSON.stringify(body),now).run();
 await put(calc(40));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).status,'LOCAL_STORED');
 now+=15*60000;
 await put(calc(40));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).status,'UNCHANGED');
 now+=15*60000;
 await put(calc(45));
 assert.equal((await appendCompositeObservedFromCurrent(db,now)).points,2);
 const archived=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key=?").bind('composite-observed:2026-10-31').first();
 assert.deepEqual(JSON.parse(archived.body).points.map(p=>p.score),[40,45]);
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
 assert.ok(merged.some(p=>p.label===last));
 assert.ok(!merged.some(p=>p.value===20));
 assert.ok(!merged.some(p=>p.value===70));
 assert.deepEqual(mergeCompositeObservedDisplay(daily,obs,1).map(p=>p.value),[20,70]);
});

test('one-year dense display is bounded but retains observed low and high without synthetic prices',()=>{
 const start=Date.UTC(2025,10,1);
 const observed=Array.from({length:35040},(_,i)=>({label:new Date(start+i*900000).toISOString(),value:50}));
 observed[5000].value=7; observed[29000].value=98;
 const sampled=mergeCompositeObservedDisplay([],observed,365);
 assert.ok(sampled.length<=1200);
 assert.deepEqual(sampled,[]);
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

test('equal-stored_at composite archive checks D1 body and refuses false VERIFIED without writes',async()=>{
 const stamp=at('2026-11-18T00:00:48.177Z');
 const key='composite-observed:2026-11-18';
 const body=score=>JSON.stringify({
  version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-18',
  points:[{calculatedAt:new Date(stamp).toISOString(),score,
   asOfDate:'2026-11-18',signature:'score-'+score}]
 });
 const localBody=body(53),remoteBody=body(50);
 const local={prepare(){return {async all(){return {results:[{snapshot_key:key,body:localBody,stored_at:stamp}]}}}}};
 const queries=[],requests=[];
 const remote={
  async query(_db,sql,params=[]){
   queries.push({sql,params});
   if(sql.includes("snapshot_key='current'"))return {results:[{stored_at:stamp}]};
   if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[{snapshot_key:key,stored_at:stamp}]};
   if(sql.includes('SELECT body,stored_at'))return {results:[{body:remoteBody,stored_at:stamp}]};
   throw Error('UNEXPECTED_D1_QUERY');
  },
  async request(_db,commands){requests.push(commands);}
 };
 await assert.rejects(
  publishCompositeObservedArchive(local,remote,'core'),
  {message:'COMPOSITE_ARCHIVE_EQUAL_TIMESTAMP_BODY_MISMATCH'}
 );
 assert.equal(queries.filter(q=>q.sql.includes('SELECT body,stored_at')).length,1);
 assert.deepEqual(requests,[]);
 assert.notEqual(localBody,remoteBody);
});

test('equal-stored_at exact D1 body permits idempotent VERIFIED, and older remote still CAS-publishes',async()=>{
 const stamp=at('2026-11-18T00:00:48.177Z');
 const key='composite-observed:2026-11-18';
 const body=score=>JSON.stringify({
  version:COMPOSITE_OBSERVED_VERSION,date:'2026-11-18',
  points:[{calculatedAt:new Date(stamp).toISOString(),score,
   asOfDate:'2026-11-18',signature:'score-'+score}]
 });
 const localBody=body(53);
 const local={prepare(){return {async all(){return {results:[{snapshot_key:key,body:localBody,stored_at:stamp}]}}}}};
 for(const previousAt of [stamp,stamp-60000]){
  const state={body:previousAt===stamp?localBody:body(50),stored_at:previousAt};
  const queries=[],requests=[];
  const remote={
   async query(_db,sql,params=[]){
    queries.push(sql);
    if(sql.includes("snapshot_key='current'"))return {results:[{stored_at:stamp}]};
    if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[{snapshot_key:key,stored_at:state.stored_at}]};
    if(sql.includes('SELECT body,stored_at'))return {results:[{body:state.body,stored_at:state.stored_at}]};
    throw Error('UNEXPECTED_D1_QUERY');
   },
   async request(_db,commands){
    requests.push(commands);
    const [target,nextBody,nextAt]=commands[0].params;
    assert.equal(target,key);
    if(nextAt>state.stored_at){state.body=nextBody;state.stored_at=nextAt;}
   }
  };
  const result=await publishCompositeObservedArchive(local,remote,'core');
  assert.equal(result.status,'VERIFIED');
  assert.equal(result.publishedDays,previousAt===stamp?0:1);
  assert.equal(requests.length,previousAt===stamp?0:1);
  assert.ok(queries.some(q=>q.includes('SELECT body,stored_at')));
  assert.equal(state.body,localBody);
  assert.equal(state.stored_at,stamp);
 }
});

test('equal-stored_at mismatch blocks other eligible archive writes before CAS',async()=>{
 const date='2026-11-18',date2='2026-11-19';
 const key=d=>'composite-observed:'+d;
 const stamp=at('2026-11-19T00:00:48.177Z');
 const points=d=>JSON.stringify({version:COMPOSITE_OBSERVED_VERSION,date:d,points:[]});
 const rows=[{snapshot_key:key(date),body:points(date),stored_at:stamp-86400000},
             {snapshot_key:key(date2),body:points(date2),stored_at:stamp}];
 const local={prepare(){return {async all(){return {results:rows}}}}};
 let writes=0;
 const remote={
  async query(_db,sql,params=[]){
   if(sql.includes("snapshot_key='current'"))return {results:[{stored_at:stamp}]};
   if(sql.includes('SELECT snapshot_key,stored_at'))return {results:[{snapshot_key:key(date),stored_at:stamp-86400000}]};
   if(sql.includes('SELECT body,stored_at'))return {results:[{body:points(date)+' ',stored_at:stamp-86400000}]};
   throw Error('UNEXPECTED_D1_QUERY');
  },
  async request(){writes++;}
 };
 await assert.rejects(publishCompositeObservedArchive(local,remote,'core'),
  {message:'COMPOSITE_ARCHIVE_EQUAL_TIMESTAMP_BODY_MISMATCH'});
 assert.equal(writes,0);
});

test('R4 changed calculations at 12:00, 12:05 and 12:10 all survive in existing SQLite archive',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'zgmini-r4-event-archive-'));
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 const db=localDatabase(join(dir,'core.sqlite'));t.after(()=>db.close());
 await db.prepare("CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)").run();
 const events=[['2026-10-31T12:00:00Z',50],['2026-10-31T12:05:00Z',53],['2026-10-31T12:10:00Z',56]];
 for(const [clock,score] of events){
  const t=at(clock);
  await db.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES('current',?,?) ON CONFLICT(snapshot_key) DO UPDATE SET body=excluded.body,stored_at=excluded.stored_at")
   .bind(JSON.stringify(calc(score)),t).run();
  const written=await appendCompositeObservedFromCurrent(db,t);
  assert.equal(written.status,'LOCAL_STORED');
 }
 const saved=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='composite-observed:2026-10-31'").first();
 const decoded=JSON.parse(saved.body);
 assert.deepEqual(decoded.points.map(p=>p.score),[50,53,56]);
 assert.deepEqual(decoded.points.map(p=>p.calculatedAt),events.map(x=>new Date(at(x[0])).toISOString()));
 const latest=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='current'").first();
 assert.equal(JSON.parse(latest.body).overall.score,56);
});

test('R4 same-value signature revisions respect 15-minute sampling and never fabricate short-interval flat points',()=>{
 const first=mergeCompositeObservedDay(null,'2026-10-31',
  compositeSampleFromVerified(calc(50),at('2026-10-31T12:00:00Z')));
 const revised=calc(50);revised.domains[0].score=56;
 const second=compositeSampleFromVerified(revised,at('2026-10-31T12:05:00Z'));
 assert.notEqual(first.body.points[0].signature,second.signature);
 assert.equal(mergeCompositeObservedDay(first.body,'2026-10-31',second).changed,false);
 assert.equal(mergeCompositeObservedDay(first.body,'2026-10-31',
  compositeSampleFromVerified(revised,at('2026-10-31T12:15:00Z'))).changed,true);
});

test('approved 512-point/day safety bound preserves earlier points and rejects the 513th',()=>{
 const date='2026-10-31',start=at('2026-10-31T00:00:00Z');
 assert.equal(COMPOSITE_OBSERVED_MAX_POINTS_PER_DAY,512);
 let original=null;
 for(let i=0;i<COMPOSITE_OBSERVED_MAX_POINTS_PER_DAY;i++){
  const record=compositeSampleFromVerified(calc(i%2===0?50:51),start+i*60000);
  const result=mergeCompositeObservedDay(original,date,record);
  assert.equal(result.changed,true);
  original=result.body;
 }
 assert.equal(original.points.length,512);
 assert.throws(()=>mergeCompositeObservedDay(original,date,
  compositeSampleFromVerified(calc(52),start+512*60000)),/COMPOSITE_DAILY_CAP_EXCEEDED/);
 assert.equal(original.points.length,512,'cap must not truncate or mutate saved points');
});

test('all 288 verified five-minute score changes survive one full UTC day',()=>{
 const date='2026-10-31',start=at('2026-10-31T00:00:00Z');
 let archive=null;
 for(let i=0;i<288;i++){
  const record=compositeSampleFromVerified(calc(i%2===0?50:51),start+i*5*60000);
  const result=mergeCompositeObservedDay(archive,date,record);
  assert.equal(result.changed,true,'five-minute change '+i);
  archive=result.body;
 }
 assert.equal(archive.points.length,288);
 assert.equal(archive.points[0].calculatedAt,'2026-10-31T00:00:00.000Z');
 assert.equal(archive.points.at(-1).calculatedAt,'2026-10-31T23:55:00.000Z');
});

test('same timestamp is idempotent only for the same verified value and signature',()=>{
 const date='2026-10-31',time=at('2026-10-31T12:00:00Z');
 const first=compositeSampleFromVerified(calc(50),time);
 const previous=mergeCompositeObservedDay(null,date,first).body;
 assert.equal(mergeCompositeObservedDay(previous,date,first).changed,false);
 assert.throws(()=>mergeCompositeObservedDay(previous,date,
  compositeSampleFromVerified(calc(53),time)),/COMPOSITE_ARCHIVE_EQUAL_TIMESTAMP_CONFLICT/);
 const revised=calc(50);revised.domains[0].score=53;
 assert.throws(()=>mergeCompositeObservedDay(previous,date,
  compositeSampleFromVerified(revised,time)),/COMPOSITE_ARCHIVE_EQUAL_TIMESTAMP_CONFLICT/);
 assert.deepEqual(previous.points,[first],'conflict must not mutate prior history');
});

test('a genuine score change is never dropped solely due to an equal source fingerprint',()=>{
 const date='2026-10-31',first=compositeSampleFromVerified(calc(50),at('2026-10-31T12:00:00Z'));
 const archive=mergeCompositeObservedDay(null,date,first).body;
 const changed={...compositeSampleFromVerified(calc(53),at('2026-10-31T12:05:00Z')),
  signature:first.signature};
 assert.deepEqual(mergeCompositeObservedDay(archive,date,changed).body.points.map(p=>p.score),[50,53]);
});

test('the PC archive still enforces the existing 1.8MB row guard',()=>{
 const writer=readFileSync(new URL('../scripts/pc-writer/composite-observed-archive-r1.mjs',import.meta.url),'utf8');
 assert.match(writer,/Buffer\.byteLength\(encoded\)>1800000/);
});

test('R4 changed-score archive keeps verified MarketParquet paid breadth provenance',()=>{
 const body=calc(50);
 const h=n=>n.repeat(64);
 body.domains[0]={
  id:'breadth',name:'수급·폭',status:'READY',score:50,
  source:'MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY',
  methodologyVersion:'B1-R5-STORED-BREADTH-4FACTOR-EMA3-R2',
  observationDate:'2026-10-31',
  trend:[{label:'2026-10-31',value:50}],
  indicators:Array.from({length:4},(_,i)=>({
   id:'breadth-'+(41+i),status:'READY',score:50,value:50,observationDate:'2026-10-31'
  })),
  paidSource:{
   version:'ZGMINI_BREADTH_PAID_B1_R5_V1',plan:'full',sourceVersion:h('a'),
   pitSha256:h('b'),inputSha256:[h('c')],observationDate:'2026-10-31',
   sourceLatestDate:'2026-10-31',returnCoverage:0.99,tradingValueCoverage:0.99
  }
 };
 const first=compositeSampleFromVerified(body,at('2026-10-31T12:00:00Z'));
 assert.equal(first.publicSourceContract,'CM_R1_PAID_BREADTH_RESTORED_R1');
 assert.equal(first.breadthSourceVersion,h('a'));
 const second=compositeSampleFromVerified({...body,overall:{status:'READY',score:53}},at('2026-10-31T12:05:00Z'));
 const output=mergeCompositeObservedDay(mergeCompositeObservedDay(null,'2026-10-31',first).body,'2026-10-31',second);
 assert.deepEqual(output.body.points.map(x=>x.score),[50,53]);
 assert.deepEqual(output.body.points.map(x=>x.breadthSourceVersion),[h('a'),h('a')]);
});

test('PC archive appender does not suppress a real score change when stored signatures collide',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'zgmini-score-signature-collision-'));
 const db=localDatabase(join(dir,'core.sqlite'));
 t.after(()=>db.close());
 t.after(()=>rmSync(dir,{recursive:true,force:true}));
 await db.prepare("CREATE TABLE market_public_snapshots_v1(snapshot_key TEXT PRIMARY KEY,body TEXT NOT NULL,stored_at INTEGER NOT NULL)").run();
 const start=at('2026-10-31T12:00:00Z'),later=start+5*60000;
 const newer=compositeSampleFromVerified(calc(53),later);
 const older={...compositeSampleFromVerified(calc(50),start),signature:newer.signature};
 const archive={version:COMPOSITE_OBSERVED_VERSION,date:'2026-10-31',points:[older]};
 const upsert=(key,body,stamp)=>db.prepare("INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?)").bind(key,JSON.stringify(body),stamp).run();
 await upsert('composite-observed:2026-10-31',archive,start);
 await upsert('current',calc(53),later);
 const result=await appendCompositeObservedFromCurrent(db,later);
 assert.equal(result.status,'LOCAL_STORED');
 const row=await db.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='composite-observed:2026-10-31'").first();
 assert.deepEqual(JSON.parse(row.body).points.map(p=>p.score),[50,53]);
});
