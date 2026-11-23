// UI-only interpretation of the two read-only earnings informational projections.
// Never reuse error reasons as scores or substitute a stale value for a new one.
const ALLOWED_REASON=new Set([
 'STORED_PROJECTION_PENDING','PROJECTION_READ_UNAVAILABLE','STORED_PROJECTION_INVALID',
 'SOURCE_RETRIEVAL_EXPIRED','OBSERVATION_EXPIRED','FUTURE_SOURCE_OR_PERIOD',
]);
export function earningsProjectionReason(reason){
 return typeof reason==='string'&&ALLOWED_REASON.has(reason)?reason:'UPDATE_FAILED';
}
const STATUS={
 STORED_PROJECTION_PENDING:'게시 대기',
 PROJECTION_READ_UNAVAILABLE:'조회 불가',
 STORED_PROJECTION_INVALID:'자료 오류',
 SOURCE_RETRIEVAL_EXPIRED:'자료 갱신 지연',
 OBSERVATION_EXPIRED:'자료 갱신 지연',
 FUTURE_SOURCE_OR_PERIOD:'자료 시각 오류',
 UPDATE_FAILED:'자료 조회 실패',
};
/** @param {{loading?:boolean,ready?:boolean,error?:string|null,hasPayload?:boolean}} [state] */
export function earningsInfoStatus({loading=false,ready=false,error=null,hasPayload=false}={}){
 if(loading&&!ready)return '연결 확인 중';
 if(error){
  const state=STATUS[earningsProjectionReason(error)];
  return ready?'이전 유효자료 유지 · '+state:state;
 }
 if(ready)return '연결 완료';
 return hasPayload?'자료 형식 확인 필요':'게시 대기';
}
