// W04 opt-in DOL ETA538 provider adapter. Reuses the existing R6 collector,
// R6/R4 stores and ETA539 parser; it does not install, schedule or authorize work.
// Only an independently pinned official archived PDF plus one ETA539 request.
import {createHash} from "node:crypto";
import {fetchVerifiedDolAdvancePdf} from "./employment-r6-dol-advance-pdf-candidate.mjs";
import {buildDolAdvanceStoreCandidate} from "./employment-r6-dol-advance-store-candidate.mjs";
import {DOL_ETA539_URL,parseEta539ShadowRows} from "./employment-r4-shadow-provider.mjs";
import {latestDolClaimsReleaseAt} from "./employment-r6-scheduler.mjs";

const GROUP="DOL_UI_WEEKLY_CLAIMS";
const NATIONAL=["INITIAL_CLAIMS","INITIAL_CLAIMS_4W",
  "CONTINUED_CLAIMS","INSURED_UNEMPLOYMENT_RATE"];
const HEX64=/^[a-f0-9]{64}$/;
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const hash=bytes=>createHash("sha256").update(bytes).digest("hex");
const dateISO=v=>typeof v==="string"&&ISO.test(v)&&
  Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
function fail(code){const e=new Error(code);e.code=code;return e;}

// The ETA539 request uses the same bounded response discipline as R6's
// existing DOL fetch. No provider error body is returned to the run ledger.
async function fetchBoundedEta539(fetchImpl,{maxBytes=80_000_000,timeoutMs=50_000}={}){
  const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),timeoutMs);
  try{
    const response=await fetchImpl(DOL_ETA539_URL,{
      method:"GET",headers:{"user-agent":"ZGMINI-R6-Employment/1.0"},signal:abort.signal,
    });
    if(!response?.ok)throw fail("DOL_ETA539_HTTP_FAILED");
    if(response.url&&response.url!==DOL_ETA539_URL)
      throw fail("DOL_ETA539_REDIRECT_REJECTED");
    const declared=Number(response.headers?.get?.("content-length"));
    if(Number.isFinite(declared)&&declared>maxBytes)throw fail("DOL_ETA539_TOO_LARGE");
    let bytes;
    if(response.body?.getReader){
      const reader=response.body.getReader(),parts=[];let total=0;
      for(;;){
        const {done,value}=await reader.read();
        if(done)break;
        total+=value.byteLength;
        if(total>maxBytes){await reader.cancel?.();throw fail("DOL_ETA539_TOO_LARGE");}
        parts.push(Buffer.from(value));
      }
      bytes=Buffer.concat(parts,total);
    }else if(typeof response.arrayBuffer==="function"){
      bytes=Buffer.from(await response.arrayBuffer());
    }else{
      bytes=Buffer.from(await response.text(),"utf8");
    }
    if(bytes.byteLength>maxBytes)throw fail("DOL_ETA539_TOO_LARGE");
    if(abort.signal.aborted)throw fail("DOL_ETA539_TIMEOUT");
    const body=new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    return {body,httpStatus:Number(response.status??200),
      contentType:response.headers?.get?.("content-type")??null,bodySha256:hash(bytes)};
  }finally{clearTimeout(timer);}
}

