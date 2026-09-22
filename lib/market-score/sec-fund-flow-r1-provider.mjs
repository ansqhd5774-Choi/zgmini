const PAGE_URL="https://www.sec.gov/data-research/statistics-data-visualizations/registered-fund-statistics/registered-funds-flows";
const TABLE_TITLE="Aggregate Inflows, Outflows, and Net Flows of Index and Non-Index Funds (Percent of Net Assets)";
const SERIES_NAME="All - Net";
const SOURCE="U.S. SEC Registered Fund Statistics";
const USER_AGENT="ZGMINI/1.0 (+https://zgmini.kr)";

const finite=value=>typeof value==="number"&&Number.isFinite(value);
const monthKey=value=>typeof value==="string"&&/^\d{4}-\d{2}$/.test(value);
const allowedHost=host=>host==="www.sec.gov"||host==="sec.gov";

function partial(reason,meta={}){
  return {
    status:"PARTIAL",
    rows:[],
    source:SOURCE,
    sourcePage:PAGE_URL,
    sourceUrl:null,
    sourceReleaseDate:null,
    unit:"PERCENT_OF_LAGGED_NET_ASSETS",
    seriesId:"FLOW_US_REGISTERED_FUND_NET_FLOW_RATIO",
    reason,
    ...meta,
  };
}

function timeoutSignal(ms){
  return typeof AbortSignal?.timeout==="function"?AbortSignal.timeout(ms):undefined;
}

export function resolveSecFundFlowsJsonUrl(html,{pageUrl=PAGE_URL}={}){
  if(typeof html!=="string"||!html.trim())return null;
  const matches=[
    ...html.matchAll(/href\s*=\s*["']([^"']*Flows_\d{2}-\d{2}-\d{4}\.json(?:\?[^"']*)?)["']/gi),
  ];
  const urls=[];
  for(const match of matches){
    try{
      const url=new URL(match[1],pageUrl);
      if(url.protocol!=="https:"||!allowedHost(url.hostname))continue;
      if(!/^\/files\/\d{4}-\d{2}\/Flows_\d{2}-\d{2}-\d{4}\.json$/i.test(url.pathname))continue;
      urls.push(url);
    }catch{}
  }
  if(urls.length!==1)return null;
  return urls[0].href;
}

export function releaseDateFromSecFlowsUrl(urlLike){
  try{
    const url=new URL(urlLike);
    if(!allowedHost(url.hostname))return null;
    const match=url.pathname.match(/\/Flows_(\d{2})-(\d{2})-(\d{4})\.json$/i);
    if(!match)return null;
    const [,mm,dd,yyyy]=match;
    const date=`${yyyy}-${mm}-${dd}`;
    const parsed=new Date(`${date}T00:00:00Z`);
    if(Number.isNaN(parsed.valueOf())||parsed.toISOString().slice(0,10)!==date)return null;
    return date;
  }catch{return null;}
}

export function parseSecRegisteredFundFlowPayload(payload,{sourceUrl=null}={}){
  if(!payload||typeof payload!=="object"||Array.isArray(payload)){
    return partial("SEC_FLOWS_INVALID_JSON",{sourceUrl});
  }

  const matches=Object.entries(payload).filter(([,value])=>
    value?.metadata?.title===TABLE_TITLE
  );
  if(matches.length!==1){
    return partial("SEC_FLOWS_PERCENT_TABLE_NOT_UNIQUE",{sourceUrl,tableMatches:matches.length});
  }

  const [tableKey,table]=matches[0];
  const allData=table?.data?.["all-data"];
  if(!Array.isArray(allData)){
    return partial("SEC_FLOWS_ALL_DATA_MISSING",{sourceUrl,tableKey});
  }

  const series=allData.filter(item=>item?.name===SERIES_NAME);
  if(series.length!==1||!Array.isArray(series[0]?.data)){
    return partial("SEC_FLOWS_ALL_NET_NOT_UNIQUE",{sourceUrl,tableKey,seriesMatches:series.length});
  }

  const rows=[];
  const seen=new Set();
  for(const point of series[0].data){
    const key=point?.name;
    const value=point?.y;
    if(!monthKey(key)||!finite(value)){
      return partial("SEC_FLOWS_INVALID_POINT",{sourceUrl,tableKey});
    }
    if(seen.has(key)){
      return partial("SEC_FLOWS_DUPLICATE_MONTH",{sourceUrl,tableKey,month:key});
    }
    seen.add(key);

    const [year,month]=key.split("-").map(Number);
    const expectedX=Date.UTC(year,month-1,1);
    if(finite(point?.x)&&point.x!==expectedX){
      return partial("SEC_FLOWS_DATE_X_MISMATCH",{sourceUrl,tableKey,month:key});
    }
    rows.push({observationDate:`${key}-01`,value});
  }

  rows.sort((a,b)=>a.observationDate.localeCompare(b.observationDate));
  if(!rows.length){
    return partial("SEC_FLOWS_NO_ROWS",{sourceUrl,tableKey});
  }

  return {
    status:"READY_CURRENT_VINTAGE_RAW",
    rows,
    source:SOURCE,
    sourcePage:PAGE_URL,
    sourceUrl,
    sourceReleaseDate:releaseDateFromSecFlowsUrl(sourceUrl),
    tableKey,
    tableTitle:TABLE_TITLE,
    seriesName:SERIES_NAME,
    unit:"PERCENT_OF_LAGGED_NET_ASSETS",
    seriesId:"FLOW_US_REGISTERED_FUND_NET_FLOW_RATIO",
    rawPayloadExposed:false,
    reason:null,
  };
}

export async function fetchSecRegisteredFundFlows({
  fetchImpl=globalThis.fetch,
  pageUrl=PAGE_URL,
  timeoutMs=12000,
}={}){
  if(typeof fetchImpl!=="function")return partial("SEC_FLOWS_FETCH_UNAVAILABLE");
  let requestCount=0;

  try{
    requestCount++;
    const page=await fetchImpl(pageUrl,{
      headers:{accept:"text/html,application/xhtml+xml", "user-agent":USER_AGENT},
      redirect:"follow",
      signal:timeoutSignal(timeoutMs),
    });
    if(!page?.ok)return partial("SEC_FLOWS_PAGE_HTTP_ERROR",{requestCount,httpStatus:page?.status??0});

    const html=await page.text();
    const dataUrl=resolveSecFundFlowsJsonUrl(html,{pageUrl});
    if(!dataUrl)return partial("SEC_FLOWS_JSON_LINK_NOT_FOUND",{requestCount});

    requestCount++;
    const data=await fetchImpl(dataUrl,{
      headers:{accept:"application/json", "user-agent":USER_AGENT},
      redirect:"follow",
      signal:timeoutSignal(timeoutMs),
    });
    if(!data?.ok)return partial("SEC_FLOWS_JSON_HTTP_ERROR",{requestCount,httpStatus:data?.status??0,sourceUrl:dataUrl});

    const payload=await data.json();
    const parsed=parseSecRegisteredFundFlowPayload(payload,{sourceUrl:dataUrl});
    return {...parsed,requestCount};
  }catch(error){
    return partial("SEC_FLOWS_REQUEST_FAILED",{
      requestCount,
      errorCode:error?.name??"UNKNOWN",
    });
  }
}

export {
  PAGE_URL as SEC_REGISTERED_FUND_FLOWS_PAGE,
  TABLE_TITLE as SEC_REGISTERED_FUND_FLOWS_TABLE_TITLE,
  SERIES_NAME as SEC_REGISTERED_FUND_FLOWS_SERIES,
};
