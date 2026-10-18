import test from 'node:test';
import assert from 'node:assert/strict';
import {auditR4GdeltStoryV22,normalizeR4NewsURL} from '../lib/iran-progress/gdelt-story-relevance-v22.mjs';
/** Public V21 links; row IDs in this fixture are synthetic, not PC source rows. */
const base=[
['20260907','IRN_USA_CODE_PAIR','https://aa.com.tr/en/eurasia/russia-calls-for-iran-to-be-included-in-a-gulf-security-system/4050090'],
['20260907','IRN_USA_CODE_PAIR','https://us.cnn.com/2026/09/07/middleeast/trump-blockade-iran-military-escalation-intl-latam'],
['20260907','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://aa.com.tr/en/middle-east/yemeni-army-says-it-recaptured-positions-in-taiz-and-al-hudaydah-amid-clashes-with-houthis/4049183'],
['20260907','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.aljazeera.com/news/2026/9/7/yemen-govt-forces-launch-air-strikes-on-houthi-targets'],
['20261005','IRN_ISR_CODE_PAIR','https://www.aljazeera.com/news/liveblog/2026/10/5/iran-war-live-fighting-in-yemen-intensifies-tehran-says-ready-for-us-war'],
['20261005','IRN_USA_CODE_PAIR','https://www.middleeasteye.net/news/iraq-paramilitaries-baghdad-push-greater-state-control'],
['20261005','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.aljazeera.com/news/2026/10/5/mecca-alliance-agrees-to-activate-collective-deterrence-measures'],
['20261005','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.jpost.com/middle-east/article-910640'],
['20261005','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.middleeasteye.net/news/saudi-arabia-turkey-and-pakistan-activate-mecca-pact-amid-war-houthis'],
['20261005','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.theguardian.com/world/2026/oct/05/saudi-forces-recapture-key-areas-strait-houthis-yemen'],
['20261014','IRN_ISR_CODE_PAIR','https://www.arabnews.com/middle-east/israel-threatens-to-seize-more-territory-in-southern-lebanon-if-hezbollah-joins-iran-war-3006288'],
['20261014','IRN_ISR_CODE_PAIR','https://www.arabnews.com/middle-east/netanyahu-says-he-is-not-seeking-to-attack-iran-again-before-israel-election-3006313'],
['20261014','IRN_USA_CODE_PAIR','https://www.dw.com/en/how-trumps-diesel-deal-with-russia-will-impact-the-united-states-and-ukraine/a-79658596'],
['20261014','IRN_USA_CODE_PAIR','https://www.jpost.com/international/article-911636'],
['20261014','IRN_USA_CODE_PAIR','https://www.jpost.com/middle-east/article-911729'],
['20261014','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.arabnews.com/opinion/saudi-arabias-national-spirit-in-the-face-of-houthi-attacks-3006284'],
['20261014','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.arabnews.com/saudi-arabia/iraq-will-not-become-a-launchpad-for-attacks-on-saudi-arabia-vows-prime-minister-3006298'],
['20261014','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.haaretz.com/middle-east-news/2026-10-14/ty-article/.premium/houthis-say-they-attacked-riyadh-airport-again-threaten-saudi-oil-facilities/000001a1-3b6a-d04a-a1f1-3f6ae34a0000'],
['20261014','YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF','https://www.middleeasteye.net/news/houthi-strikes-mark-end-saudi-arabias-yemen-containment-strategy']
];
const rows=base.map(([day,front,articleUrl],i)=>({sqlDate:day,gdeltFirstSeenDate:day,
 front,articleUrl,eventId:'FIXTURE_'+(i+1),cameoRoot:'19'}));
