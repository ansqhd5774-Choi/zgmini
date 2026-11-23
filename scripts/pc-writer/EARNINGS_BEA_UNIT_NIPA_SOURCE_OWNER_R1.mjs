// W05 BEA source-owner adapter for an independently authorized one-shot B caller.
// Importing this file never performs a provider request, PC write, or schedule.
// The existing approved B executor must authenticate the exact effect separately.
import {beaUnitNipaRequestSpec} from './EARNINGS_BEA_UNIT_NIPA_EQUIVALENCE_R1.mjs';
import {readBeaUnitNipaArchive,saveBeaUnitNipaArchive}
  from './EARNINGS_BEA_UNIT_NIPA_ARCHIVE_R1.mjs';

const ENDPOINT='https://apps.bea.gov/api/data';
const MAX_HTTP_BYTES=2_000_000;
const fail=code=>{throw Error('BEA_UNIT_NIPA_COLLECT_'+code);};
const PIN=/^[a-f0-9]{64}$/;

// Credentials are supplied by the existing PC source-owner provider loader.
// This helper has no CLI entrypoint. The caller is responsible for the B
// authorization, installed source pin, provider budget, lease and result receipt.
export async function collectBeaUnitNipaSourceOnce({
  pcBase,providers,fetchImpl=globalThis.fetch,now=Date.now,sourceSha
}={}){
  if(sourceSha!==undefined){
    if(!PIN.test(sourceSha))fail('SOURCE_PIN_INVALID');
    const stored=readBeaUnitNipaArchive({pcBase,sourceSha});
    return Object.freeze({
      status:'ALREADY_CAPTURED',providerRequests:0,
      sourceVersion:stored.sourceVersion,sourceHttpSha256:stored.sourceHttpSha256,
      sourceStoredAt:stored.sourceStoredAt,observedThrough:stored.observedThrough
    });
  }
  if(!providers||typeof providers.BEA_API_KEY!=='string'||
     !providers.BEA_API_KEY.trim())fail('CREDENTIAL_UNAVAILABLE');
  if(typeof fetchImpl!=='function'||typeof now!=='function')
    fail('DEPENDENCY_INVALID');
  const at=now();
  if(!Number.isSafeInteger(at)||at<=0)fail('SOURCE_TIME_INVALID');
  const year=new Date(at).getUTCFullYear();
  const spec=beaUnitNipaRequestSpec({observationYear:year});
  const url=new URL(ENDPOINT);
  url.searchParams.set('UserID',providers.BEA_API_KEY);
  for(const [name,value] of Object.entries(spec))
    url.searchParams.set(name,String(value));

  // One network attempt, no automatic retries; never print URL, credentials,
  // response body, exception messages, or unfiltered provider data.
  let response,body;
  try{
    response=await fetchImpl(url.toString(),{
      signal:AbortSignal.timeout(30_000),redirect:'error'
    });
    if(!response||response.ok!==true)fail('HTTP_UNAVAILABLE');
    const length=response.headers?.get?.('content-length');
    if(length!==null&&length!==undefined&&
       (!/^\d+$/.test(length)||Number(length)>MAX_HTTP_BYTES))
      fail('RESPONSE_TOO_LARGE');
    body=Buffer.from(await response.arrayBuffer());
  }catch(error){
    if(/^BEA_UNIT_NIPA_COLLECT_/.test(error?.message??''))throw error;
    fail('PROVIDER_UNAVAILABLE');
  }
  if(body.length<20||body.length>MAX_HTTP_BYTES)fail('RESPONSE_TOO_LARGE');
  const sourceStoredAt=now();
  if(!Number.isSafeInteger(sourceStoredAt)||sourceStoredAt<at)
    fail('SOURCE_TIME_INVALID');
  const saved=saveBeaUnitNipaArchive({
    pcBase,rawBytes:body,sourceStoredAt
  });
  return Object.freeze({
    status:saved.status,providerRequests:1,
    sourceVersion:saved.sourceVersion,
    sourceHttpSha256:saved.sourceHttpSha256,
    sourceStoredAt:saved.sourceStoredAt,observedThrough:saved.observedThrough
  });
}
