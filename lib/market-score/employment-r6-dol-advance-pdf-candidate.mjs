// W04 source-only ETA538 advance claims PDF adapter. No operational DB or D1 writes.
// Only an archived DOL release is admissible; never fetch the moving latest URL.
import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { parseDolWeeklyReleaseText } from "./employment-r6-dol-release-text.mjs";
const MAX_PDF_BYTES=8_000_000, MAX_STREAM_BYTES=2_000_000;
const MONTHS=["January","February","March","April","May","June","July","August",
  "September","October","November","December"];
const DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const fail=reason=>({status:"HOLD",reason,rows:[]});
export function dolArchivedWeeklyClaimsPdfUrl(releaseDate){
  if(typeof releaseDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate))return null;
  const [y,m,d]=releaseDate.split("-").map(Number),t=new Date(Date.UTC(y,m-1,d));
  if(y<2000||y>2199||t.getUTCFullYear()!==y||t.getUTCMonth()!==m-1||t.getUTCDate()!==d)return null;
  return "https://oui.doleta.gov/press/"+y+"/"+
    String(m).padStart(2,"0")+String(d).padStart(2,"0")+String(y).slice(-2)+".pdf";
}
function unescapeLiteral(s){
  return s.replace(/\\([0-7]{1,3}|[nrtbf()\\]|\r?\n)/g,(_,code)=>{
    if(/^[0-7]/.test(code))return String.fromCharCode(parseInt(code,8));
    const special={n:"\n",r:"\r",t:"\t",b:"\b",f:"\f"};
    if(code in special)return special[code];
    if(code==="\n"||code==="\r\n")return "";
    return code;
  });
}
// Only supports the official archive's first-page Flate/TJ text operators.
// Unsupported fonts/encoding, unbounded PDF streams, and malformed pages HOLD.
export function extractDolAdvanceFirstPageText(bytes){
  const pdf=Buffer.from(bytes??[]);
  if(pdf.length<80||pdf.length>MAX_PDF_BYTES||
      !pdf.subarray(0,8).toString("latin1").startsWith("%PDF-")||
      !pdf.subarray(Math.max(0,pdf.length-1024)).toString("latin1").includes("%%EOF"))return null;
  let cursor=0;
  for(let i=0;i<32;i++){
    const marker=pdf.indexOf("stream",cursor,"latin1");
    if(marker<0)return null;
    const line=pdf.subarray(marker,marker+9).toString("latin1");
    const delim=line.startsWith("stream\r\n")?8:line.startsWith("stream\n")?7:0;
    cursor=marker+6;
    if(!delim)continue;
    const start=marker+delim,end=pdf.indexOf("endstream",start,"latin1");
    if(end<0)return null;
    cursor=end+9;
    if(end-start>MAX_STREAM_BYTES)continue;
    let decoded;
    try{decoded=inflateSync(pdf.subarray(start,end),{maxOutputLength:300_000}).toString("latin1");}
    catch{continue;}
    if(!decoded.includes(" TJ")||!decoded.includes("BT"))continue;
    const pieces=[];
    for(const m of decoded.matchAll(/\[([\s\S]*?)\]\s*TJ/g)){
      const literals=[...m[1].matchAll(/\(((?:\\.|[^\\)])*)\)/g)];
      if(!literals.length)continue;
      const v=literals.map(x=>unescapeLiteral(x[1])).join("");
      if(v.trim())pieces.push(v);
    }
    const text=pieces.join(" ").replace(/\s+/g," ")
      .replace(/\b4\s*-\s*week\b/gi,"4-week").trim();
    if(text.includes("UNEMPLOYMENT INSURANCE WEEKLY CLAIMS")&&
       text.includes("SEASONALLY ADJUSTED DATA")){
      if(/[\u0000-\u0008\u000e-\u001f]/.test(text))return null;
      return text;
    }
  }
  return null;
}
// Pure verifier: SHA256 is over exact PDF bytes, not extracted/normalized text.
// checkedAt is a present observation, never fabricated historical availableAt.
export function inspectDolAdvancePdf(bytes,{releaseDate,expectedInitialWeekEnd,checkedAt}={}){
  const url=dolArchivedWeeklyClaimsPdfUrl(releaseDate);
  if(!url||!/^\d{4}-\d{2}-\d{2}$/.test(expectedInitialWeekEnd??""))return fail("DATE_OR_URL_INVALID");
  const pdf=Buffer.from(bytes??[]);
  const text=extractDolAdvanceFirstPageText(pdf);
  if(!text)return fail("PDF_LAYOUT_UNSUPPORTED");
  const [y,m,d]=releaseDate.split("-").map(Number),day=new Date(Date.UTC(y,m-1,d));
  const heading=DAYS[day.getUTCDay()]+", "+MONTHS[m-1]+" "+d+", "+y;
  if(!text.includes(heading))return fail("PDF_RELEASE_DATE_MISMATCH");
  const parsed=parseDolWeeklyReleaseText(text,{releaseDate,expectedInitialWeekEnd});
  if(parsed.status!=="CANDIDATE_ONLY"||parsed.rows.length!==4)return fail(parsed.reason||"PDF_SERIES_INCOMPLETE");
  return {status:"CANDIDATE_ONLY",
    reason:"PDF_BYTES_ATTESTED_STORAGE_AND_HISTORICAL_AVAILABILITY_UNVERIFIED",
    source:{provider:"DOL_ETA",kind:"ETA538_ADVANCE_RELEASE_PDF",url,
      sha256:createHash("sha256").update(pdf).digest("hex"),byteLength:pdf.length,
      ...(checkedAt?{checkedAt}:{})},
    rows:parsed.rows};
}
// One bounded official GET only. Not wired into the R6 scheduled collector.
// PC provider access and SQLite write still require existing authorization.
export async function fetchVerifiedDolAdvancePdf({
  releaseDate,expectedInitialWeekEnd,fetchImpl=globalThis.fetch,
  now=()=>new Date(),maxBytes=MAX_PDF_BYTES,timeoutMs=50_000,
}={}){
  const url=dolArchivedWeeklyClaimsPdfUrl(releaseDate);
  if(!url||typeof fetchImpl!=="function"||
     !/^\d{4}-\d{2}-\d{2}$/.test(expectedInitialWeekEnd??""))return fail("DATE_OR_URL_INVALID");
  if(!Number.isSafeInteger(maxBytes)||maxBytes<80||maxBytes>MAX_PDF_BYTES||
     !Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>60_000)return fail("FETCH_LIMITS_INVALID");
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
    const response=await fetchImpl(url,{method:"GET",headers:{accept:"application/pdf"},signal:abort.signal});
    if(!response?.ok)return fail("PDF_HTTP_FAILED");
    const type=String(response.headers?.get?.("content-type")??"").split(";")[0].trim().toLowerCase();
    if(type!=="application/pdf")return fail("PDF_CONTENT_TYPE_INVALID");
    if(response.url&&response.url!==url)return fail("PDF_REDIRECT_UNEXPECTED");
    const declared=Number(response.headers?.get?.("content-length"));
    if(Number.isFinite(declared)&&declared>maxBytes)return fail("PDF_BYTES_TOO_LARGE");
    let pdf;
    if(response.body?.getReader){
      const chunks=[];let sum=0,reader=response.body.getReader();
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        sum+=value.byteLength;
        if(sum>maxBytes){await reader.cancel?.();return fail("PDF_BYTES_TOO_LARGE");}
        chunks.push(Buffer.from(value));
      }
      pdf=Buffer.concat(chunks,sum);
    }else{
      pdf=Buffer.from(await response.arrayBuffer());
      if(pdf.length>maxBytes)return fail("PDF_BYTES_TOO_LARGE");
    }
    const inspected=inspectDolAdvancePdf(pdf,{releaseDate,expectedInitialWeekEnd,checkedAt:now().toISOString()});
    return inspected.status==="CANDIDATE_ONLY"
      ? {...inspected,rawPdfBytes:pdf} : inspected;
  }catch{
    return fail(abort.signal.aborted?"PDF_FETCH_TIMEOUT":"PDF_FETCH_FAILED");
  }finally{clearTimeout(timer);}
}

// Public evidence API remains byte-free. The in-process adapter alone receives
// rawPdfBytes after exact PDF format, source URL and 4-series verification.
export async function fetchDolAdvancePdfCandidate(options={}){
  const {rawPdfBytes,...result}=await fetchVerifiedDolAdvancePdf(options);
  return result;
}
