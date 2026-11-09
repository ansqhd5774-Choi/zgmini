// Public, counts-only projection of economic MODEL INPUT links. Never import
// the private 283-key inventory into a browser bundle. Dates are taken solely
// from the existing /api/release-calendar stored event feed.
export const MODEL_INPUT_SOURCE_MANIFEST_SHA256='b083e3067d7e96475de5ae610a3a991ed8f95115142dbd79f34d7e20efc868fb';
export const ECONOMIC_MODEL_INPUT_TOTAL=283;
export const ECONOMIC_NON_RELEASE_COUNTS=Object.freeze({
 CADENCE_POLICY:72,MARKET_DAILY:21,UNSCHEDULED:4,
});

export const ECONOMIC_OFFICIAL_LINK_COUNTS=Object.freeze([
 {source:'bea',id:'pce',inputs:25},
 {source:'bls',id:'bls-business-employment-dynamics',inputs:114},
 {source:'bls',idPrefix:'bls-metropolitan-area-employment-and-unemployment',inputs:1},
 {source:'bls',idPrefix:'bls-state-employment-and-unemployment',inputs:1},
 {source:'bls',id:'cpi',inputs:2},
 {source:'bls',id:'eci',inputs:2},
 {source:'bls',id:'employment',inputs:15},
 {source:'bls',id:'import-export-prices',inputs:1},
 {source:'bls',id:'jolts',inputs:5},
 {source:'bls',id:'ppi',inputs:2},
 {source:'bls',id:'productivity',inputs:1},
 {source:'census',idPrefix:'census-business-formation-statistics-',inputs:3},
 {source:'census',idPrefix:'census-full-report-manufacturers-shipments-inventories-and-orders-',inputs:7},
 {source:'fed',id:'industrial-production',inputs:7},
]);

const matches=(link,event)=>event?.source===link.source&&typeof event.id==='string'&&
 (link.id?event.id===link.id:event.id.startsWith(link.idPrefix));

export const modelInputsForCalendarEvent=event=>ECONOMIC_OFFICIAL_LINK_COUNTS
 .reduce((total,link)=>total+(matches(link,event)?link.inputs:0),0);

/** Counts model input IDs, never releases or active PC stored series. */
export function economicInputCalendarCoverage(feed,{nextYear=0}={}){
 if(feed?.status!=='READY'||!Array.isArray(feed.events))return null;
 const selectedYear=Number.isInteger(nextYear)&&nextYear>=2025&&nextYear<=2100?String(nextYear):null;
 const present=link=>feed.events.some(event=>matches(link,event));
 const next=link=>selectedYear&&feed.events.some(event=>
  matches(link,event)&&typeof event.date==='string'&&event.date.startsWith(`${selectedYear}-`));
 const officialEligible=ECONOMIC_OFFICIAL_LINK_COUNTS.reduce((n,link)=>n+link.inputs,0);
 const officialStored=ECONOMIC_OFFICIAL_LINK_COUNTS.reduce((n,link)=>n+(present(link)?link.inputs:0),0);
 const nextYearConfirmed=selectedYear?ECONOMIC_OFFICIAL_LINK_COUNTS.reduce((n,link)=>n+(next(link)?link.inputs:0),0):null;
 return Object.freeze({
  totalInputs:ECONOMIC_MODEL_INPUT_TOTAL,officialEligible,
  officialStored,officialWithoutStored:officialEligible-officialStored,
  nextYear:selectedYear,nextYearConfirmed,
  nonRelease:ECONOMIC_MODEL_INPUT_TOTAL-officialEligible,
  byNonRelease:ECONOMIC_NON_RELEASE_COUNTS,
 });
}
