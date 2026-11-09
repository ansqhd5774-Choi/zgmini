import fs from 'node:fs';import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {base,readR10Inputs,r10InputSlice} from './asset-r10-storage.mjs';
import {save,hash} from './d1.mjs';
import {evaluateAssetBubbleR10Candidate} from '../../lib/diagnostic-layer/asset-bubble-r10-evaluation.mjs';
import {scoreAssetBubbleR10Candidate,ASSET_BUBBLE_R10_WEIGHTS} from '../../lib/diagnostic-layer/asset-bubble-r10-candidate.mjs';
import {assetR10PublicationDryRun} from '../../lib/diagnostic-layer/asset-bubble-r10-release-gate.mjs';
import {isMarketSession} from '../../lib/market-score/breadth-b1-r3-calendar.mjs';

const isDate=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
function lastMarketSessionOfMonth(month){
 const [year,number]=month.split('-').map(Number);
 if(!Number.isInteger(year)||!Number.isInteger(number)||number<1||number>12)throw Error('R10_B_MONTH_INVALID');
 const end=new Date(Date.UTC(year,number,0));
 while(true){
  const date=end.toISOString().slice(0,10);
  if(isMarketSession(date)&&date!=='2025-01-09')return date;
  end.setUTCDate(end.getUTCDate()-1);
 }
}

// A month is mature only after its last expected market session is observed
// in the verified PIT quality ledger, and the following calendar month begins.
// The final scored day can precede that session if the latest observations
// fail the approved coverage/252-pair requirements. Never fill that gap.
export function completedR10BreadthQuarterScores({breadthRows=[],qualityRows=[],asOfDate}={}){
 if(!isDate(asOfDate))throw Error('R10_B_ASOF_INVALID');
 const currentMonth=asOfDate.slice(0,7);
 const observedThrough=new Map(),validDates=new Set();
 for(const row of qualityRows){
  const date=row?.observationDate;
  if(!isDate(date))continue;
  const month=date.slice(0,7),prior=observedThrough.get(month);
  if(!prior||date>prior)observedThrough.set(month,date);
  if(row.coverage>=.98&&row.participation!==null&&Number.isFinite(row.participation))validDates.add(date);
 }
 const months=new Map();
 for(const row of breadthRows){
  const date=row?.observationDate;
  if(!isDate(date)||!validDates.has(date)||!Number.isFinite(row.researchSafetyScore)||!Number.isInteger(row.rankObservations)||row.rankObservations<252)continue;
  const month=date.slice(0,7);
  if(month>=currentMonth)continue;
  const prior=months.get(month);
  if(!prior||date>prior.observationDate)months.set(month,row);
 }
 const quarters=new Map();
 for(const [month,row] of months){
  if((observedThrough.get(month)??'')<lastMarketSessionOfMonth(month))continue;
  const quarter=month.slice(0,4)+'-Q'+Math.ceil(Number(month.slice(5))/3);
  const rows=quarters.get(quarter)??[];rows.push(row);quarters.set(quarter,rows);
 }
 return new Map([...quarters].filter(([,rows])=>rows.length===3).map(([quarter,rows])=>
  [quarter,rows.reduce((sum,row)=>sum+row.researchSafetyScore,0)/3]));
}

