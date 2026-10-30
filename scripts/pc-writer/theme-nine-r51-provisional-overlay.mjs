// R51: connect already-calculated R47/R48 nine-theme scores to the SAME
// provisional dates exposed by the existing public ten-theme dashboard.
// Never guesses dates, changes R2/R25/R32, fetches raw prices or publishes.
import {createHash} from 'node:crypto';
import {
  R48_R37_METHOD as THEME_NINE_R37_METHOD,
  R48_ROSTER_SHA as THEME_NINE_R37_ROSTER_SHA,
  R48_R37_VERSION as THEME_NINE_R37_VERSION,
} from './theme-nine-r48-r47-bridge.mjs';

// Immutable mirror of the existing R37 approved roster: this file is deployed
// beside the R48 bridge on Windows, where ../../worker/ does not exist.
// The public R37 reader independently validates the same roster on publish.
const THEME_NINE_R37_ROSTER=[
  {theme:'로봇·자동화',etfs:['BOTZ','ROBO','ROBT','ARKQ','HUMN','RBTX','CBOT']},
  {theme:'클라우드·SaaS',etfs:['SKYY','CLOU','WCLD','FCLD','CLOD']},
  {theme:'자율주행',etfs:['DRIV','BOTZ','IDRV','HAIL','CABZ','KARS']},
  {theme:'원전·SMR',etfs:['NLR','URA','URNM','NUKZ','URNJ','URAN']},
  {theme:'방산',etfs:['ITA','SHLD','XAR','PPA','NATO','WR']},
  {theme:'핀테크',etfs:['FINX','ARKF','IPAY','BPAY','KYC','LATR']},
  {theme:'사이버보안',etfs:['CIBR','BUG','HACK','IHAK','WCBR','SPAM','PSWD','XA']},
  {theme:'AI·반도체',etfs:['SMH','SOXX','SOXQ','XSD','ARTY','AIQ','CHAT','PSI','EUV','DRAM','LLMA']},
  {theme:'바이오·신약',etfs:['IBB','XBI','BBH','PBE','GNOM','ARKG','SBIO','FBT','GNMX']},
];
export const R51_APPROVED_ROSTER=THEME_NINE_R37_ROSTER;

const CONTRACT='THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1';
const PRICE='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE';
export const R51_PUBLIC_LEGACY_SOURCE='EXISTING_PUBLIC_PROVISIONAL_AS_PUBLISHED';
const validDate=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&
  !Number.isNaN(Date.parse(x+'T00:00:00Z'))&&
  new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
const sha=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fail=code=>{throw Object.assign(new Error('THEME_NINE_R51_'+code),
  {code:'THEME_NINE_R51_'+code});};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const falseFlags=[
  'publicationAuthorized','upstreamCommercialRightsVerified',
  'derivedLicenseVerified','sourcePriceReconciled','sourceManifestVerified',
  'privateReplayVerified',
];

function verify(candidate){
  if(!candidate||candidate.contract!==CONTRACT||
    candidate.status!=='PRIVATE_CANDIDATE_NOT_PUBLISHED'||
    candidate.version!==THEME_NINE_R37_VERSION||
    candidate.methodologyVersion!==THEME_NINE_R37_METHOD||
    candidate.sourcePriceMode!==PRICE||
    candidate.rosterSha256!==THEME_NINE_R37_ROSTER_SHA||
    candidate.phase!=='CONFIRMED'||candidate.ETFPositions!==64||
    candidate.uniqueETFs!==63||candidate.individualStocksUsed!==0||
    !falseFlags.every(k=>candidate[k]===false)||
    !validDate(candidate.observationDate)||
    !Array.isArray(candidate.themes)||candidate.themes.length!==9)
    fail('SOURCE_CONTRACT');
  let common=null;
  for(let i=0;i<9;i++){
    const row=candidate.themes[i],approved=THEME_NINE_R37_ROSTER[i];
    if(row?.theme!==approved.theme||!same(row.etfs,approved.etfs)||
      !Array.isArray(row.history)||row.history.length!==252||
      !validScore(row.score))fail('SOURCE_THEMES');
    const dates=row.history.map(p=>p?.date);
    if(dates.some((d,j)=>!validDate(d)||(j>0&&d<=dates[j-1])||
      !validScore(row.history[j]?.score))||
      dates.at(-1)!==candidate.observationDate||
      Math.abs(row.history.at(-1).score-row.score)>0.000001||
      (common&&!same(common,dates)))fail('SOURCE_DATES_OR_SCORES');
    common??=dates;
  }
  return common;
}