// sourceConfig comes from an exact B manifest once an authorised caller exists.
// A stored release date and hash are not authority by themselves.
export function createEmploymentR6DolEta538Provider({
  fetchImpl=globalThis.fetch,now=()=>new Date(),sourceConfig,
}={}){
  const {releaseDate,releaseAt,expectedInitialWeekEnd,originalPdfSha256}=sourceConfig??{};
  if(typeof fetchImpl!=="function"||!dateISO(releaseAt)
    ||releaseAt.slice(0,10)!==releaseDate
    ||typeof expectedInitialWeekEnd!=="string"
    ||!/^\d{4}-\d{2}-\d{2}$/.test(expectedInitialWeekEnd)
    ||!HEX64.test(originalPdfSha256??"")||Date.parse(releaseAt)>now().getTime())
    throw fail("DOL_ETA538_PIN_REQUIRED");

  return {
    async fetchGroup(groupName,{mode}={}){
      if(groupName!==GROUP||mode!=="ONE_YEAR")
        throw fail("DOL_ETA538_GROUP_OR_MODE_FORBIDDEN");
      let requests=0,nationalRows=[],nationalSnapshot=null;
      let nationalCode=null;
      let nationalEvidence={responseFormat:"ETA538_PDF",parsedNationalSeriesCount:0,
        latestNationalObservationDate:null,bodySha256:null};
      // One exact archived PDF GET; never the mutable latest endpoint or
      // the existing National XML POST in the same two-request operation.
      const pdf=await fetchVerifiedDolAdvancePdf({
        releaseDate,expectedInitialWeekEnd,now,
        fetchImpl:async(...args)=>{requests++;return fetchImpl(...args);},
      });
      if(pdf.status!=="CANDIDATE_ONLY"){
        nationalCode="DOL_ETA538_PDF_INVALID";
      }else if(pdf.source?.sha256!==originalPdfSha256){
        nationalCode="DOL_ETA538_PDF_PIN_MISMATCH";
      }else{
        const shaped=buildDolAdvanceStoreCandidate(pdf.rawPdfBytes,{
          releaseDate,releaseAt,expectedInitialWeekEnd,now,
        });
        if(shaped.status!=="CANDIDATE_ONLY"||shaped.snapshots.length!==1||
          shaped.rows.length!==4||new Set(shaped.rows.map(x=>x.logicalSeriesId)).size!==4||
          NATIONAL.some(id=>!shaped.rows.some(x=>x.logicalSeriesId===id))||
          shaped.originalPdfSha256!==originalPdfSha256){
          nationalCode="DOL_ETA538_SHAPE_INVALID";
        }else{
          nationalRows=shaped.rows;
          nationalSnapshot=shaped.snapshots[0];
          nationalEvidence={responseFormat:"ETA538_PDF",parsedNationalSeriesCount:4,
            latestNationalObservationDate:shaped.rows.map(x=>x.observationDate).sort().at(-1),
            bodySha256:originalPdfSha256,sourceKind:"ETA538_ARCHIVED_RELEASE"};
        }
      }
      // Independent ETA539 state collection is retained even if PDF fails.
      // It remains the second and final DOL provider request.
      let stateRows=[],stateSnapshot=null,stateCode=null;
      try{
        requests++;
        const retrievedAt=now().toISOString();
        const state=await fetchBoundedEta539(fetchImpl);
        const parsed=await parseEta539ShadowRows(state.body,{retrievedAt,historyWeeks:112});
        stateRows=parsed.rows??[];
        stateSnapshot={
          releaseGroup:GROUP,provider:"DOL_ETA",requestKey:"DOL_ETA539:112w",
          releaseAt:null,retrievedAt,httpStatus:state.httpStatus,
          contentType:state.contentType,body:state.body,
          detail:{responseHash:state.bodySha256,mode:"ONE_YEAR",historyWeeks:112,
            parserMeta:parsed.meta??null},
        };
        if(!stateRows.length)stateCode="DOL_ETA539_NO_COMPLETE_CORE_WEEK";
      }catch{stateCode="DOL_ETA539_SOURCE_FAILED";}
      return {
        rows:[...nationalRows,...stateRows],
        snapshots:[...(nationalSnapshot?[nationalSnapshot]:[]),
          ...(stateSnapshot?[stateSnapshot]:[])],
        requestCount:requests,
        missingSeries:[...(nationalSnapshot?[]:NATIONAL),
          ...(stateRows.length?[]:["STATE_INITIAL_CLAIMS"])],
        nationalResponseEvidence:nationalEvidence,
        // Keep the ETA539 failure separately when both DOL sources fail;
        // the primary code still identifies the National failure first.
        ...(stateCode?{stateFailureCode:stateCode}:{}),
        ...(nationalCode||stateCode?{partialFailureCode:nationalCode??stateCode}:{}),
      };
    },
  };
}


