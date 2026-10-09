import fs from 'node:fs';import path from 'node:path';
import {base,saveReport,readR10Inputs} from './asset-r10-storage.mjs';
import {pairedBreadthScore} from '../../lib/market-score/asset-r10-breadth-contract.mjs';
const participation=JSON.parse(fs.readFileSync(path.join(base,'local-asset-bubble-r10-alpaca-pit-validation.json')));
const prices=readR10Inputs().price.body.series.SP500.filter(r=>Number.isFinite(r.value)&&r.value>0).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
const returns=[],breadths=[],rows=[];
for(const p of participation.rows){
 if(p.participation===null)continue;const date=p.observationDate;
 const yearEarlier=(Number(date.slice(0,4))-1)+date.slice(4);
 const current=prices.findLast(r=>r.observationDate<=date),previous=prices.findLast(r=>r.observationDate<=yearEarlier);
 // Do not forward-fill across a missing market week.
 const age=r=>(new Date(date)-new Date(r.observationDate))/86400000;
 if(!current||!previous||age(current)>7||(new Date(yearEarlier)-new Date(previous.observationDate))/86400000>7)continue;
 const return12m=current.value/previous.value-1;returns.push(return12m);breadths.push(p.participation);
 const computed=pairedBreadthScore(returns,breadths);const returnRank=computed?.returnRank??null,participationRank=computed?.participationRank??null;
 const gap=computed?.breadthGap??null;
 rows.push({observationDate:date,return12m,participation:p.participation,rankObservations:returns.length,returnRank,participationRank,breadthGap:gap,researchSafetyScore:gap===null?null:100-gap});
}
const chart=rows.filter(r=>r.observationDate>='2025-10-10');
const report={checkedAt:new Date().toISOString(),methodology:'R10_B_RESEARCH_12M_200MA_EXPANDING_252_MIDRANK',formulaApproved:true,approvalBasis:'USER_2026_10_10_FINISH_FOUR_AND_DEPLOY',contractDocument:'docs/ASSET_R10_B_OPERATIONAL_CONTRACT.md',productionEligible:false,providerRequests:0,minimumObservations:252,minimumIsResearchProposal:false,normalization:'expanding same-date paired observations including current; tie midrank',chartObservations:chart.length,chartScoredObservations:chart.filter(r=>r.researchSafetyScore!==null).length,latest:rows.at(-1),limitations:['PRICE_SOURCE_CROSSCHECK_PENDING','CURRENT_VINTAGE_SP500_INPUT'],rows};
saveReport('breadth-research',report);console.log(JSON.stringify({...report,rows:undefined},null,2));
