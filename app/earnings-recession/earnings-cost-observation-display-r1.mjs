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

/**
 * Renderer-only coordinates: preserve null slots as gaps and only mark the
 * physical final slot when it contains a finite observation (including zero).
 */
export function earningsCostSparkGeometry(history){
  if(!Array.isArray(history))return null;
  const valid=history.map((point,index)=>({index,value:point?.value}))
    .filter(point=>typeof point.value==='number'&&Number.isFinite(point.value));
  if(valid.length<2)return null;
  const min=Math.min(...valid.map(point=>point.value));
  const max=Math.max(...valid.map(point=>point.value));
  const x=index=>5+index*110/Math.max(1,history.length-1);
  const y=value=>max===min?18:30-24*(value-min)/(max-min);
  let path='',previous=-2;
  for(const point of valid){
    path+=(previous===point.index-1?' L':' M')
      +x(point.index).toFixed(1)+' '+y(point.value).toFixed(1);
    previous=point.index;
  }
  const latest=valid.at(-1);
  const marker=latest.index===history.length-1
    ?{cx:x(latest.index),cy:y(latest.value)}:null;
  return {path:path.trim(),marker};
}
