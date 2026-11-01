import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {calculateCandidate} from '../lib/diagnostic-layer/supply-r10-candidate.mjs';
const directory='work/supply-r10-sources';
const read=id=>JSON.parse(fs.readFileSync(`${directory}/${id}.json`,'utf8'));
const db=new DatabaseSync(path.join(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),'storage/core.sqlite'),{readOnly:true});
let stored;
try{db.exec('PRAGMA query_only=ON');stored=db.prepare("SELECT batch_key,body,stored_at FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").get();}finally{db.close();}
if(!stored)throw new Error('MACRO_MISSING');
const raw=String(stored.body),body=JSON.parse(raw.startsWith('gzip:')?gunzipSync(Buffer.from(raw.slice(5),'base64')).toString():raw);
const input={gscpi:read('gscpi').rows,pce:read('sf-pce'),consumption:read('PCEC96'),wti:body.series.MCOILWTICO,gas:body.series.GASREGCOVM,ip:body.series.INDPRO,stocks:read('eia-stocks'),production:read('WCRFPUS2'),refining:read('WCRRIUS2'),imports:read('WCRIMUS2'),exports:read('WCREXUS2'),supplied:read('WRPUPUS2')};
const report=calculateCandidate(input);
report.sourceVersion=stored.batch_key;report.sourceStoredAt=stored.stored_at;
const ready=report.rows.filter(r=>r.status==='READY');
for(const row of ready){assert.ok(row.score>=0&&row.score<=100);assert.ok(Math.abs(row.score+Object.values(row.contributions).reduce((a,b)=>a+b,0)-100)<1e-9);}
const truncated=Object.fromEntries(Object.entries(input).map(([key,rows])=>[key,rows.filter(row=>row.observationDate<'2026-09-01')]));
const truncatedReport=calculateCandidate(truncated);
assert.deepEqual(report.rows.filter(row=>row.month<='2026-08'),truncatedReport.rows);
report.validation={boundedScores:true,weightedContributionCheck:true,futureObservationTruncationCheck:true,pointInTimeReleaseValidation:false};
report.summary={readyCount:ready.length,firstReady:ready[0]?.month??null,lastReady:ready.at(-1)?.month??null,minScore:ready.length?Math.min(...ready.map(r=>r.score)):null,maxScore:ready.length?Math.max(...ready.map(r=>r.score)):null,latest:report.latest,latestObserved:report.rows.at(-1),historicalWindows:ready.filter(r=>r.month>='2020-01'&&r.month<='2022-12')};
fs.writeFileSync(`${directory}/candidate-report.json`,JSON.stringify(report,null,2));
console.log(JSON.stringify({...report.summary,historicalWindows:report.summary.historicalWindows.map(({month,score})=>({month,score}))},null,2));