const make=(part,disposition,note,opt={})=>{
 const row=rows.find(x=>x.articleUrl.includes(part));if(!row)throw Error('MISSING_FIXTURE');
 return {url:row.articleUrl,disposition,note,reviewedOn:'20261019',...opt};
};
const reviews=[
make('russia-calls-for-iran-to-be-included','DIPLOMATIC_STATEMENT','Gulf security initiative, not direct US-Iran attack.'),
make('yemen-govt-forces-launch-air-strikes','REPORTED_COMBAT_NEEDS_PROOF','Yemen government forces report strikes on Houthis; occurrence day unconfirmed.'),
make('mecca-alliance-agrees','DEFENCE_POSTURE','Defence pact deployment is not a new attack incident.'),
make('article-910640','REPORTED_COMBAT_NEEDS_PROOF','Reuters/JPost coverage of the October 5 Yemen government offensive.',
 {incidentDateCandidate:'20261005',duplicateCluster:'YEMEN_20261005_GOV_OFFENSIVE'}),
make('saudi-forces-recapture-key-areas','REPORTED_COMBAT_NEEDS_PROOF','Guardian coverage of the same October 5 Yemen government offensive.',
 {incidentDateCandidate:'20261005',duplicateCluster:'YEMEN_20261005_GOV_OFFENSIVE'}),
make('israel-threatens-to-seize-more','THREAT_OR_EXPECTATION','Conditional threat of additional Lebanese territory occupation.'),
make('netanyahu-says-he-is-not-seeking','DIPLOMATIC_STATEMENT','Statement explicitly not seeking pre-election Iran strike.'),
make('how-trumps-diesel-deal','NOT_DIRECT_R4_INCIDENT','US-Russia diesel arrangement, not fresh Iran-US fighting.'),
make('article-911636','MILITARY_CAPABILITY','Houthi missile development capability not fresh US-Iran attack.'),
make('article-911729','THREAT_OR_EXPECTATION','Concern about possible future US airstrike not confirmed new strike.'),
make('/opinion/saudi-arabias','EDITORIAL_RETROSPECTIVE','Commentary about prior Houthi strikes not newly reported incident.')
];
const run=()=>auditR4GdeltStoryV22(rows,reviews);
test('nineteen V21 public links remain unverified and R4 null',()=>{
 const r=run();assert.equal(r.distinctNewsStories,19);assert.equal(r.manuallyReviewedStories,11);
 assert.equal(r.verifiedR4Events,0);assert.equal(r.r4ComputedDays,0);assert.equal(r.r4Score,null);
 assert.ok(r.stories.every(x=>!x.pcReceiptVerified&&!x.actorVerified&&!x.scoreEligible));
});
test('two October 5 articles are one possible campaign, not two verified attacks',()=>{
 const r=run();assert.equal(r.combatReportReviewLinks,3);assert.equal(r.possibleDistinctCampaignClusters,2);
 assert.equal(r.stories.filter(x=>x.duplicateCluster==='YEMEN_20261005_GOV_OFFENSIVE').length,2);
});
test('Reuters/JPost missile development does not become direct Iran-US attack',()=>{
 const r=run(),x=r.stories.find(x=>x.url.includes('article-911636'));
 assert.equal(x.disposition,'MILITARY_CAPABILITY');assert.equal(x.actorVerified,false);
});
test('statement threatening Lebanon and anticipation of future strike remain unscored',()=>{
 const r=run();assert.equal(r.stories.find(x=>x.url.includes('article-911729')).disposition,'THREAT_OR_EXPECTATION');
 assert.equal(r.stories.find(x=>x.url.includes('israel-threatens-to-seize-more')).disposition,'THREAT_OR_EXPECTATION');
});
test('negated preemptive attack does not become confirmed violence',()=>{
 assert.equal(run().stories.find(x=>x.url.includes('not-seeking-to-attack')).disposition,'DIPLOMATIC_STATEMENT');
});
test('opinion and diesel agreement remain out of direct war-event scoring',()=>{
 const r=run();assert.equal(r.stories.find(x=>x.url.includes('/opinion/')).disposition,'EDITORIAL_RETROSPECTIVE');
 assert.equal(r.stories.find(x=>x.url.includes('diesel-deal-with-russia')).disposition,'NOT_DIRECT_R4_INCIDENT');
});
test('duplicated GDELT row for same article deduplicates only source not actual incidents',()=>{
 const r=auditR4GdeltStoryV22([...rows,{...rows[0],eventId:'DUPLICATE_EVENT_CODE'}],reviews);
 assert.equal(r.inputRows,20);assert.equal(r.distinctNewsStories,19);
 assert.equal(r.stories.find(x=>x.url.includes('russia-calls-for-iran')).gdeltIds,2);
});
test('different CAMEO country pair on same URL cannot promote actor confidence',()=>{
 const r=auditR4GdeltStoryV22([...rows,{...rows[0],front:'YEM_SAU_CODE_PAIR_NOT_HOUTHI_PROOF'}],reviews);
 assert.equal(r.stories.find(x=>x.url.includes('russia-calls-for-iran')).gdeltFrontHints.length,2);
 assert.equal(r.verifiedR4Events,0);
});
test('reject fabricated review verification and invalid incident timestamp',()=>{
 assert.throws(()=>auditR4GdeltStoryV22(rows,[{...reviews[0],scoreEligible:true}]),/V22_REVIEW_INVALID/);
 assert.throws(()=>auditR4GdeltStoryV22(rows,[{...reviews[0],incidentDateCandidate:'20260907'}]),/V22_EVENT_DAY_NOT_PROVEN/);
});
test('reject unsupported event code front and future SQL day',()=>{
 assert.throws(()=>auditR4GdeltStoryV22([{...rows[0],front:'VERIFIED_ATTACK'}],reviews),/V22_GDELT_ROW_INVALID/);
 assert.throws(()=>auditR4GdeltStoryV22([{...rows[0],sqlDate:'20261020'}],reviews),/V22_GDELT_ROW_INVALID/);
});
test('reject duplicate review URLs and HTTP sources',()=>{
 assert.throws(()=>auditR4GdeltStoryV22(rows,[reviews[0],reviews[0]]),/V22_REVIEW_INVALID/);
 assert.equal(normalizeR4NewsURL('http://example.com/story'),null);
});
