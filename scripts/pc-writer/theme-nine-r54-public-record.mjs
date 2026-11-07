// R54: explicit publisher-consented derived-only public record, with no new
// calculation, price-rights claims, or modification to the private R51 stage.
import {eligibleNineR37,THEME_NINE_R37_ROSTER} from '../../worker/theme-nine-r37-public.mjs';

const TERMS='https://getmarkethistory.com/docs/terms';
const BASIS='OFFICIAL_TERMS_DERIVED_WORKS_ANONYMOUS_SCOPE_UNCONFIRMED';
const need=(condition,reason)=>{
 if(!condition)throw Object.assign(new Error('THEME_NINE_R54_'+reason),
  {code:'THEME_NINE_R54_'+reason});
};
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);

export function buildNineR54PublicRecord({candidate,candidateSha256,
 publicBase,sourceStoredAt,sourceManifestVerified=false,
 privateReplayVerified=false,publisherConsent=false,
 now=Date.now(),confirmedOnly=false}={}){
 need(publisherConsent===true,'EXPLICIT_PUBLISHER_CONSENT_REQUIRED');
 need(sourceManifestVerified===true&&privateReplayVerified===true,
  'SOURCE_MANIFEST_AND_PRIVATE_REPLAY_REQUIRED');
 need(sha(candidateSha256),'CANDIDATE_SHA_REQUIRED');
 need(candidate?.contract==='THEME_NINE_R48_R47_PRIVATE_R37_CANDIDATE_V1'&&
  candidate.status==='PRIVATE_CANDIDATE_NOT_PUBLISHED'&&
  candidate.phase===(confirmedOnly?'CONFIRMED':'PROVISIONAL')&&
  (!confirmedOnly||(!publicBase&&!candidate.provisional?.points?.length))&&
  candidate.sourceContract==='THEME_NINE_R47_PRIVATE_RECURRING_NINE_THEME_SHADOW_V1'&&
  candidate.sourcePriceMode==='RAW_UNADJUSTED_1H_NOT_OFFICIAL_CLOSE'&&
  candidate.publicationAuthorized===false&&candidate.d1Writes===0&&
  candidate.providerCalls===0&&candidate.schedulerWrites===0&&
  candidate.themes?.length===9&&
  candidate.themes.every((t,i)=>t.theme===THEME_NINE_R37_ROSTER[i].theme),
  'PRIVATE_CANDIDATE_CONTRACT');
 need(Number.isSafeInteger(now)&&now>0&&
  Number.isFinite(Date.parse(sourceStoredAt))&&
  Date.parse(sourceStoredAt)<=now,'SOURCE_CLOCK_INVALID');
 need(Date.parse(candidate.observationDate+'T00:00:00Z')<=now,
  'FUTURE_CONFIRMED_DATE');
 const stamp=new Date(now).toISOString();
 const record={...candidate,status:'READY',
  sourceStoredAt,publishedAt:stamp,
  sourceStoredAtKind:'SHA_VERIFIED_LOCAL_R47_SOURCE_AND_PRIVATE_REPLAY',
  candidateFileSha256:candidateSha256,
  publicationAuthorized:true,sourceManifestVerified:true,
  privateReplayVerified:true,derivedOnlyNoRaw:true,
  // The anonymous provider account/price/licensing facts remain UNCONFIRMED.
  accountGoodStandingVerified:false,anonymousScopeIndependentlyConfirmed:false,
  upstreamCommercialRightsVerified:false,derivedLicenseVerified:false,
  sourcePriceReconciled:false,licensingRiskAcceptedByPublisher:true,
  rightsBasis:BASIS,sourceTermsUrl:TERMS};
 const publicConfirmed=publicBase?.confirmedObservationDate??publicBase?.observationDate;
 // A confirmed-only R48 publication cannot depend on a stale legacy API.
 // The anchor is the SHA-replayed R32 calendar itself, never a claim that
 // the legacy public feed is fresh. R37 still validates all 9 x 252 values,
 // rights disclosures, immutable roster and source/publication clocks.
 const anchor=confirmedOnly?{status:'READY',phase:'CONFIRMED',
  observationDate:record.observationDate,
  confirmedObservationDate:record.observationDate,
  themes:record.themes.filter(t=>t.theme!=='AI·반도체')}:publicBase;
 need(eligibleNineR37(record,anchor,{now,storedAt:now,
  independentAnchor:confirmedOnly||record.observationDate>publicConfirmed}),
  'PUBLIC_R37_READER_INELIGIBLE');
 return record;
}

export function buildNineR54ConfirmedPublicRecord(args={}){
 return buildNineR54PublicRecord({...args,publicBase:null,confirmedOnly:true});
}
