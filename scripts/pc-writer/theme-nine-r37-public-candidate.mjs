// Private, network-free conversion from the validated R32 shadow schema to the
// separate R37 reader schema. NEVER authorizes or publishes a result.
import {createHash} from 'node:crypto';

export const R37_CANDIDATE_CONTRACT='THEME_NINE_R37_PRIVATE_PUBLICATION_CANDIDATE_V1';
const rosterSha='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const fail=message=>{throw new Error('THEME_NINE_R37_'+message);};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const score=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const day=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
 Number.isFinite(Date.parse(x+'T00:00:00Z'));

export function buildNineR37PrivateCandidate({shadow,shadowBytes,roster,aumEvidenceBytes,r25InputSha256}={}){
 if(!shadow||shadow.contract!=='THEME_NINE_R32_PRIVATE_STAGE5_SHADOW_V1'||
  shadow.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'||
  shadow.status!=='PRIVATE_STAGE5_CALCULATED_NOT_PUBLISHED'||
  shadow.publicationAuthorized!==false||shadow.source?.rosterSha256!==rosterSha||
  shadow.source?.scoreBenchmarkDate!==shadow.benchmarkDate||
  shadow.counts?.themes!==9||shadow.counts?.candidatePositions!==64||
  shadow.counts?.uniqueETFs!==63||shadow.counts?.tradingDates!==252||
  !day(shadow.benchmarkDate))fail('SHADOW_CONTRACT');
 if(!Array.isArray(roster?.groups)||roster.groups.length!==9||
  roster.groups.flatMap(g=>g.tickers).length!==64||
  new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker))).size!==63)
  fail('ROSTER_CONTRACT');
 if(!(shadowBytes instanceof Uint8Array)||!(aumEvidenceBytes instanceof Uint8Array)||
  typeof r25InputSha256!=='string'||!/^[a-f0-9]{64}$/.test(r25InputSha256)||
  shadowBytes.length===0||aumEvidenceBytes.length===0)fail('ORIGINAL_BYTES_REQUIRED');
 let decoded;try{decoded=JSON.parse(new TextDecoder().decode(shadowBytes));}catch{fail('SHADOW_FILE_JSON');}
 if(JSON.stringify(decoded)!==JSON.stringify(shadow))fail('SHADOW_FILE_MISMATCH');
 const aum=shadow.aumEvidenceAsOf;
 const symbols=[...new Set(roster.groups.flatMap(g=>g.tickers.map(t=>t.ticker)))];
 if(!aum||Object.keys(aum).length!==63||
  symbols.some(s=>!day(aum[s])||aum[s]>shadow.benchmarkDate))fail('AUM_ORIGINAL_DATES');
 if(!Array.isArray(shadow.themes)||shadow.themes.length!==9)fail('NINE_THEMES');
 const dates=shadow.themes[0]?.history?.map(p=>p.date);
 if(!Array.isArray(dates)||dates.length!==252||dates.at(-1)!==shadow.benchmarkDate||
  dates.some((d,i)=>!day(d)||(i&&d<=dates[i-1])))fail('HISTORY_DATES');
 const themes=shadow.themes.map((t,i)=>{
  const expected=roster.groups[i],etfs=expected.tickers.map(row=>row.ticker);
  if(t.theme!==expected.theme||t.positions!==etfs.length||
   t.history?.length!==252||t.scoredDates!==252||t.missingDates!==0||
   !score(t.latest?.score)||t.latest.date!==shadow.benchmarkDate)fail('THEME_SHAPE');
  const history=t.history.map((point,j)=>{
   if(point.date!==dates[j]||!score(point.score)||
    !Array.isArray(point.contributingETFs)||
    !point.contributingETFs.every(s=>etfs.includes(s)))fail('HISTORY_POINT');
   return {date:point.date,score:point.score};
  });
  if(Math.abs(history.at(-1).score-t.latest.score)>1e-6)fail('LATEST_SCORE');
  return {theme:t.theme,etfs,score:t.latest.score,history};
 });
 return {
  contract:R37_CANDIDATE_CONTRACT,
  status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',
  version:'THEME_LEGACY_NINE_R37_PUBLIC_V1',
  sourceContract:shadow.contract,
  sourcePriceMode:shadow.priceMode,
  methodologyVersion:'ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32',
  historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
  rosterSha256:rosterSha,benchmark:'SPY',individualStocksUsed:0,
  ETFPositions:64,uniqueETFs:63,
  observationDate:shadow.benchmarkDate,phase:'CONFIRMED',
  rawManifestSha256:shadow.source.rawManifestSha256,
  r25InputSha256,shadowSha256:hash(shadowBytes),
  officialAumEvidenceSha256:hash(aumEvidenceBytes),
  officialAumAsOf:{...aum},themes,
  sourceStoredAt:null,publishedAt:null,
  publicationAuthorized:false,upstreamCommercialRightsVerified:false,
  derivedLicenseVerified:false,sourcePriceReconciled:false,
  sourceManifestVerified:false,privateReplayVerified:false,
  derivedOnlyNoRaw:true,
  providerCalls:0,d1Writes:0,schedulerWrites:0,
 };
}
