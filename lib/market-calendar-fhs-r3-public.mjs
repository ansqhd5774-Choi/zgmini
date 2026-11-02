// R59 annual, manually published, self-owned FHS-R3 financial HEALTH grade.
// Distinct from earnings calendar market-event importance and all vendor data.
export const FHS_R3_PUBLIC_KEY='market-calendar:fhs-r3-annual';
const TICKER=/^[A-Z0-9.-]{1,12}$/;
const DAY=/^20\d\d-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const day=x=>typeof x==='string'&&DAY.test(x)&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const invalid=()=>{throw Error('R59_FHS_PUBLIC_SNAPSHOT_INVALID')};
export function validateFhsAnnualSnapshot(snapshot){
 if(!snapshot||snapshot.status!=='READY_R3_PROVISIONAL'||snapshot.version!=='ZGMINI-FHS-R3'||
  !day(snapshot.asOf)||!Number.isSafeInteger(snapshot.sourceStoredAt)||snapshot.sourceStoredAt<=0||
  !Number.isSafeInteger(snapshot.recordCount)||snapshot.recordCount<1||snapshot.recordCount>10000||
  !snapshot.grades||typeof snapshot.grades!=='object'||Array.isArray(snapshot.grades))invalid();
 const entries=Object.entries(snapshot.grades);
 if(entries.length!==snapshot.recordCount)invalid();
 for(const [ticker,item] of entries){
  if(!TICKER.test(ticker)||!Array.isArray(item)||item.length!==2||
   !Number.isInteger(item[0])||item[0]<1||item[0]>3||
   !Number.isInteger(item[1])||item[1]<0||item[1]>100||
   item[0]>(item[1]>=80?3:item[1]>=50?2:1))invalid();
 }
 return snapshot;
}
export function getFhsAnnualGrade(snapshot,ticker){
 if(!snapshot)return null;
 const t=String(ticker||'').toUpperCase();
 return TICKER.test(t)?snapshot.grades[t]??null:null;
}
// The private R58 shadow never leaves PC. Derive ONLY ticker/score/grade/date.
export function publishableFhsAnnualFromPrivate(input){
 if(input?.status!=='PRIVATE_PROVISIONAL_ONLY'||input.version!=='ZGMINI-FHS-R3'||
  input.publishReady!==false||!day(input.asOf)||
  !Number.isSafeInteger(input.sourceStoredAt)||input.sourceStoredAt<=0||
  !Array.isArray(input.items)||input.recordCount!==input.items.length||
  input.items.length<1||input.items.length>10000)throw Error('R59_PRIVATE_INPUT_INVALID');
 const grades=Object.create(null);
 for(const row of input.items){
  if(!TICKER.test(row?.ticker)||row.version!==input.version||row.asOf!==input.asOf||
   row.status!=='PROVISIONAL_UNVERIFIED'||row.publishReady!==false||
   row.sectorVerified!==false||row.cashUnrestrictedVerified!==false||
   row.filingContextVerified!==false||!Number.isInteger(row.score)||row.score<0||row.score>100||
   !Number.isInteger(row.stars)||row.stars<1||row.stars>3||
   row.stars>(row.score>=80?3:row.score>=50?2:1)||
   Object.hasOwn(grades,row.ticker))throw Error('R59_PRIVATE_ITEM_INVALID');
  grades[row.ticker]=[row.stars,row.score];
 }
 return validateFhsAnnualSnapshot({status:'READY_R3_PROVISIONAL',version:input.version,
  asOf:input.asOf,sourceStoredAt:input.sourceStoredAt,recordCount:input.recordCount,grades});
}
