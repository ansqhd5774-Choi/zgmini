const PAGE_URL="https://www.ici.org/research/stats/combined_flows";
const MAX_BODY_BYTES=2_000_000;
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const clean=value=>String(value??"")
  .replace(/<br\s*\/?>/gi," ")
  .replace(/<[^>]+>/g," ")
  .replace(/&nbsp;|&#160;/gi," ")
  .replace(/&amp;/gi,"&")
  .replace(/&#39;|&apos;/gi,"'")
  .replace(/&quot;/gi,'"')
  .replace(/\s+/g," ")
  .trim();
const number=value=>{
  const text=clean(value).replace(/,/g,"").replace(/\$/g,"");
  if(!/^[-+]?\d+(?:\.\d+)?$/.test(text))return null;
  const n=Number(text);return finite(n)?n:null;
};
const date=value=>{
  const match=clean(value).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!match)return null;
  const out=`${match[3]}-${match[1].padStart(2,"0")}-${match[2].padStart(2,"0")}`;
  const parsed=new Date(`${out}T00:00:00Z`);
  return Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==out?null:out;
};
const cells=row=>[...String(row??"").matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(match=>clean(match[1]));

export function parseIciCombinedFlowHtml(html){
  const tableRows=[...String(html??"").matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map(match=>cells(match[1])).filter(row=>row.length);
  const headerIndex=tableRows.findIndex(row=>row.filter(item=>date(item)).length>=4);
  if(headerIndex<0)return {status:"PARTIAL",reason:"ICI_COMBINED_HEADER_MISSING",rows:[]};
  const dates=tableRows[headerIndex].map(date).filter(Boolean);
  const required=["Equity","Domestic","World","Hybrid","Bond","Taxable","Municipal","Commodity","Total"];
  const series={};
  for(const row of tableRows.slice(headerIndex+1)){
    const name=clean(row[0]);
    if(!required.includes(name))continue;
    const values=row.slice(1,1+dates.length).map(number);
    if(values.length!==dates.length||values.some(value=>!finite(value)))continue;
    series[name]=values;
  }
  for(const name of ["Equity","Domestic","Bond","Total"]){
    if(!series[name])return {status:"PARTIAL",reason:`ICI_COMBINED_${name.toUpperCase()}_MISSING`,rows:[]};
  }
  const rows=dates.map((observationDate,index)=>({
    observationDate,
    equity:series.Equity[index],
    domesticEquity:series.Domestic[index],
    worldEquity:series.World?.[index]??null,
    hybrid:series.Hybrid?.[index]??null,
    bond:series.Bond[index],
    taxableBond:series.Taxable?.[index]??null,
    municipalBond:series.Municipal?.[index]??null,
    commodity:series.Commodity?.[index]??null,
    total:series.Total[index],
    unit:"USD_MILLIONS",
  })).sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  return {
    status:"READY_CURRENT_RELEASE",
    rows,
    source:"Investment Company Institute",
    sourcePage:PAGE_URL,
    frequency:"WEEKLY",
    providerRequests:0,
    historyMode:"CURRENT_RELEASE_TABLE",
  };
}

export async function fetchIciCombinedFlows({fetchImpl=globalThis.fetch,url=PAGE_URL,timeoutMs=12000}={}){
  if(typeof fetchImpl!=="function")return {status:"PARTIAL",reason:"ICI_FETCH_UNAVAILABLE",rows:[],providerRequests:0};
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{signal:controller.signal,headers:{accept:"text/html,application/xhtml+xml"}});
    if(!response?.ok)return {status:"PARTIAL",reason:`ICI_HTTP_${response?.status??0}`,rows:[],providerRequests:1};
    const hinted=Number(response.headers?.get?.("content-length")??0);
    if(finite(hinted)&&hinted>MAX_BODY_BYTES)return {status:"PARTIAL",reason:"ICI_BODY_LIMIT",rows:[],providerRequests:1};
    const html=await response.text();
    if(Buffer.byteLength(html)>MAX_BODY_BYTES)return {status:"PARTIAL",reason:"ICI_BODY_LIMIT",rows:[],providerRequests:1};
    const parsed=parseIciCombinedFlowHtml(html);
    return {...parsed,providerRequests:1,sourceUrl:String(response.url??url)};
  }catch(error){
    return {status:"PARTIAL",reason:error?.name==="AbortError"?"ICI_TIMEOUT":"ICI_REQUEST_FAILED",rows:[],providerRequests:1};
  }finally{clearTimeout(timer)}
}

export const ICI_COMBINED_FLOW_PROVIDER_R1=Object.freeze({
  source:"Investment Company Institute",
  url:PAGE_URL,
  apiKeyRequired:false,
  providerRequestsPerRun:1,
  storageWrites:false,
  publicMutation:false,
});