function buildRelease(){
const read=name=>JSON.parse(fs.readFileSync(path.join(base,'local-asset-bubble-r10-'+name+'.json')));
const breadth=read('breadth-research'),quality=read('alpaca-pit-validation'),audit=read('alpaca-collected-audit');
if(breadth.formulaApproved!==true||audit.invalid!==0||audit.conflicts!==0)throw Error('R10_INPUT_VALIDATION_FAILED');
const inputs=readR10Inputs(),macro=r10InputSlice(inputs.macro);
const asOfDate=new Date().toISOString().slice(0,10);
const bScores=completedR10BreadthQuarterScores({breadthRows:breadth.rows,qualityRows:quality.rows,asOfDate});
// Use the actual five macro/price factors. Never inject simulated verification flags.
const evaluation=evaluateAssetBubbleR10Candidate({macroSeries:macro.series,sp500ShadowRows:inputs.price.body.series.SP500,asOfDate});
const rows=evaluation.rows.map(row=>{const parts={...row,breadthDivergence:bScores.get(row.quarter)??null};return {...parts,...scoreAssetBubbleR10Candidate(parts)};});
const latest=rows.filter(r=>r.status==='READY').at(-1);if(!latest)throw Error('R10_NO_COMPLETE_QUARTER');
const previousFile=path.join(base,'local-asset-bubble-r10-release-payload.json');
if(fs.existsSync(previousFile)){
 const previous=JSON.parse(fs.readFileSync(previousFile,'utf8'));
 if(previous?.scoreObservationQuarter&&latest.quarter<previous.scoreObservationQuarter)throw Error('R10_COMPLETE_QUARTER_REGRESSION');
}
const periodEnd=quarter=>new Date(Date.UTC(Number(quarter.slice(0,4)),Number(quarter.at(-1))*3,0)).toISOString().slice(0,10);
const names=['밸류에이션 압력','가격가속','위험자산 비중','투기성 자금흐름','시장폭 괴리','과잉유동성'];
const cutoff=new Date(asOfDate);cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
const sourceStoredAt=Math.max(inputs.macro.storedAt,inputs.price.storedAt,Date.parse(breadth.checkedAt),Date.parse(quality.checkedAt));
const payload={methodologyVersion:'ASSET_BUBBLE_R10_CANDIDATE',status:'READY',score:latest.score,asOfDate,scoreObservationQuarter:latest.quarter,diagnosticQuarter:rows.at(-1).quarter,currentQuarterStatus:rows.at(-1).status,currentQuarterScore:rows.at(-1).score,sourceVersion:macro.sourceVersion+':'+hash({breadth:breadth.latest,quality:quality.latest,quarantinedEvents:quality.quarantinedEvents}),sourceStoredAt,historyMode:'CURRENT_VINTAGE_ONLY',lookAheadSafe:false,rightsStatus:'USER_ACCEPTED_UNVERIFIED',priceQuality:'PROVIDER_DECLARED_WITH_QUARANTINE',publicationPolicy:'USER_APPROVED_CURRENT_VINTAGE_UNVERIFIED_SOURCES',productionEligible:true,missingFactors:[],indicators:Object.entries(ASSET_BUBBLE_R10_WEIGHTS).map(([id,weight],i)=>({id,name:names[i],weight,status:'READY',score:latest[id],value:null,unit:'점',observationDate:latest.observationDate})),trend:rows.filter(r=>r.status==='READY'&&periodEnd(r.quarter)>=cutoff.toISOString().slice(0,10)).map(r=>({label:periodEnd(r.quarter),quarter:r.quarter,value:r.score})),notes:['최신 완료 분기 '+latest.quarter+'의 점수입니다. 현재 분기 '+rows.at(-1).quarter+'는 '+rows.at(-1).status+'이며 이전 분기 점수를 현재 분기로 채우지 않습니다. 차트 날짜는 평가 분기의 종료일입니다.','현재 개정 자료로 재구성한 이력입니다. 당시 발표 시점 기준 백테스트가 아니며 자료 이용 근거와 가격 조정의 독립 검증은 미완료입니다.'],providerRequests:0};
const gate=assetR10PublicationDryRun(payload);if(gate.status!=='PASS')throw Error('R10_RELEASE_GATE_FAILED:'+gate.reasons.join(','));
save(path.join(base,'local-asset-bubble-r10-release-payload.json'),payload);
console.log(JSON.stringify({status:'LOCAL_RELEASE_READY',score:payload.score,scoreObservationQuarter:payload.scoreObservationQuarter,currentQuarterStatus:payload.currentQuarterStatus,trendPoints:payload.trend.length,gate:gate.status,providerRequests:0,remoteWrites:0}));
}
// The explicit Writer CLI marker survives Windows drive/junction aliases: the
// ESM loader may canonicalize an entry path while argv[1] retains its alias.
export function shouldRunR10ReleaseCli({argv=process.argv,modulePath=fileURLToPath(import.meta.url)}={}){
 return argv.includes('--run-r10-release')||Boolean(argv[1]&&path.resolve(argv[1])===modulePath);
}
if(shouldRunR10ReleaseCli())buildRelease();
