// R47 private nine-theme update: exact R32 date reducer, no new scoring formula.
// Official dated AUM is carried forward only in the private shadow from the
// existing explicit R32 approval anchor. Its original as-of is never relabelled.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {mixNineR32Date} from './theme-nine-r32-private-aggregate.mjs';

const fail=code=>{throw Object.assign(new Error('THEME_NINE_R47_'+code),
  {code:'THEME_NINE_R47_'+code});};
const sha=x=>createHash('sha256').update(x).digest('hex');
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;

export function calculateNineR47PrivateThemes({scores,roster,aum,approval,
  rosterBytes}={}){
  if(!scores||scores.contract!=='THEME_NINE_R47_PRIVATE_INCREMENTAL_INDIVIDUAL_V1'||
     !scores.candidateRosterUnchanged||scores.publicationAuthorized!==false||
     scores.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'||
     scores.approvedFormula!=='EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40')
    fail('R47_SCORES_CONTRACT');
  if(!roster||!Array.isArray(roster.groups)||roster.groups.length!==9||
     roster.groups.reduce((n,g)=>n+g.tickers.length,0)!==64||
     !Buffer.isBuffer(rosterBytes)||sha(rosterBytes)!==scores.source.rosterSha256)
    fail('APPROVED_ROSTER_INTEGRITY');
  const tickers=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))].sort();
  if(tickers.length!==63||tickers.includes('SPY')||
     tickers.some(t=>!Object.hasOwn(scores.individual,t)))fail('APPROVED_TICKER_SET');
  if(!Array.isArray(scores.latest252TradingDates)||
     scores.latest252TradingDates.length!==252||
     scores.latest252TradingDates.some((day,i,a)=>!validDate(day)||(i&&day<=a[i-1]))||
     scores.latest252TradingDates.at(-1)!==scores.source.latestSpySessionDate)
    fail('APPROVED_252_DATE_SHAPE');
  const benchmarkDate=scores.source.latestSpySessionDate;
  if(!approval||approval.contract!=='THEME_NINE_R32_DATED_AUM_PRIVATE_APPROVAL_V1'||
     approval.scope!=='PRIVATE_STAGE5_AND_STAGE6_SHADOW_ONLY'||
     approval.policy!=='USE_VERIFIED_OFFICIAL_ISSUER_AUM_WITH_ORIGINAL_AS_OF_DATE'||
     !validDate(approval.scoreBenchmarkDate)||benchmarkDate<approval.scoreBenchmarkDate||
     approval.candidateRosterSha256!==scores.source.rosterSha256||
     approval.evidenceContract!=='THEME_NINE_R26_OFFICIAL_AUM_RESEARCH_EVIDENCE_V1'||
     approval.doNotInventAum!==true||approval.doNotRelabelAumDates!==true||
     approval.doNotImposeUnapprovedMaximumLag!==true||
     approval.doNotReconstructHistoricalAum!==true||
     approval.publicationAuthorized!==false)fail('DATED_AUM_PRIVATE_ANCHOR_INVALID');
  if(!aum||aum.contract!==approval.evidenceContract||
     aum.status!=='RESEARCH_ONLY_NOT_APPROVED_FOR_LIVE_R32_WEIGHTS'||
     aum.candidateRosterSha256!==scores.source.rosterSha256||
     aum.currency!=='USD'||!Array.isArray(aum.rows)||aum.rows.length!==63)
    fail('AUM_SOURCE_INVALID');
  const byAum=new Map(aum.rows.map(row=>[row.ticker,row]));
  if(byAum.size!==63||tickers.some(t=>!byAum.has(t)))fail('AUM_TICKER_SET');
  for(const row of aum.rows){
    if(!(row.aumUsd>0)||!Number.isFinite(row.aumUsd)||!validDate(row.aumAsOf)||
       row.aumAsOf>benchmarkDate||!row.quality?.startsWith('OFFICIAL_')||
       !row.issuerUrl?.startsWith('https://')||
       typeof row.amountApproximate!=='boolean')fail('DATED_AUM_EVIDENCE_INVALID');
  }
  for(const ticker of tickers){
    const v=scores.individual[ticker];
    if(v?.symbol!==ticker||!Array.isArray(v.history)||v.history.length!==252||
       v.history.some((item,i)=>item.date!==scores.latest252TradingDates[i]||
         !Number.isInteger(item.realSessionCount)||item.realSessionCount<0||
         (item.score!==null&&(!Number.isFinite(item.score)||item.score<0||
          item.score>100||item.realSessionCount<40||
          !['ADAPTIVE_PROVISIONAL','R188_COMPATIBLE'].includes(item.status)))))
      fail('R47_INDIVIDUAL_HISTORY_INVALID');
  }
  const themes=roster.groups.map(g=>{
    const history=scores.latest252TradingDates.map((date,i)=>{
      const eligible=g.tickers.flatMap(({ticker})=>{
        const v=scores.individual[ticker].history[i];
        if(v.score===null)return [];
        const money=byAum.get(ticker);
        return [{ticker,score:v.score,sessions:v.realSessionCount,
          status:v.status,aumUsd:money.aumUsd,aumAsOf:money.aumAsOf}];
      });
      // The exact R32 reducer applies approved 2-ETF weights and 3+ official AUM.
      return mixNineR32Date({date,rows:eligible,benchmarkDate,
        allowDatedOfficialAum:true});
    });
    return {theme:g.theme,positions:g.tickers.length,
      scoredDates:history.filter(d=>d.score!==null).length,
      missingDates:history.filter(d=>d.score===null).length,
      latest:history.at(-1),history};
  });
  return {contract:'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
    status:'PRIVATE_STAGE5_REFRESHED_NOT_PUBLISHED',
    approvedFormula:'EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40',
    aggregation:'EXACT_EXISTING_R32_DATE_REDUCER',priceMode:scores.priceMode,
    benchmarkDate,source:scores.source,
    aumPolicy:'USE_VERIFIED_OFFICIAL_ISSUER_AUM_WITH_ORIGINAL_AS_OF_DATE',
    aumPrivateApprovalAnchorDate:approval.scoreBenchmarkDate,
    aumCarriedForwardPastPrivateApprovalAnchor:benchmarkDate>approval.scoreBenchmarkDate,
    aumEvidenceAsOf:Object.fromEntries(aum.rows.map(r=>[r.ticker,r.aumAsOf])),
    officialAumNotReconstructedAsHistorical:true,
    datedOfficialAumContributorDays:themes.reduce((n,t)=>n+
      t.history.filter(d=>d.datedOfficialAumUsed).length,0),
    counts:{themes:9,approvedETFPositions:64,uniqueApprovedETFs:63,
      tradingDates:252},themes,publicationAuthorized:false,
    providerCalls:0,dbWrites:0,d1Writes:0,schedulerWrites:0,
    formulaWrites:0,publicationWrites:0};
}

export function loadNineR47OfficialEvidence({configDirectory,rosterPath}={}){
  if(!configDirectory||!rosterPath)fail('EVIDENCE_PATHS_REQUIRED');
  const rosterBytes=fs.readFileSync(rosterPath);
  return {rosterBytes,roster:JSON.parse(rosterBytes),
    aum:JSON.parse(fs.readFileSync(path.join(configDirectory,
      'theme-nine-r26-official-aum-evidence.json'),'utf8')),
    approval:JSON.parse(fs.readFileSync(path.join(configDirectory,
      'theme-nine-r32-dated-aum-approval.json'),'utf8'))};
}
