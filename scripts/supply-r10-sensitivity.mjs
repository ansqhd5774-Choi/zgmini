import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {gunzipSync} from 'node:zlib';
import {calculateCandidate} from '../lib/diagnostic-layer/supply-r10-candidate.mjs';
import {readXlsxWorkbook} from '../lib/diagnostic-layer/xlsx-lite.mjs';
const dir='work/supply-r10-sources',read=id=>JSON.parse(fs.readFileSync(`${dir}/${id}.json`,'utf8'));
const db=new DatabaseSync(path.join(process.env.ZGMINI_PC_HOME??path.join(os.homedir(),'.zgmini','pc-writer'),'storage/core.sqlite'),{readOnly:true});
let stored;try{db.exec('PRAGMA query_only=ON');stored=db.prepare("SELECT batch_key,body FROM market_input_batches_v1 WHERE batch_key LIKE 'macro:%' ORDER BY stored_at DESC LIMIT 1").get();}finally{db.close();}
if(!stored)throw new Error('MACRO_MISSING');
const text=String(stored.body),body=JSON.parse(text.startsWith('gzip:')?gunzipSync(Buffer.from(text.slice(5),'base64')).toString():text);
const input={gscpi:read('gscpi').rows,pce:read('sf-pce'),consumption:read('DPCERA3M086SBEA'),wti:body.series.MCOILWTICO,gas:body.series.GASREGCOVM,ip:body.series.INDPRO,stocks:read('eia-stocks'),production:read('WCRFPUS2'),refining:read('WCRRIUS2'),imports:read('WCRIMUS2'),exports:read('WCREXUS2'),supplied:read('WRPUPUS2')};
const baseline=calculateCandidate(input),baseMap=new Map(baseline.rows.filter(r=>r.status==='READY').map(r=>[r.month,r]));
const wb=await readXlsxWorkbook(fs.readFileSync(`${dir}/sf-pce.xlsx`)),sheet=wb.sheets.get('Data');
function pce(label){const header=Object.entries(sheet[0].cells).find(([,v])=>v.value===`Supply-driven Inflation (${label})`);if(!header)throw new Error('PCE_SCHEMA');const col=header[0].replace(/\d+$/,'');return sheet.slice(1).flatMap(row=>{const month=String(row.cells[`A${row.rowNum}`]?.value??'').trim().match(/^(\d{4})m(\d{1,2})$/),cell=row.cells[`${col}${row.rowNum}`];if(!month||!cell||String(cell.value).trim()==='')return [];const value=Number(cell.value);if(!Number.isFinite(value))throw new Error('PCE_NUMBER');return [{observationDate:`${month[1]}-${month[2].padStart(2,'0')}-01`,value}];});}
const scenarios=[['dayWeighted',input,{dayWeighted:true}],['withoutControls',input,{controls:false}],...['core, y/y','headline, m/m','headline, y/y'].map(label=>[label,{...input,pce:pce(label)},{}])];
const summaries=[];
for(const [name,variant,options]of scenarios){
 const report=calculateCandidate(variant,options),ready=report.rows.filter(r=>r.status==='READY');
 const differences=ready.filter(r=>baseMap.has(r.month)).map(r=>({month:r.month,difference:r.score-baseMap.get(r.month).score,score:r.score,base:baseMap.get(r.month).score}));
 const largest=[...differences].sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference))[0];
 const signFlips=differences.filter((row,i)=>{const previous=differences[i-1];if(!previous)return false;const date=new Date(`${previous.month}-01T00:00:00Z`);date.setUTCMonth(date.getUTCMonth()+1);if(date.toISOString().slice(0,7)!==row.month)return false;return (row.score-previous.score)*(row.base-previous.base)<0;}).length;
 for(const row of ready){assert.ok(row.score>=0&&row.score<=100);assert.ok(Math.abs(row.score+Object.values(row.contributions).reduce((a,b)=>a+b,0)-100)<1e-9);}
 // Cut all inputs after the selected month, including the following week's coverage.
 const truncatedInput=Object.fromEntries(Object.entries(variant).map(([key,rows])=>[key,rows.filter(r=>r.observationDate<'2026-09-01')]));
 const truncated=calculateCandidate(truncatedInput,options);
 const cutoff=options.dayWeighted?'2026-07':'2026-08';
 assert.deepEqual(report.rows.filter(r=>r.month<=cutoff),truncated.rows.filter(r=>r.month<=cutoff));
 const selected=ready.filter(r=>['2020-01','2020-03','2020-05','2021-09','2022-03','2026-08'].includes(r.month)).map(r=>({month:r.month,score:r.score,scores:r.scores}));
 summaries.push({name,pairedMonths:differences.length,latestMonth:report.latest?.month,latestScore:report.latest?.score,latestDifference:differences.at(-1)?.difference,meanAbsoluteDifference:differences.reduce((s,r)=>s+Math.abs(r.difference),0)/differences.length,largestDifference:largest,monthlyDirectionFlips:signFlips,selected});
}
const result={sourceVersion:stored.batch_key,baseline:{count:baseMap.size,latest:baseline.latest},historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,variants:summaries,validation:{scoreRange:true,contributionSum:true,futureObservationTruncation:true}};
fs.writeFileSync(`${dir}/sensitivity-report.json`,JSON.stringify(result,null,2));
const labels={dayWeighted:'주간 일수 가중',withoutControls:'수요·가격 통제 제외','core, y/y':'근원 전년 대비','headline, m/m':'헤드라인 월간','headline, y/y':'헤드라인 전년 대비'};
const table=summaries.map(s=>`| ${labels[s.name]} | ${s.pairedMonths} | ${s.latestScore.toFixed(2)} | ${s.latestDifference.toFixed(2)} | ${s.meanAbsoluteDifference.toFixed(2)} | ${s.largestDifference.difference.toFixed(2)} (${s.largestDifference.month}) | ${s.monthlyDirectionFlips} |`).join('\n');
fs.writeFileSync('docs/SUPPLY_SHOCK_R10_SENSITIVITY.md',`# 공급 충격 R10 민감도 검증\n\n운영 적용 전 후보 비교. source ${stored.batch_key}. 최신 공통월 ${baseline.latest.month}, 기준 점수 ${baseline.latest.score.toFixed(2)}.\n\n| 비교 후보 | 공통 월수 | 최신 점수 | 최신 차이 | 평균 절대 차이 | 최대 차이 | 월간 방향 반전 횟수 |\n|---|---:|---:|---:|---:|---:|---:|\n${table}\n\n차이 단위는 점수다. 최대 차이는 절댓값 기준으로 선택하고 부호를 유지했다. 월간 방향 반전은 두 계산의 전월 대비 변화 방향이 반대인 인접 월이며, 실물 사건의 정답 판정은 아니다.\n\n주간 일수 가중 후보는 주 종료일(금요일)까지의 7일을 해당 관측값으로 배분한다. 모든 달력일이 실제 주간 자료로 덮여야 계산한다. 월말을 덮는 다음 달 금요일 발표가 필요할 수 있으며 주간 값을 일별 실제 관측값으로 해석하지 않는다. 재고는 월 마지막 주 관측값으로 유지했다.\n\n수요 통제 제외 후보는 계절성·시간 추세·자기 시차를 유지하고 수요 대용·순수입·WTI 통제만 제외했다. 기존 가중치와 회귀/백분위 예열은 유지했다.\n\n모든 후보 점수 범위·기여도 합계·미래 관측값 제거 검사를 통과했다. 당시 발표본 검증은 수행하지 않았다.\n\n권고: 후보 기본값은 근원 공급 주도 월간 PCE, 주 종료월 기준 집계, 수요 통제 포함으로 유지한다. 특히 월간 방향 반전과 최대 차이가 존재하므로 설정을 자동 선택하거나 점수에 맞춰 변경하지 않는다. 수요 통제 잔차는 공급 원인의 인과적 식별을 보장하지 않는다.\n\n미완료: PC 운영 수집/저장/계산 연결, 공개 projection·도움말·화면 연결, 운영 산식 전환 및 배포 검증.\n`);
console.log(JSON.stringify(summaries.map(({selected,...s})=>s),null,2));
