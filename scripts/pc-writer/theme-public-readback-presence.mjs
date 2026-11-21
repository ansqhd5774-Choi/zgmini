// Source-only classification of existing Writer D1 output/current metadata.
// Never queries D1 or claims that unread body fields, licenses, or raw source are verified.
export const THEME_PUBLIC_READBACK_KEYS=Object.freeze([
 'theme-legacy-nine-r37',
 'theme-nine-r32-provisional-r88',
 'theme-data-center-power-r1',
 'theme-data-center-power-provisional-r1',
 'theme-space-satellite-r2',
 'theme-space-satellite-provisional-r1',
 'theme-etf-only-rolling',
]);

const scope='D1_OUTPUT_CURRENT_KEY_STORED_AT_ONLY';
const unreadFields=Object.freeze(['version','sourceVersion','sourceStoredAt',
 'observationDate','phase','bodySha256','localCheckpoint']);
const validStoredAt=value=>Number.isSafeInteger(value)&&value>0;

export function summarizeThemePublicReadback(rows,{observedAt=null}={}){
 const at=typeof observedAt==='string'&&Number.isFinite(Date.parse(observedAt))?
  new Date(observedAt).toISOString():null;
 if(!Array.isArray(rows))return {
  scope,status:'NOT_READ',observedAt:at,unreadFields:[...unreadFields],
  feeds:THEME_PUBLIC_READBACK_KEYS.map(feedKey=>({feedKey,state:'UNKNOWN',exists:null,storedAt:null})),
 };
 const byKey=new Map(THEME_PUBLIC_READBACK_KEYS.map(key=>[key,[]]));
 for(const row of rows){
  if(row&&typeof row==='object'&&!Array.isArray(row)&&byKey.has(row.feed_key))
   byKey.get(row.feed_key).push(row);
 }
 const feeds=THEME_PUBLIC_READBACK_KEYS.map(feedKey=>{
  const matches=byKey.get(feedKey);
  if(matches.length===0)return {feedKey,state:'MISSING',exists:false,storedAt:null};
  if(matches.length!==1)return {feedKey,state:'AMBIGUOUS_DUPLICATE',exists:null,storedAt:null};
  const timestamp=matches[0].stored_at;
  return validStoredAt(timestamp)?
   {feedKey,state:'PRESENT_METADATA_ONLY',exists:true,storedAt:timestamp}:
   {feedKey,state:'PRESENT_INVALID_STORED_AT',exists:true,storedAt:null};
 });
 return {scope,status:feeds.every(x=>x.state==='PRESENT_METADATA_ONLY')?
  'ALL_KEYS_PRESENT_METADATA_ONLY':'PARTIAL_OR_INVALID',observedAt:at,
  unreadFields:[...unreadFields],feeds};
}