// The public R2 feed publishes different theme subsets on different
// provisional dates (3 on 26 Oct, 7 on 27 Oct). These published numbers
// are NOT R32 scores. Carry them through byte-for-byte in value and key order
// while R32 replaces only the independently verified confirmed histories.
export function buildNineR51ExistingPublicProvisionalOverlay({confirmed,publicBase}={}){
  const confirmedDates=verify(confirmed);
  const baseDate=publicBase?.confirmedObservationDate??publicBase?.observationDate;
  const pending=publicBase?.provisional?.points;
  if(publicBase?.status!=='READY'||publicBase.phase!=='PROVISIONAL'||
    !Array.isArray(publicBase.themes)||publicBase.themes.length<7||
    !validDate(baseDate)||baseDate!==confirmed.observationDate||
    publicBase.observationDate!==baseDate||
    !Array.isArray(pending)||pending.length<1||pending.length>32||
    !same(publicBase.themes[0]?.history?.map(p=>p.date),confirmedDates)||
    typeof publicBase.methodologyVersion!=='string'||
    !publicBase.methodologyVersion||typeof publicBase.version!=='string')
    fail('PUBLIC_LEGACY_ANCHOR');
  const visible=new Set(publicBase.themes.map(t=>t.theme));
  // The existing public feed may retain an earlier provisional session
  // after its confirmed anchor advances. Preserve that published history;
  // only require the public provisional points themselves to be ordered.
  let previous=null;
  const points=pending.map((point,i)=>{
    if(!validDate(point?.date)||
      (i>0&&point.date<=previous)||
      !point.scores||typeof point.scores!=='object'||
      Array.isArray(point.scores)||
      !Object.keys(point.scores).length||
      Object.entries(point.scores).some(([name,value])=>
        !visible.has(name)||!validScore(value)))
      fail('PUBLIC_LEGACY_PROVISIONAL_CONTRACT');
    previous=point.date;
    return {date:point.date,scores:{...point.scores}};
  });
  return {...confirmed,phase:'PROVISIONAL',
    provisional:{asOf:publicBase.provisional.asOf??null,points},
    provisionalLegacyMethodologyVersion:publicBase.methodologyVersion,
    provisionalLegacySourceVersion:publicBase.sourceVersion??null,
    provisionalLineage:{source:R51_PUBLIC_LEGACY_SOURCE,
      confirmedCandidateSha256:sha(confirmed),latestCandidateSha256:null,
      confirmedObservationDate:baseDate,latestObservationDate:baseDate,
      publicVersion:publicBase.version,
      publicProvisionalEndDate:previous,
      publicProvisionalPointsSha256:sha(points),
      sameMethodology:false,overlappingHistoryIdentical:true},
    ...Object.fromEntries(falseFlags.map(k=>[k,false])),
    sourceStoredAt:null,publishedAt:null,
    providerCalls:0,d1Writes:0,schedulerWrites:0};
}

export function buildNineR51PrivateProvisionalOverlay({confirmed,latest,publicBase}={}){
  const confirmedDates=verify(confirmed),latestDates=verify(latest);
  if(confirmed.methodologyVersion!==latest.methodologyVersion||
    !same(confirmed.themes.map(t=>t.etfs),latest.themes.map(t=>t.etfs))||
    !same(confirmed.officialAumAsOf,latest.officialAumAsOf)||
    confirmed.observationDate>=latest.observationDate)
    fail('SOURCE_METHOD_OR_ORDER');
  const baseDate=publicBase?.confirmedObservationDate??publicBase?.observationDate;
  const pending=publicBase?.provisional?.points;
  if(publicBase?.status!=='READY'||publicBase.phase!=='PROVISIONAL'||
    !Array.isArray(publicBase.themes)||publicBase.themes.length<7||
    !validDate(baseDate)||baseDate!==confirmed.observationDate||
    publicBase.observationDate!==baseDate||
    !Array.isArray(pending)||pending.length<1||pending.length>2||
    !same(publicBase.themes[0]?.history?.map(p=>p.date),confirmedDates))
    fail('PUBLIC_CONFIRMED_ANCHOR');
  let previous=baseDate;
  for(let i=0;i<pending.length;i++){
    const point=pending[i];
    // The actual public R2 projection may contain a first provisional point
    // for the very same confirmed SPY session. Preserve its published date,
    // and still forbid any older date or any duplicate after that first point.
    if(!validDate(point?.date)||point.date<previous||
      (i>0&&point.date<=previous)||
      !latestDates.includes(point.date))fail('PROVISIONAL_DATES_MISSING');
    previous=point.date;
  }
  // A later R48 snapshot already contains the requested provisional date in
  // its verified 252-day score history. Reuse that exact historical point;
  // do not require an otherwise unnecessary single-day R48 snapshot.
  if(previous>latest.observationDate)fail('LATEST_SOURCE_BEFORE_PROVISIONAL_END');
  const fixed=new Set(confirmedDates);
  for(let i=0;i<9;i++){
    const initial=new Map(confirmed.themes[i].history.map(p=>[p.date,p.score]));
    for(const point of latest.themes[i].history){
      if(fixed.has(point.date)&&point.score!==initial.get(point.date))
        fail('CONFIRMED_HISTORY_RECALC_DRIFT');
    }
  }
  const lookup=latest.themes.map(t=>new Map(t.history.map(p=>[p.date,p.score])));
  const points=pending.map(point=>({date:point.date,
    scores:Object.fromEntries(THEME_NINE_R37_ROSTER.map((t,i)=>{
      const s=lookup[i].get(point.date);
      if(!validScore(s))fail('NINE_PROVISIONAL_SCORE_MISSING');
      return [t.theme,s];
    }))}));
  return {...confirmed,phase:'PROVISIONAL',
    provisional:{asOf:publicBase.provisional.asOf??null,points},
    provisionalLineage:{source:'R47_R48_SAME_PRICE_MODE_EXISTING_SCORES',
      confirmedCandidateSha256:sha(confirmed),latestCandidateSha256:sha(latest),
      confirmedObservationDate:baseDate,latestObservationDate:latest.observationDate,
      publicProvisionalEndDate:previous,
      sameMethodology:true,overlappingHistoryIdentical:true},
    // Public approval remains strictly external. This is a private candidate.
    ...Object.fromEntries(falseFlags.map(k=>[k,false])),
    sourceStoredAt:null,publishedAt:null,
    providerCalls:0,d1Writes:0,schedulerWrites:0};
}
