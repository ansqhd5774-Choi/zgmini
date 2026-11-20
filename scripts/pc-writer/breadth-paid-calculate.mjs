// Reuse the approved B1-R1 coverage and B1-R4/R5 factor + smoothing functions.
import {createHash} from 'node:crypto';
import {buildBreadthB1R1} from '../../lib/market-score/breadth-b1-r1.mjs';
import {readBreadthB1R5StoredScore} from '../../lib/market-score/breadth-b1-r5-reader.mjs';
import {projectBreadthB1R5PublicDomain,assertBreadthB1R5PublicContract} from '../../lib/market-score/breadth-b1-r5-worker-domain.mjs';
import {PAID_BREADTH_VERSION,PAID_BREADTH_SOURCE,validPaidBreadthRecord} from '../../worker/breadth-paid-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const need=(ok,code)=>{if(!ok)throw Object.assign(Error(code),{code});};
export async function calculatePaidBreadth(input,{now=Date.now(),previous=null}={}){
 const {rows,members,pairs,receipt,currentReceipt,previousReceipt}=input,last=rows.at(-1),end=last.trade_date,at=new Date(now).toISOString();
 const check=buildBreadthB1R1({observationDate:end,snapshot:{asOfDate:end,isDaily:true,constituentCount:members.length,unlinkedCount:0,source:PAID_BREADTH_SOURCE,members:members.map(ticker=>({ticker,weight:1,isLinked:true}))},pricePairs:pairs.map(p=>({ticker:p.ticker,previousDate:p.previous_date,currentDate:p.trade_date,previousClose:p.previous_close,currentClose:p.current_close,currentVolume:p.current_volume})),lagTradingSessions:0});
 need(check.status==='READY','BREADTH_PAID_CURRENT_COVERAGE');
 need(Math.abs(check.components.advanceRatio-last.advance_units/last.return_count)<1e-12&&Math.abs(check.components.advanceValueShare-last.advance_value/last.total_value)<1e-10,'BREADTH_PAID_INDEPENDENT_AGGREGATE_MISMATCH');
 const store={initialize:async()=>{},latestUniverses:async()=>[{trade_date:end,members,memberCount:members.length}],getPairs:async()=>pairs,getScoreTrend:async()=>rows.filter(r=>r.return_count/r.member_count>=.98&&r.value_count/r.member_count>=.98&&r.total_value>0).slice(-260).map(r=>({tradeDate:r.trade_date,advanceRatio:r.advance_units/r.return_count,advanceValueShare:r.advance_value/r.total_value}))};
 const result=await readBreadthB1R5StoredScore({store,asOfDate:at.slice(0,10),now:()=>new Date(now)});need(result.status==='READY','BREADTH_PAID_APPROVED_SCORE_NOT_READY');
 const domain=projectBreadthB1R5PublicDomain(result,at);assertBreadthB1R5PublicContract(domain);
 if(previous){need(validPaidBreadthRecord(previous)&&previous.observationDate<=end,'BREADTH_PAID_PRIOR_RECORD');const cutoff=previous.domain.trend.at(-1).label;domain.trend=[...previous.domain.trend,...domain.trend.filter(p=>p.label>cutoff)].slice(-260);domain.score=domain.trend.at(-1).value;}
 const inputSha256=[receipt.sha256,...(currentReceipt&&previousReceipt?[currentReceipt.sha256,previousReceipt.sha256]:[])];
 const record={version:PAID_BREADTH_VERSION,plan:'full',source:PAID_BREADTH_SOURCE,sourceVersion:sha(JSON.stringify({inputSha256,pitSha256:receipt.pitSha256,end,method:domain.methodologyVersion})),pitSha256:receipt.pitSha256,inputSha256,observationDate:end,sourceLatestDate:receipt.end,sourceStoredAt:[receipt.sourceStoredAt,currentReceipt?.collectedAt,previousReceipt?.collectedAt].filter(Boolean).sort().at(-1),updatedAt:at,domain,quality:{...check.quality}};
 need(validPaidBreadthRecord(record),'BREADTH_PAID_RECORD_INVALID');return record;
}
