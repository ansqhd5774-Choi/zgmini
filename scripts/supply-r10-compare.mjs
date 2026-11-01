import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {calculateCandidate} from '../lib/diagnostic-layer/supply-r10-candidate.mjs';
import {buildSupplyShockR9} from '../lib/diagnostic-layer/supply-r9-components.mjs';
import {fetchWorldBankCopper} from '../lib/diagnostic-layer/nyfed-worldbank-adapters.mjs';
import {readXlsxWorkbook} from '../lib/diagnostic-layer/xlsx-lite.mjs';
const dir='work/supply-r10-sources',read=id=>JSON.parse(fs.readFileSync(`${dir}/${id}.json`,'utf8'));
const id='DPCERA3M086SBEA',url=`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`;
let consumption;
if(fs.existsSync(`${dir}/${id}.json`))consumption=read(id);
else {
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`HTTP_${response.status}`);
 const text=await response.text();if(!text.split(/\r?\n/)[0].includes(id))throw new Error('CSV_SCHEMA');
 fs.writeFileSync(`${dir}/${id}.csv`,text);
 consumption=text.trim().split(/\r?\n/).slice(1).flatMap(line=>{const [observationDate,value]=line.split(',');return /^\d{4}-\d{2}-\d{2}$/.test(observationDate)&&value!=='.'&&value!==''&&Number.isFinite(Number(value))?[{observationDate,value:Number(value)}]:[];});
 fs.writeFileSync(`${dir}/${id}.json`,JSON.stringify(consumption));
}
const db=new DatabaseSync(path.join(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),'storage/core.sqlite'),{readOnly:true});
let stored;try{db.exec('PRAGMA query_only=ON');stored=db.prepare("SELECT batch_key,body FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").get();}finally{db.close();}
const raw=String(stored.body),body=JSON.parse(raw.startsWith('gzip:')?gunzipSync(Buffer.from(raw.slice(5),'base64')).toString():raw);
const workbook=await readXlsxWorkbook(fs.readFileSync(`${dir}/sf-pce.xlsx`)),pceRows=workbook.sheets.get('Data');
const pceColumns={
 coreMm:'Supply-driven Inflation (core, m/m)',coreYoy:'Supply-driven Inflation (core, y/y)',headlineMm:'Supply-driven Inflation (headline, m/m)',headlineYoy:'Supply-driven Inflation (headline, y/y)',
};
const pceVariant=(label)=>{const header=Object.entries(pceRows[0].cells).find(([,cell])=>cell.value===pceColumns[label]);if(!header)throw new Error(`PCE_COLUMN_${label}`);const col=header[0].replace(/\d+$/,'');return pceRows.slice(1).flatMap(row=>{const date=String(row.cells[`A${row.rowNum}`]?.value??'').trim().match(/^(\d{4})m(\d{1,2})$/),cell=row.cells[`${col}${row.rowNum}`];if(!date||!cell||String(cell.value).trim()==='')return [];const value=Number(cell.value);return Number.isFinite(value)?[{observationDate:`${date[1]}-${date[2].padStart(2,'0')}-01`,value}]:[];});};
const input={gscpi:read('gscpi').rows,pce:pceVariant('coreMm'),consumption,wti:body.series.MCOILWTICO,gas:body.series.GASREGCOVM,ip:body.series.INDPRO,stocks:read('eia-stocks'),production:read('WCRFPUS2'),refining:read('WCRRIUS2'),imports:read('WCRIMUS2'),exports:read('WCREXUS2'),supplied:read('WRPUPUS2')};
const candidate=calculateCandidate(input),original=read('candidate-report');
const pceSensitivity=Object.fromEntries(Object.keys(pceColumns).map(label=>{const variant=calculateCandidate({...input,pce:pceVariant(label)});return [label,{count:variant.rows.filter(r=>r.status==='READY').length,first:variant.rows.find(r=>r.status==='READY')?.month,last:variant.rows.filter(r=>r.status==='READY').at(-1)?.month,latest:variant.latest?.score,latestDifference:variant.latest&&candidate.latest?variant.latest.score-candidate.latest.score:null}];}));
const overlap=original.rows.filter(r=>r.status==='READY').map(row=>({month:row.month,old:row.score,new:candidate.rows.find(r=>r.month===row.month)?.score}));
const consumptionOld=new Map(read('PCEC96').map(r=>[r.observationDate,r.value]));
const changes=consumption.flatMap((r,i)=>{if(i===0)return [];const a=consumptionOld.get(r.observationDate),b=consumptionOld.get(consumption[i-1].observationDate);return a>0&&b>0?[Math.abs(Math.log(r.value/consumption[i-1].value)-Math.log(a/b))]:[];});
let copperStatus,copper=[];
try{if(fs.existsSync(`${dir}/copper.json`))copper=read('copper');else{const fetched=await fetchWorldBankCopper();copper=fetched.rows??fetched.parsed?.rows??[];fs.writeFileSync(`${dir}/copper.json`,JSON.stringify(copper));}copperStatus=copper.length?'STORED':'MISSING';}catch(e){copperStatus=e.message;}
const r9=buildSupplyShockR9({gscpi:input.gscpi,wti:input.wti,gasoline:input.gas,copper,industrialProduction:input.ip,headlineCpi:body.series.CPIAUCSL,coreCpi:body.series.CPILFESL});
const r9map=new Map(r9.rows.map(r=>[r.month,r]));
const ready=candidate.rows.filter(r=>r.status==='READY');
for(const row of ready){assert.ok(row.score>=0&&row.score<=100);assert.ok(Math.abs(row.score+Object.values(row.contributions).reduce((a,b)=>a+b,0)-100)<1e-9);}
const truncated=calculateCandidate(Object.fromEntries(Object.entries(input).map(([key,rows])=>[key,rows.filter(r=>r.observationDate<'2026-09-01')])));
assert.deepEqual(candidate.rows.filter(r=>r.month<='2026-08'),truncated.rows);
const paired=ready.filter(r=>r9map.get(r.month)?.status==='READY').map(r=>({month:r.month,r10:r.score,r9:r9map.get(r.month).score}));
const corr=(pairs)=>{if(pairs.length<3)return null;const mx=pairs.reduce((s,r)=>s+r[0],0)/pairs.length,my=pairs.reduce((s,r)=>s+r[1],0)/pairs.length;let xy=0,xx=0,yy=0;for(const [x,y] of pairs){xy+=(x-mx)*(y-my);xx+=(x-mx)**2;yy+=(y-my)**2;}return xx&&yy?xy/Math.sqrt(xx*yy):null;};
const keys=['G','E','O','P','I'];
const correlations=Object.fromEntries(keys.flatMap((a,i)=>keys.slice(i+1).map(b=>[`${a}_${b}`,corr(ready.map(r=>[r.scores[a],r.scores[b]]))])));
const removeEffects=Object.fromEntries(keys.map(key=>[key,{meanRiskContribution:ready.reduce((s,r)=>s+r.contributions[key],0)/ready.length,maxRiskContribution:Math.max(...ready.map(r=>r.contributions[key]))}]));
const summary={status:'RESEARCH_ONLY',sourceVersion:stored.batch_key,consumption:{id,count:consumption.length,first:consumption[0]?.observationDate,last:consumption.at(-1)?.observationDate,maxOverlappingLogGrowthDifference:Math.max(...changes)},readyCount:ready.length,firstReady:ready[0]?.month,lastReady:ready.at(-1)?.month,latest:candidate.latest,consumptionVariantMaxScoreDifference:Math.max(...overlap.map(r=>Math.abs(r.new-r.old))),pceSensitivity,copperStatus,r9PairedCount:paired.length,r9r10Correlation:corr(paired.map(r=>[r.r9,r.r10])),correlations,removeEffects,shockWindow:ready.filter(r=>r.month>='2020-01'&&r.month<='2022-12').map(r=>({month:r.month,score:r.score,r9:r9map.get(r.month)?.score??null})),historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false};
summary.partialShockMonths=candidate.rows.filter(r=>r.month>='2020-01'&&r.month<='2022-12'&&r.status!=='READY').map(r=>({month:r.month,missing:r.missing,residuals:r.residuals}));
summary.validation={boundedScores:true,contributionSum:true,futureObservationTruncation:true,releaseVintageCheck:false};
fs.writeFileSync(`${dir}/long-consumption-candidate.json`,JSON.stringify(candidate,null,2));
fs.writeFileSync(`${dir}/comparison-report.json`,JSON.stringify(summary,null,2));
const selected=['2020-01','2020-03','2020-05','2021-09','2022-02','2022-03','2026-08'];
const table=paired.filter(r=>selected.includes(r.month)).map(r=>`| ${r.month} | ${r.r9.toFixed(2)} | ${r.r10.toFixed(2)} |`).join('\n');
fs.writeFileSync('docs/SUPPLY_SHOCK_R10_COMPARISON.md',`# 공급 충격 R10 과거 비교 결과\n\n로컬 연구용. 운영 R9·원격 DB·화면·배포 변경 없음.\n\n실질 소비량 지수 DPCERA3M086SBEA: ${consumption.length}개월, ${consumption[0].observationDate}~${consumption.at(-1).observationDate}. 출처: https://fred.stlouisfed.org/series/DPCERA3M086SBEA\n\nPCEC96과 겹치는 기간의 월간 로그 성장률 최대 차이 ${(summary.consumption.maxOverlappingLogGrowthDifference*100).toFixed(6)}%p. 별도 비교 후보 입력이며 운영 산식 교체가 아니다. 예열·가중치는 유지했다.\n\nR10 READY ${ready.length}개월, ${ready[0].month}~${ready.at(-1).month}. R9와 동일 저장 자료/current vintage 기준 ${paired.length}개월 재계산 비교. 공개 운영 이력과의 직접 비교는 아니다.\n\n| 기준월 | R9 | R10 |\n|---|---:|---:|\n${table}\n\n2020~2022년 36개월 전체 계산 완료. R9/R10 상관 ${summary.r9r10Correlation.toFixed(3)}. 5개 영역 쌍 중 최대 상관 G/P ${correlations.G_P.toFixed(3)}. 이 결과로 독립성이나 인과적 중복 부재를 확정하지 않는다.\n\n영역 제거 효과는 재가중 없이 해당 위험 기여만 제거했을 때 최종 점수 상승 폭이다. 평균 G ${removeEffects.G.meanRiskContribution.toFixed(2)}, E ${removeEffects.E.meanRiskContribution.toFixed(2)}, O ${removeEffects.O.meanRiskContribution.toFixed(2)}, P ${removeEffects.P.meanRiskContribution.toFixed(2)}, I ${removeEffects.I.meanRiskContribution.toFixed(2)}점.\n\n최신 후보 점수 ${candidate.latest.score.toFixed(2)}점. 기존 PCEC96 후보 대비 겹치는 55개월의 최대 점수 차이 ${summary.consumptionVariantMaxScoreDifference.toFixed(3)}점. 입력 변경뿐 아니라 역사적 백분위 참조 표본 연장의 영향도 포함된다.\n\n실데이터 점수 범위·가중합·미래 관측값 제거 동일성 검사 통과. 당시 발표본 검증은 미완료(CURRENT_VINTAGE_ONLY, lookAheadSafe=false).\n\n남은 검증: 주간 집계·PCE 종류 민감도, 통제 모형 신호 보존, 운영 입력 선택, PC 증분 수집 연결 및 화면/배포 검증. 현재 결과만으로 운영 타당성 PASS를 선언하지 않는다.\n`);
console.log(JSON.stringify({readyCount:summary.readyCount,r9PairedCount:summary.r9PairedCount,latestScore:summary.latest.score,partialShockMonths:summary.partialShockMonths,validation:summary.validation},null,2));
