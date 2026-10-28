// R48: convert only SHA-verified R47 PRIVATE files into an R37 PRIVATE
// publication candidate. This module grants no rights and never writes D1.
import {createHash} from 'node:crypto';

export const R48_R47_SOURCE_CONTRACT='THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1';
export const R48_R37_VERSION='THEME_LEGACY_NINE_R37_PUBLIC_V1';
export const R48_R37_METHOD='ETF_ONLY_T40_R20_V40_ADAPTIVE_R2_DATED_ISSUER_AUM_R32';
export const R48_ROSTER_SHA='e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c';
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R48_'+code),{code:'THEME_NINE_R48_'+code});};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const day=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&
  !Number.isNaN(Date.parse(v+'T00:00:00Z'))&&
  new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
const value=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=100;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const bytesEqualObject=(bytes,parsed,code)=>{
  if(!(bytes instanceof Uint8Array)||bytes.length<2)fail(code);
  let fromBytes;
  try{fromBytes=JSON.parse(new TextDecoder().decode(bytes));}catch{fail(code);}
  if(JSON.stringify(fromBytes)!==JSON.stringify(parsed))fail(code);
};

export function buildNineR48PrivatePublicationCandidate({individual,individualBytes,
  themes,themesBytes,roster,rosterBytes,aumEvidenceBytes}={}){
  bytesEqualObject(individualBytes,individual,'INDIVIDUAL_BYTES_MISMATCH');
  bytesEqualObject(themesBytes,themes,'THEMES_BYTES_MISMATCH');
  bytesEqualObject(rosterBytes,roster,'ROSTER_BYTES_MISMATCH');
  if(hash(rosterBytes)!==R48_ROSTER_SHA)fail('APPROVED_ROSTER_SHA_DRIFT');
  if(!(aumEvidenceBytes instanceof Uint8Array)||!aumEvidenceBytes.length)
    fail('OFFICIAL_AUM_BYTES_REQUIRED');
  let evidence;
  try{evidence=JSON.parse(new TextDecoder().decode(aumEvidenceBytes));}
  catch{fail('OFFICIAL_AUM_INVALID');}
  const groups=roster?.groups;
  if(!Array.isArray(groups)||groups.length!==9||
    groups.reduce((n,g)=>n+g.tickers.length,0)!==64)fail('ROSTER_SHAPE');
  const symbols=[...new Set(groups.flatMap(g=>g.tickers.map(t=>t.ticker)))];
  if(symbols.length!==63||symbols.includes('SPY')||
    evidence?.candidateRosterSha256!==R48_ROSTER_SHA||
    evidence?.status!=='RESEARCH_ONLY_NOT_APPROVED_FOR_LIVE_R32_WEIGHTS'||
    !Array.isArray(evidence.rows)||evidence.rows.length!==63)
    fail('AUM_EVIDENCE_RESEARCH_CONTRACT');
  if(themes?.contract!==R48_R47_SOURCE_CONTRACT||
    themes.status!=='PRIVATE_STAGE5_REFRESHED_NOT_PUBLISHED'||
    themes.publicationAuthorized!==false||
    themes.priceMode!=='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'||
    themes.aggregation!=='EXACT_EXISTING_R32_DATE_REDUCER'||
    themes.approvedFormula!=='EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40'||
    themes.counts?.themes!==9||themes.counts?.approvedETFPositions!==64||
    themes.counts?.uniqueApprovedETFs!==63||themes.counts?.tradingDates!==252||
    !day(themes.benchmarkDate)||!Array.isArray(themes.themes)||themes.themes.length!==9)
    fail('THEMES_PRIVATE_CONTRACT');
  if(individual?.contract!=='THEME_NINE_R47_PRIVATE_INCREMENTAL_INDIVIDUAL_V1'||
    individual.publicationAuthorized!==false||
    individual.priceMode!==themes.priceMode||
    individual.source?.rosterSha256!==R48_ROSTER_SHA||
    individual.source?.latestSpySessionDate!==themes.benchmarkDate||
    JSON.stringify(individual.source)!==JSON.stringify(themes.source)||
    !Array.isArray(individual.latest252TradingDates)||
    individual.latest252TradingDates.length!==252||
    individual.latest252TradingDates.at(-1)!==themes.benchmarkDate)
    fail('INDIVIDUAL_PRIVATE_CONTRACT');
  const source=themes.source;
  if(!sha(source.baselineManifestSha256)||
    (source.deltaManifestSha256!==null&&!sha(source.deltaManifestSha256))||
    !Array.isArray(source.deltaCompletedWindows)||
    !source.deltaCompletedWindows.every(w=>day(w.start)&&day(w.end)&&day(w.spyDay)&&
      w.start<=w.spyDay&&w.spyDay<=w.end)||
    !Number.isInteger(source.deltaVerifiedPageReferences)||
    source.deltaVerifiedPageReferences<0)
    fail('SOURCE_MANIFEST_PROVENANCE');
  const asOf=themes.aumEvidenceAsOf;
  const officialAsOf=new Map(evidence.rows.map(row=>[row.ticker,row.aumAsOf]));
  if(officialAsOf.size!==63||!asOf||Object.keys(asOf).length!==63||
    symbols.some(s=>!day(asOf[s])||asOf[s]!==officialAsOf.get(s)||
      asOf[s]>themes.benchmarkDate))fail('ORIGINAL_AUM_DATES');
  const dates=individual.latest252TradingDates;
  if(dates.some((d,i)=>!day(d)||(i>0&&d<=dates[i-1])))fail('DATE_ORDER');
  const publicThemes=themes.themes.map((item,i)=>{
    const expected=groups[i],etfs=expected.tickers.map(t=>t.ticker);
    if(item?.theme!==expected.theme||item.positions!==etfs.length||
      item.scoredDates!==252||item.missingDates!==0||
      !value(item.latest?.score)||item.latest.date!==themes.benchmarkDate||
      !Array.isArray(item.history)||item.history.length!==252)
      fail('THEME_SHAPE');
    const history=item.history.map((p,j)=>{
      if(p?.date!==dates[j]||!value(p.score)||
        !Array.isArray(p.contributingETFs)||
        !p.contributingETFs.every(s=>etfs.includes(s))||
        p.datedOfficialAumUsed!==true)fail('HISTORY_POINT');
      return {date:p.date,score:p.score};
    });
    if(Math.abs(history.at(-1).score-item.latest.score)>0.000001)
      fail('LATEST_SCORE_MISMATCH');
    return {theme:item.theme,etfs,score:item.latest.score,history};
  });
  const rawManifestSha256=hash(Buffer.from(JSON.stringify({
    baselineManifestSha256:source.baselineManifestSha256,
    deltaManifestSha256:source.deltaManifestSha256,
    deltaCompletedWindows:source.deltaCompletedWindows,
  })));
  return {
    contract:'THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1',
    status:'PRIVATE_CANDIDATE_NOT_PUBLISHED',version:R48_R37_VERSION,
    sourceContract:R48_R47_SOURCE_CONTRACT,
    sourcePriceMode:themes.priceMode,methodologyVersion:R48_R37_METHOD,
    historicalAumMode:'FIXED_OFFICIAL_ISSUER_AUM_SNAPSHOT_WITH_ORIGINAL_DATES',
    rosterSha256:R48_ROSTER_SHA,benchmark:'SPY',individualStocksUsed:0,
    ETFPositions:64,uniqueETFs:63,observationDate:themes.benchmarkDate,
    phase:'CONFIRMED',rawManifestSha256,
    baselineManifestSha256:source.baselineManifestSha256,
    deltaManifestSha256:source.deltaManifestSha256,
    r25InputSha256:hash(individualBytes),shadowSha256:hash(themesBytes),
    officialAumEvidenceSha256:hash(aumEvidenceBytes),
    officialAumAsOf:{...asOf},themes:publicThemes,
    sourceStoredAt:null,publishedAt:null,
    publicationAuthorized:false,upstreamCommercialRightsVerified:false,
    derivedLicenseVerified:false,sourcePriceReconciled:false,
    sourceManifestVerified:false,privateReplayVerified:false,
    derivedOnlyNoRaw:true,providerCalls:0,d1Writes:0,schedulerWrites:0,
  };
}
