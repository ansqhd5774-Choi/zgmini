// Record the exception category and repository code location, never its message,
// provider URL, credentials, request body, or full local stack/path.
const names=new Set(['Error','TypeError','SyntaxError','RangeError','TimeoutError','AbortError']);
const codes=new Set(['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','SQLITE_BUSY','SQLITE_ERROR','ERR_SQLITE_ERROR','ERR_INVALID_ARG_TYPE','ERR_OUT_OF_RANGE','LOCAL_PROVIDER_NETWORK_ERROR','GROWTH_CENSUS_TRANSPORT_FAILED','GROWTH_CENSUS_HTTP_500','GROWTH_CENSUS_HTTP_502','GROWTH_CENSUS_HTTP_503','GROWTH_CENSUS_HTTP_504']);
export function safeCollectionFailure(error){
 const name=names.has(error?.name)?error.name:'Error';
 const code=codes.has(error?.code)?error.code:codes.has(error?.cause?.code)?error.cause.code:null;
 const match=String(error?.stack??'').slice(0,12000).match(/(?:\/|\\)((?:worker|lib|scripts[\\/]pc-writer)[\\/][A-Za-z0-9_./\\-]+\.(?:mjs|js|ts)):(\d{1,6}):(\d{1,6})/);
 const location=match&&!match[1].includes('..')?{module:match[1].replaceAll('\\','/'),line:Number(match[2]),column:Number(match[3])}:null;
 return {name,code,location};
}
