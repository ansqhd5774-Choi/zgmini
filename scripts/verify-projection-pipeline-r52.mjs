import fs from 'node:fs';import path from 'node:path';import {build} from 'esbuild';import {DatabaseSync} from 'node:sqlite';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';import {readOnlyDualEnv} from '../worker/candidate-2db-guard.mjs';import {candidate2dbImportBoundary} from './candidate-2db-import-boundary.mjs';
const source=new DatabaseSync(process.argv[2],{readOnly:true}),target=new DatabaseSync(':memory:');
target.exec(source.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='market_public_snapshots_v1'").get().sql);
const current=source.prepare("SELECT * FROM market_public_snapshots_v1 WHERE snapshot_key='current'").get();
target.prepare('INSERT INTO market_public_snapshots_v1(snapshot_key,body,stored_at) VALUES(?,?,?)').run(current.snapshot_key,current.body,current.stored_at);
const trace=[],messages=[],writes=[];
function native(binding){return {prepare(sql){const database=binding==='CORE'&&sql.includes('market_public_snapshots_v1')?target:source;const make=(args=[])=>({bind(...a){return make(a)},async first(){trace.push({binding,sql});return database.prepare(sql).get(...args)??null},async all(){trace.push({binding,sql});return {results:database.prepare(sql).all(...args),meta:{rows_read:1}}},async run(){assert.equal(binding,'CORE');assert(sql.startsWith('INSERT INTO market_public_snapshots_v1'));assert(args[0].startsWith('detail:')||args[0]==='public:korea-fear-greed:v1');writes.push({key:args[0]});const r=database.prepare(sql).run(...args);return {meta:{changes:r.changes}}}});return make()},batch(){throw Error('LOCAL_WRITE_DISABLED')}}}
const env={DB_CORE:native('CORE'),DB_HISTORY:native('HISTORY'),PUBLIC_PROJECTION_QUEUE:{async sendBatch(batch){messages.push(...batch);return {produced:batch.length}}}};
globalThis.__R52_FIXTURE_ENV=readOnlyDualEnv(env);
const boundary=candidate2dbImportBoundary(process.cwd()),outfile=path.resolve('work/r52-fixtures/pipeline.mjs');
await build({entryPoints:['worker/projection-queue-r52.ts'],outfile,bundle:true,format:'esm',platform:'node',logLevel:'silent',plugins:[{name:'fixture',setup(b){b.onLoad({filter:/candidate-env-2db\.ts$/},()=>({contents:'export const env=globalThis.__R52_FIXTURE_ENV;'}));b.onLoad({filter:/\.(?:mjs|ts|js)$/},args=>{const s=fs.readFileSync(args.path,'utf8');return {contents:boundary.transform(s,args.path)?.code??s,loader:args.path.endsWith('.ts')?'ts':'js'}});}}]});
const {enqueueAfterStoredSourceSuccess,consumeProjectionBatch}=await import(pathToFileURL(outfile).href);
const originalFetch=globalThis.fetch;let providers=0;globalThis.fetch=()=>{providers++;throw Error('PROVIDER_FORBIDDEN')};
let ack=0,retry=0;try{
 await assert.rejects(()=>enqueueAfterStoredSourceSuccess(env,{sourceSucceeded:false}),/SOURCE_SUCCESS_REQUIRED/);
 await enqueueAfterStoredSourceSuccess(env,{sourceSucceeded:true});assert.equal(messages.length,9);assert.equal(writes.length,0,'Producer cannot write projection');
 for(const message of messages)assert.deepEqual(Object.keys(message.body).sort(),['id','sourceStoredAt','sourceVersion']);
 const result=await consumeProjectionBatch({messages:messages.map(m=>({...m,ack(){ack++},retry(){retry++}}))},env,{});
 assert.equal(ack,9);assert.equal(retry,0);assert.equal(writes.length,9);assert.equal(providers,0);
 const sourceWrites=trace.filter(x=>!/^(SELECT)/.test(x.sql.trim()));assert.equal(sourceWrites.length,0);
 const rows=target.prepare("SELECT snapshot_key,length(body) AS bytes,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key<>'current' ORDER BY snapshot_key").all();assert.equal(rows.length,9);assert.equal(target.prepare("SELECT body FROM market_public_snapshots_v1 WHERE snapshot_key='current'").get().body,current.body);
 const before=writes.length;await consumeProjectionBatch({messages:messages.map(m=>({...m,ack(){},retry(){throw Error('Unexpected retry')}}))},env,{});assert.equal(writes.length,before,'Duplicate jobs are no-write idempotent');
 const report={at:new Date().toISOString(),localFixture:true,producerMessages:messages.length,ack,retry,initialProjectionWrites:9,sourceWrites:0,historyWrites:0,providerCalls:providers,projections:rows,routing:{coreQueries:trace.filter(x=>x.binding==='CORE').length,historyQueries:trace.filter(x=>x.binding==='HISTORY').length},result};
 fs.writeFileSync('docs/migration/d1-r52/QUEUE_PIPELINE_LOCAL.json',JSON.stringify(report,null,2));console.log(JSON.stringify({ack,retry,projections:rows.length,sourceWrites:0,historyWrites:0,providerCalls:providers}));
}finally{globalThis.fetch=originalFetch;source.close();target.close()}
