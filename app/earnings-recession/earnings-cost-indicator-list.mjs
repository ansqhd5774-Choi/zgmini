// UI-only adapter for the stored BLS companion-C payload. This never calculates
// a score or fetches a source API; existing known rows retain their UI labels.
export const EARNINGS_C_COST_SCHEMA='earnings-companion-c-r4-v1';

export const KNOWN_EARNINGS_COST_INDICATORS=Object.freeze([
  {id:'bls_ppi_final_demand_yoy_sa',name:'최종수요 생산자물가 상승률',description:'최종수요 생산자물가의 전년 대비 변화',series:'WPSFD4',kind:'DERIVED',unit:'PERCENT'},
  {id:'bls_ppi_final_demand_index',name:'최종수요 생산자물가 지수',description:'최종수요 생산자물가의 지수 수준',series:'WPSFD4',kind:'RAW',unit:'INDEX'},
  {id:'bls_ppi_goods_yoy_sa',name:'재화 생산자물가 상승률',description:'재화 생산자물가의 전년 대비 변화',series:'WPSFD41',kind:'DERIVED',unit:'PERCENT'},
  {id:'bls_ppi_goods_index',name:'재화 생산자물가 지수',description:'재화 생산자물가의 지수 수준',series:'WPSFD41',kind:'RAW',unit:'INDEX'},
  {id:'bls_unit_labor_cost_yoy',name:'비농업 단위노동비용 증가율',description:'비농업 단위노동비용의 전년 대비 변화',series:'PRS85006111',kind:'RAW',unit:'PERCENT'},
]);

const knownIds=new Set(KNOWN_EARNINGS_COST_INDICATORS.map(row=>row.id));
const knownById=new Map(KNOWN_EARNINGS_COST_INDICATORS.map(row=>[row.id,row]));

function safeBlsRow(row){
  const known=knownById.get(row?.indicatorId);
  return row!==null&&typeof row==='object'&&!Array.isArray(row)
    &&typeof row.indicatorId==='string'&&/^bls_[a-z0-9_]{3,100}$/.test(row.indicatorId)
    &&row.provider==='BLS'
    &&typeof row.seriesId==='string'&&/^[A-Z0-9]{4,25}$/.test(row.seriesId)
    &&row.sourceURL==='https://data.bls.gov/timeseries/'+row.seriesId
    &&typeof row.name==='string'&&row.name.length>0&&row.name.length<=150
    &&row.category==='COST_PRESSURE'
    &&['RAW','DERIVED'].includes(row.kind)
    &&['PERCENT','INDEX'].includes(row.unit)
    &&row.changeUnit===(row.unit==='INDEX'?'INDEX_POINTS':'PERCENTAGE_POINTS')
    &&['MONTHLY','QUARTERLY'].includes(row.frequency)
    &&row.adjustment==='SA'
    &&['READY','PARTIAL','PENDING','SOURCE_FAILED','UNAVAILABLE','STALE'].includes(row.status)
    &&(row.status!=='READY'||Number.isFinite(row.value))
    &&(!known||(known.series===row.seriesId&&known.kind===row.kind&&known.unit===row.unit));
}

export function buildEarningsCostIndicatorView(payload){
  const valid=payload?.schemaVersion===EARNINGS_C_COST_SCHEMA
    &&payload?.historicalMode==='CURRENT_RETRIEVAL_NOT_PIT'
    &&Array.isArray(payload?.rows);
  const rows=[];
  const indicators=[...KNOWN_EARNINGS_COST_INDICATORS];
  if(valid){
    const seen=new Set();
    for(const row of payload.rows){
      if(!safeBlsRow(row)||seen.has(row.indicatorId))continue;
      seen.add(row.indicatorId);
      rows.push(row);
      if(!knownIds.has(row.indicatorId)){
        indicators.push({
          id:row.indicatorId,
          name:row.name,
          description:row.kind==='DERIVED'
            ?'BLS 저장 관측값을 기반으로 계산한 파생 지표'
            :'BLS에서 발표한 저장 원자료 지표',
          series:row.seriesId,
        });
      }
    }
  }
  return {valid,rows,indicators};
}
