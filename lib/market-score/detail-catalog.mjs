// Public display catalog only. No formulas, weights or provider gate internals.
const names={
 inflation:['Core PCE','Core CPI','Core CPI 3M 연율','기대인플레이션'],
 employment:['실업률','비농업고용 3M 평균','신규 실업수당 4W 평균','시간당 임금상승률'],
 rates:['Fed 정책금리','미국 2년물','미국 10년 실질금리','미국 10년물'],
 credit:['HY 신용 스트레스','IG 신용 스트레스','채권 변동성','회사채시장 종합 스트레스'],
 growth:['실질 GDP 성장률','제조업 모멘텀','서비스업 매출 모멘텀','산업생산'],
 consumption:['실질 PCE','소매판매','실질 가처분소득','개인저축률'],
 earnings:['EPS 성장률','매출 성장률','이익 성장 종목 비율','영업/순이익률'],
 liquidity:['은행 준비금','M2 증가율','TGA 변화','ON RRP 변화'],
 fundFlows:['외국인 미국주식 순매수','미국 주식 ETF·펀드 순유입','전체 TIC 순유입','위험자산 유입 비중'],
 breadth:['S&P500 200DMA 상회 종목','Advance/Decline','52주 신고가−신저가','Equal Weight 상대강도'],
 dollarFx:['Broad Dollar Index','달러 3개월 변화율','EME Dollar Index','달러 변동성'],
 commodities:['WTI','Brent','구리','휘발유'],
};
const aliases={
 'S&P500 200DMA 상회 종목':['200DMA 상회'],
 'Advance/Decline':['상승 종목 비율'],
 'Equal Weight 상대강도':['동일가중 상대강도'],
};
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function marketDetailRows(domainId,indicators=[]){
 return (names[domainId]??[]).map(label=>{
  const matches=indicators.filter(item=>[label,...(aliases[label]??[])].includes(item.name??item.label));
  if(domainId==='rates'){
   const item=matches.length===1?matches[0]:null;
   const ready=item?.status==='READY';
   const displayValue=ready&&typeof item?.displayValue==='string'?item.displayValue:null;
   return {
    componentId:item?.componentId??['policy','nominal','real','tenYear'][names.rates.indexOf(label)],
    label,valueType:item?.valueType??(label==='Fed 정책금리'?'range':'number'),
    score:null,raw:true,value:ready&&finite(item?.value)?item.value:null,
    currentValue:ready&&finite(item?.currentValue)?item.currentValue:null,
    currentRange:ready?item?.currentRange??null:null,
    displayValue,formattedValue:ready?item?.formattedValue??displayValue:null,
    unit:item?.unit??'%',asOfDate:item?.asOfDate??null,
    history:Array.isArray(item?.history)?item.history:[],
    source:item?.source??null,sourceUrl:item?.sourceUrl??null,sourceKey:item?.sourceKey??null,
    status:ready?'READY':'UNAVAILABLE',freshness:item?.freshness??'UNAVAILABLE',
    stale:item?.stale??true,unavailableReason:item?.unavailableReason??(ready?null:'NO_VALID_OBSERVATION'),
   };
  }
  // Ambiguous, unavailable and unapproved observations never become a number.
  const item=matches.length===1&&matches[0].status==='READY'?matches[0]:null;
  const score=finite(item?.score)&&item.score>=0&&item.score<=100?item.score:null;
  const raw=domainId==='breadth'||domainId==='fundFlows'||(score===null&&finite(item?.value));
  return {label,score,raw,value:finite(item?.value)?item.value:null,unit:item?.unit??''};
 });
}