// Scheduled RELEASE is a separate, source-SHA-approved PC lane; it does not
// relax the exact PDF hash pin required by the independent manual ONE_YEAR B.
// The newest *scheduled* official archived PDF is selected by date (never by
// a moving "latest" URL), then byte-hashed and archived with the four rows.
// Calls remain exactly one official PDF GET + one independent ETA539 GET.
export function createEmploymentR6ScheduledDolProvider({
  fetchImpl=globalThis.fetch,now=()=>new Date(),
}={}) {
  if(typeof fetchImpl!=="function")throw fail("DOL_ETA538_FETCH_REQUIRED");
  return {
    async fetchGroup(groupName,{mode,releaseAt}={}) {
      if(groupName!==GROUP||mode!=="RELEASE"||!dateISO(releaseAt))
        throw fail("DOL_ETA538_SCHEDULED_SCOPE_FORBIDDEN");
      const current=now();
      const scheduled=latestDolClaimsReleaseAt(current);
      if(!scheduled||scheduled.toISOString()!==releaseAt)
        throw fail("DOL_ETA538_RELEASE_NOT_SCHEDULED");
      const releaseDate=releaseAt.slice(0,10);
      const day=Date.parse(releaseDate+"T00:00:00.000Z");
      const dow=new Date(day).getUTCDay();
      if(![3,4].includes(dow))throw fail("DOL_ETA538_RELEASE_DAY_UNVERIFIED");
      const saturdayBefore=new Date(day-(dow+1)*86_400_000).toISOString().slice(0,10);
      let requests=0,nationalRows=[],nationalSnapshot=null,nationalCode=null;
      let nationalEvidence={responseFormat:"ETA538_PDF",parsedNationalSeriesCount:0,
        latestNationalObservationDate:null,bodySha256:null,sourceKind:"ETA538_ARCHIVED_RELEASE"};
      const pdf=await fetchVerifiedDolAdvancePdf({
        releaseDate,expectedInitialWeekEnd:saturdayBefore,now,
        fetchImpl:async(...args)=>{requests++;return fetchImpl(...args);},
      });
      if(pdf.status!=="CANDIDATE_ONLY"){
        nationalCode="DOL_ETA538_PDF_INVALID";
      }else{
        const shaped=buildDolAdvanceStoreCandidate(pdf.rawPdfBytes,{
          releaseDate,releaseAt,expectedInitialWeekEnd:saturdayBefore,now,
        });
        if(shaped.status!=="CANDIDATE_ONLY"||shaped.snapshots.length!==1||
          shaped.rows.length!==4||new Set(shaped.rows.map(x=>x.logicalSeriesId)).size!==4||
          NATIONAL.some(id=>!shaped.rows.some(x=>x.logicalSeriesId===id))||
          shaped.originalPdfSha256!==pdf.source.sha256||
          shaped.rows.some(x=>x.releaseDate!==releaseAt)){
          nationalCode="DOL_ETA538_SHAPE_INVALID";
        }else{
          nationalRows=shaped.rows;
          nationalSnapshot=shaped.snapshots[0];
          nationalEvidence={responseFormat:"ETA538_PDF",parsedNationalSeriesCount:4,
            latestNationalObservationDate:shaped.rows.map(x=>x.observationDate).sort().at(-1),
            bodySha256:shaped.originalPdfSha256,sourceKind:"ETA538_ARCHIVED_RELEASE",
            releaseDate,priorPinRequired:false};
        }
      }
      let stateRows=[],stateSnapshot=null,stateCode=null;
      try{
        requests++;
        const retrievedAt=now().toISOString();
        const state=await fetchBoundedEta539(fetchImpl);
        // Keep the regular RELEASE scope (60 weeks), not the manual 1Y 112w.
        const parsed=await parseEta539ShadowRows(state.body,{retrievedAt,historyWeeks:60});
        stateRows=parsed.rows??[];
        stateSnapshot={
          releaseGroup:GROUP,provider:"DOL_ETA",requestKey:"DOL_ETA539:60w",
          releaseAt:null,retrievedAt,httpStatus:state.httpStatus,
          contentType:state.contentType,body:state.body,
          detail:{responseHash:state.bodySha256,mode:"RELEASE",historyWeeks:60,
            parserMeta:parsed.meta??null},
        };
        if(!stateRows.length)stateCode="DOL_ETA539_NO_COMPLETE_CORE_WEEK";
      }catch{stateCode="DOL_ETA539_SOURCE_FAILED";}
      if(requests!==2)throw fail("DOL_RELEASE_REQUEST_BUDGET_INVALID");
      return {
        rows:[...nationalRows,...stateRows],
        snapshots:[...(nationalSnapshot?[nationalSnapshot]:[]),
          ...(stateSnapshot?[stateSnapshot]:[])],
        requestCount:requests,
        missingSeries:[...(nationalSnapshot?[]:NATIONAL),
          ...(stateRows.length?[]:["STATE_INITIAL_CLAIMS"])],
        nationalResponseEvidence:nationalEvidence,
        ...(stateCode?{stateFailureCode:stateCode}:{}),
        ...(nationalCode||stateCode?{partialFailureCode:nationalCode??stateCode}:{}),
      };
    },
  };
}
