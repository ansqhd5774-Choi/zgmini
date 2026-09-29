export const B1_R3_ACTIVE_SOURCE_CONTRACT_R5="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R5";
export const B1_R3_BASE_PRICE_CONTRACT_R4="ZGMINI_B1_PRICE_SOURCE_CONTRACT_R4";
export const B1_R3_PIT_CONTRACT_R2="B1_HISTORY_SOURCE_CONTRACT_R2";
export const B1_R3_SEMANTIC_SCHEMA_R1="B1-R3-SEMANTIC-SNAPSHOT-R1";

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const finite=n=>typeof n==="number"&&Number.isFinite(n);
const cleanText=(v,n)=>{
  const s=String(v??"").trim();
  if(!s)throw new TypeError(`${n}_REQUIRED`);
  return s;
};
const cleanDate=(v,n)=>{
  const s=cleanText(v,n);
  if(!DATE_RE.test(s))throw new TypeError(`${n}_INVALID`);
  return s;
};

export function canonicalBreadthB1R3SemanticR5({
  tradeDate,previousDate,members,rows,
}={}){
  const td=cleanDate(tradeDate,"TRADE_DATE");
  const pd=cleanDate(previousDate,"PREVIOUS_DATE");
  if(pd>=td)throw new Error("PREVIOUS_DATE_INVALID_ORDER");

  if(!Array.isArray(members))throw new TypeError("MEMBERS_REQUIRED");
  const memberList=[...members].map(x=>cleanText(x,"MEMBER")).sort();
  if(memberList.length<490||memberList.length>520)throw new Error("UNIVERSE_COUNT_OUT_OF_RANGE");
  if(new Set(memberList).size!==memberList.length)throw new Error("UNIVERSE_DUPLICATE_TICKER");
  const memberSet=new Set(memberList);

  if(!Array.isArray(rows))throw new TypeError("ROWS_REQUIRED");
  if(rows.length<1||rows.length>520)throw new Error("ROWS_COUNT_OUT_OF_RANGE");
  const seen=new Set();
  const normalized=[];
  for(const raw of rows){
    const ticker=cleanText(raw?.ticker,"TICKER");
    if(seen.has(ticker))throw new Error(`ROW_DUPLICATE_TICKER:${ticker}`);
    if(!memberSet.has(ticker))throw new Error(`ROW_TICKER_NOT_IN_UNIVERSE:${ticker}`);
    seen.add(ticker);

    const previousClose=Number(raw?.previousClose);
    const currentClose=Number(raw?.currentClose);
    const currentVolume=Number(raw?.currentVolume);
    if(!finite(previousClose)||previousClose<=0||
       !finite(currentClose)||currentClose<=0||
       !finite(currentVolume)||currentVolume<0){
      throw new Error(`ROW_VALUE_INVALID:${ticker}`);
    }

    normalized.push({
      ticker,
      previousClose,
      currentClose,
      currentVolume,
      currentResolvedSymbol:cleanText(raw?.currentResolvedSymbol??ticker,"CURRENT_RESOLVED_SYMBOL"),
      previousResolvedSymbol:cleanText(raw?.previousResolvedSymbol??ticker,"PREVIOUS_RESOLVED_SYMBOL"),
      currentResolution:cleanText(raw?.currentResolution??"exact","CURRENT_RESOLUTION"),
      previousResolution:cleanText(raw?.previousResolution??"exact","PREVIOUS_RESOLUTION"),
    });
  }
  normalized.sort((a,b)=>a.ticker.localeCompare(b.ticker));

  return {
    semanticSchema:B1_R3_SEMANTIC_SCHEMA_R1,
    semanticContractRevision:B1_R3_ACTIVE_SOURCE_CONTRACT_R5,
    basePriceContractRevision:B1_R3_BASE_PRICE_CONTRACT_R4,
    pitSourceContractRevision:B1_R3_PIT_CONTRACT_R2,
    tradeDate:td,
    previousDate:pd,
    members:memberList,
    rows:normalized,
  };
}

export function canonicalBreadthB1R3SemanticJsonR5(input){
  return JSON.stringify(canonicalBreadthB1R3SemanticR5(input));
}

export async function breadthB1R3SemanticSha256R5(input){
  const bytes=new TextEncoder().encode(canonicalBreadthB1R3SemanticJsonR5(input));
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return [...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
}

export async function breadthB1R3SemanticSnapshotR5(input){
  const canonical=canonicalBreadthB1R3SemanticR5(input);
  const semanticSha256=await breadthB1R3SemanticSha256R5(canonical);
  return {
    semanticContractRevision:B1_R3_ACTIVE_SOURCE_CONTRACT_R5,
    semanticSchema:B1_R3_SEMANTIC_SCHEMA_R1,
    tradeDate:canonical.tradeDate,
    previousDate:canonical.previousDate,
    memberCount:canonical.members.length,
    pairCount:canonical.rows.length,
    semanticSha256,
  };
}
