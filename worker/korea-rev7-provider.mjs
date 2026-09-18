export const REV7_PROVIDER_POLICY=Object.freeze({
  krxBase:'https://data-dbg.krx.co.kr/svc/apis/',
  bokBase:'https://ecos.bok.or.kr/api/',
  timeoutMs:15000,
  maxBodyBytes:24000000,
  minKospiRows:500,
  researchOnly:true,
  productionEligible:false,
});
const validDate=value=>typeof value==='string'&&/^\d{8}$/.test(value);
const num=value=>{
  if(value==null || (typeof value==='string'&&!value.trim())) return null;
  const n=Number(String(value).replaceAll(',',''));
  return Number.isFinite(n)?n:null;
};
const required=(value,code)=>{if(value==null)throw Error(code);return value;};

async function readJson(response,policy) {
  if (!response.ok) throw Error(`UPSTREAM_HTTP_${response.status}`);
  const reader=response.body?.getReader();
  if (!reader) throw Error('BODY_MISSING');
  let bytes=0,text='';const decoder=new TextDecoder();
  while (true) {
    const part=await reader.read();
    if (part.done) break;
    bytes+=part.value.byteLength;
    if (bytes>policy.maxBodyBytes) { await reader.cancel(); throw Error('BODY_LIMIT'); }
    text+=decoder.decode(part.value,{stream:true});
  }
  text+=decoder.decode();
  try { return JSON.parse(text.replace(/^\uFEFF/,'')); }
  catch { throw Error('INVALID_JSON'); }
}
async function timedFetch(url,options,fetchImpl,policy) {
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),policy.timeoutMs);
  try { return await readJson(await Reflect.apply(fetchImpl,globalThis,[url,{...options,signal:controller.signal}]),policy); }
  catch (error) { if (error?.name==='AbortError') throw Error('TIMEOUT'); throw error; }
  finally { clearTimeout(timer); }
}
async function krxRows(pathname,date,key,fetchImpl,policy) {
  if(typeof key!=='string'||!key.trim()) throw Error('KRX_KEY_MISSING');
  const url=new URL(pathname,policy.krxBase);
  url.searchParams.set('basDd',date);
  const json=await timedFetch(url,{headers:{AUTH_KEY:key.trim(),Accept:'application/json'}},fetchImpl,policy);
  const rows=json?.OutBlock_1;
  if(!Array.isArray(rows)) throw Error('KRX_SCHEMA_ERROR');
  return rows;
}
async function bokValue(item,date,key,fetchImpl,policy) {
  if(typeof key!=='string'||!key.trim()) throw Error('BOK_KEY_MISSING');
  const url=new URL(`StatisticSearch/${encodeURIComponent(key.trim())}/json/kr/1/100/817Y002/D/${date}/${date}/${item}`,policy.bokBase);
  const json=await timedFetch(url,{headers:{Accept:'application/json'}},fetchImpl,policy);
  const rows=json?.StatisticSearch?.row;
  if(!Array.isArray(rows)||!rows.length) return null;
  const exact=rows.find(row=>String(row.TIME??'')===date) ?? rows[0];
  return num(exact?.DATA_VALUE);
}
function exact(rows,key,value) { return rows.find(row=>String(row?.[key]??'').trim()===value) ?? null; }
function optionAggregate(rows) {
  let put=0,call=0,matched=0;
  for(const row of rows) {
    if(String(row.PROD_NM??'').trim()!=='코스피200 옵션') continue;
    const right=String(row.RGHT_TP_NM??'').trim().toUpperCase();
    const volume=num(row.ACC_TRDVOL);
    if(!Number.isFinite(volume)||volume<0) continue;
    if(right==='PUT'){put+=volume;matched++;}
    else if(right==='CALL'){call+=volume;matched++;}
  }
  if(!matched) throw Error('STANDARD_KOSPI200_OPTION_MISSING');
  return {putVolume:put,callVolume:call,putCallRatio:call>0?put/call:null};
}
function stockRows(rows,date) {
  const seen=new Set(),result=[];
  for(const row of rows) {
    if(String(row.BAS_DD??'')!==date) throw Error('KOSPI_STOCK_DATE_MISMATCH');
    const securityId=String(row.ISU_CD??'').trim();
    if(!securityId || seen.has(securityId)) throw Error('KOSPI_STOCK_IDENTITY_ERROR');
    seen.add(securityId);
    const close=num(row.TDD_CLSPRC), high=num(row.TDD_HGPRC), low=num(row.TDD_LWPRC),
      changeAmount=num(row.CMPPREVDD_PRC), shareVolume=num(row.ACC_TRDVOL);
    if(close==null||high==null||low==null||shareVolume==null||shareVolume<0) continue;
    result.push({date,securityId,shortCode:securityId,close,high,low,changeAmount,shareVolume});
  }
  result.sort((a,b)=>a.securityId.localeCompare(b.securityId));
  return result;
}

