import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNineR48PrivatePublicationCandidate} from '../scripts/pc-writer/theme-nine-r48-r47-bridge.mjs';
import {eligibleNineR37} from '../worker/theme-nine-r37-public.mjs';

const rosterBytes=fs.readFileSync(new URL('../config/theme-nine-r20-approved-candidates.json',import.meta.url));
const aumEvidenceBytes=fs.readFileSync(new URL('../config/theme-nine-r26-official-aum-evidence.json',import.meta.url));
const roster=JSON.parse(rosterBytes);
const dates=Array.from({length:252},(_,i)=>new Date(
  Date.parse('2026-10-26T00:00:00Z')-(251-i)*86_400_000).toISOString().slice(0,10));
const source={baselineManifestSha256:'a'.repeat(64),baselineRawPages:121,
  deltaManifestSha256:'b'.repeat(64),deltaCompletedWindows:[
    {start:'2026-10-23',end:'2026-10-27',spyDay:'2026-10-26'}],
  deltaVerifiedPageReferences:62,
  rosterSha256:'e2ea97ce0ed0bf15cb083237d63d3cf520e090d8bd229a837bad393c3f8b0c6c',
  latest252SpySessions:252,latestSpySessionDate:'2026-10-26'};
const asOf=Object.fromEntries(JSON.parse(aumEvidenceBytes).rows.map(r=>[r.ticker,r.aumAsOf]));
const individual={contract:'THEME_NINE_R47_PRIVATE_INCREMENTAL_INDIVIDUAL_V1',
  priceMode:'RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE',publicationAuthorized:false,
  source,latest252TradingDates:dates};
const themes={contract:'THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1',
  status:'PRIVATE_STAGE5_REFRESHED_NOT_PUBLISHED',publicationAuthorized:false,
  priceMode:individual.priceMode,
  approvedFormula:'EXACT_EXISTING_THEME_OPTIONAL_ADAPTIVE_R2_T40_R20_V40',
  aggregation:'EXACT_EXISTING_R32_DATE_REDUCER',benchmarkDate:'2026-10-26',
  counts:{themes:9,approvedETFPositions:64,uniqueApprovedETFs:63,tradingDates:252},
  source,aumEvidenceAsOf:asOf,
  themes:roster.groups.map(g=>({theme:g.theme,positions:g.tickers.length,
    scoredDates:252,missingDates:0,
    latest:{date:'2026-10-26',score:50},
    history:dates.map(date=>({date,score:50,
      contributingETFs:[g.tickers[0].ticker],datedOfficialAumUsed:true}))}))};
const encode=x=>Buffer.from(JSON.stringify(x)+'\n');
const make=(overrides={})=>buildNineR48PrivatePublicationCandidate({
  individual,individualBytes:encode(individual),themes,themesBytes:encode(themes),
  roster,rosterBytes,aumEvidenceBytes,...overrides});

test('R47 nine × 252 is converted to a private R37 candidate with no authority',()=>{
 const candidate=make();
 assert.equal(candidate.sourceContract,themes.contract);
 assert.equal(candidate.status,'PRIVATE_CANDIDATE_NOT_PUBLISHED');
 assert.equal(candidate.publicationAuthorized,false);
 assert.equal(candidate.upstreamCommercialRightsVerified,false);
 assert.equal(candidate.sourcePriceReconciled,false);
 assert.equal(candidate.themes.length,9);
 assert.equal(candidate.themes.reduce((n,t)=>n+t.history.length,0),2268);
 assert.deepEqual(candidate.themes.map(t=>t.etfs),
   roster.groups.map(g=>g.tickers.map(t=>t.ticker)));
 assert.equal(JSON.stringify(candidate).includes('"volume"'),false);
});

test('R37 can validate R47 source only after separate evidence-based approval',()=>{
 const candidate=make(),now=Date.parse('2026-10-27T01:00:00Z');
 const base={status:'READY',observationDate:'2026-10-26',
   confirmedObservationDate:'2026-10-26',phase:'CONFIRMED',
   themes:candidate.themes};
 assert.equal(eligibleNineR37(candidate,base,{now,storedAt:now-1000}),false);
 const approved={...candidate,status:'READY',sourceStoredAt:'2026-10-27T00:45:00Z',
   publishedAt:'2026-10-27T00:46:00Z',publicationAuthorized:true,
   upstreamCommercialRightsVerified:true,derivedLicenseVerified:true,
   sourcePriceReconciled:true,sourceManifestVerified:true,
   privateReplayVerified:true};
 assert.equal(eligibleNineR37(approved,base,{now,storedAt:now-1000}),true);
 assert.equal(eligibleNineR37({...approved,deltaManifestSha256:'bad'},base,
   {now,storedAt:now-1000}),false);
 assert.equal(eligibleNineR37(approved,{...base,observationDate:'2026-10-27',
   confirmedObservationDate:'2026-10-27'}, {now,storedAt:now-1000}),false);
});

test('SHA mismatch, AUM date drift and mutated source cannot generate candidates',()=>{
 assert.throws(()=>make({themesBytes:Buffer.from('{}')}),/THEMES_BYTES_MISMATCH/);
 assert.throws(()=>make({rosterBytes:Buffer.from('{}')}),/ROSTER_BYTES_MISMATCH/);
 const altered={...themes,aumEvidenceAsOf:{...asOf,BOTZ:'2026-10-27'}};
 assert.throws(()=>make({themes:altered,themesBytes:encode(altered)}),/ORIGINAL_AUM_DATES/);
 const other={...themes,source:{...source,rosterSha256:'0'.repeat(64)}};
 assert.throws(()=>make({themes:other,themesBytes:encode(other)}),/INDIVIDUAL_PRIVATE_CONTRACT/);
});
