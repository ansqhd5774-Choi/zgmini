// Information-only BLS display helpers; never produce a risk score or source date.
export function earningsCostRetrievalDay(value){
  if(typeof value!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/.test(value))return '—';
  const timestamp=Date.parse(value);
  return Number.isFinite(timestamp)&&new Date(timestamp).toISOString()===value
    ?value.slice(0,10):'—';
}

export function earningsCostDisplayStatus(row,ready){
  if(ready)return '참고';
  if(row?.status==='STALE'||row?.freshness?.status==='STALE')return '갱신 지연';
  return '확인 대기';
}