/** One-date Revision 7 provider read. KRX Open API remains research/development only. */
export async function fetchRev7Date(date,{krxKey,bokKey,fetchImpl=globalThis.fetch,policy=REV7_PROVIDER_POLICY}={}) {
  if(!validDate(date)) throw Error('INVALID_DATE');
  let krxRequestCount=0,bokRequestCount=0;
  const krx=async pathname=>{krxRequestCount++;return krxRows(pathname,date,krxKey,fetchImpl,policy);};
  const bok=async item=>{bokRequestCount++;return bokValue(item,date,bokKey,fetchImpl,policy);};

  const indexRows=await krx('idx/kospi_dd_trd');
  const kospi=exact(indexRows,'IDX_NM','코스피');
  const kospiClose=num(kospi?.CLSPRC_IDX);
  if(kospiClose==null) {
    if(indexRows.length===0) return {
      requestedDate:date,status:'NO_TRADING_OBSERVATION',complete:true,rows:[],series:null,
      krxRequestCount,bokRequestCount,fetchedAt:new Date().toISOString(),
      researchOnly:true,productionEligible:false,
    };
    throw Error('KOSPI_EXACT_INDEX_MISSING');
  }

  const [bondRows,derivativeRows,kospiRows,optionRows,aaMinus3Y,bbbMinus3Y]=await Promise.all([
    krx('idx/bon_dd_trd'),
    krx('idx/drvprod_dd_trd'),
    krx('sto/stk_bydd_trd'),
    krx('drv/opt_bydd_trd'),
    bok('010300000'),
    bok('010320000'),
  ]);

  const vkospi=exact(derivativeRows,'IDX_NM','코스피 200 변동성지수');
  const ktb=exact(bondRows,'BND_IDX_GRP_NM','KTB 지수');
  const prime=exact(bondRows,'BND_IDX_GRP_NM','국고채프라임지수');
  const rows=stockRows(kospiRows,date);
  if(rows.length<policy.minKospiRows) throw Error('KOSPI_STOCK_ROWS_TOO_LOW');
  const options=optionAggregate(optionRows);

  const vkospi200Close=required(num(vkospi?.CLSPRC_IDX),'VKOSPI200_MISSING');
  const ktbTotalReturn=required(num(ktb?.TOT_EARNG_IDX),'KTB_TOTAL_RETURN_MISSING');
  const governmentPrimeTotalReturn=num(prime?.TOT_EARNG_IDX);
  const junkSpread=Number.isFinite(aaMinus3Y)&&Number.isFinite(bbbMinus3Y)?bbbMinus3Y-aaMinus3Y:null;

  return {
    requestedDate:date,
    status:'SUCCESS',
    complete:true,
    rows,
    series:{
      date,
      kospiClose,
      vkospi200Close,
      ktbTotalReturn,
      governmentPrimeTotalReturn,
      standardPutVolume:options.putVolume,
      standardCallVolume:options.callVolume,
      putCallRatio:options.putCallRatio,
      aaMinus3Y,
      bbbMinus3Y,
      junkSpread,
    },
    quality:{
      kospiCount:rows.length,
      validHighCount:rows.filter(row=>Number.isFinite(row.high)).length,
      validLowCount:rows.filter(row=>Number.isFinite(row.low)).length,
      validShareVolumeCount:rows.filter(row=>Number.isFinite(row.shareVolume)).length,
    },
    krxRequestCount,
    bokRequestCount,
    fetchedAt:new Date().toISOString(),
    researchOnly:true,
    productionEligible:false,
  };
}
