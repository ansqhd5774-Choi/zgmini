import {hash} from './store.mjs';
import {stageScore} from './verification.mjs';
const URL='https://mofa.gov.qa/en/qatar/latest-articles/latest-news/details/2026/10/06/foreign-ministry--mediation-efforts-between-washington-and-tehran-continue';
const EXCERPT='talks are ongoing, messages are being exchanged between Washington and Tehran, and Qatar is acting as a mediator between the parties';
// Narrow historical observation adapter. Not a generic news/AI fact authorizer.
// Current-state review remains pending; no ceasefire or nuclear fact is generated.
export function qatarHistoricalAssertion(receipt,sourceId,now){
 if(receipt?.version!=='IRAN_OFFICIAL_DIPLOMACY_OBSERVATION_R14'||receipt.sourceUrl!==URL
  ||receipt.sourceClass!=='OFFICIAL_MEDIATOR'||receipt.publicationDate!=='2026-10-06'
  ||receipt.eventDate!=='2026-10-06'||receipt.axis!=='IRN_USA'||receipt.excerpt!==EXCERPT
  ||receipt.excerptHash!==hash(EXCERPT)||!/^([a-f0-9]{64})$/.test(receipt.bodyHash??'')
  ||receipt.mediatorReportedTalksOngoing!==true||receipt.mutualEndAgreementVerified!==false
  ||receipt.implementationVerified!==false||sourceId!=='official-diplomacy-observation:'+hash(receipt)
  ||!Number.isSafeInteger(now)||now<Date.parse('2026-10-07T00:00:00Z'))throw Error('QATAR_OBSERVATION_UNSUPPORTED');
 const value={verified:true,materialPending:true,diplomacyScore:stageScore('D','MEDIATOR_CONTACT'),
  lastVerifiedAt:Date.parse('2026-10-06T00:00:00Z')};
 return {version:'IRAN_VERIFIED_INPUT_ASSERTION_R14',target:'relations.IRN_USA',status:'VERIFIED',
  verificationOrigin:'FIXED_RULE',parserVersion:'QATAR_MEDIATOR_HISTORICAL_R14',verifiedAt:now,
  observationDate:'2026-10-06',observationPrecision:'DAY',currentStateVerified:false,
  value,valueHash:hash(value),evidence:[{sourceId,bodyHash:hash(receipt)}]};
}
