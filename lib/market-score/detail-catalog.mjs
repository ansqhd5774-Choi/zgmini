// Public display catalog only. No formulas, weights or provider gate internals.
const names={
 inflation:['목표안정','기조모멘텀','기대인플레','공급압력'],
 employment:['실업률','일자리 증가세','실업수당 신청','지역 고용 개선'],
 rates:['Fed 정책금리','미국 2년물','미국 10년 실질금리','장단기 금리차'],
 credit:['HY 신용 스트레스','IG 신용 스트레스','채권 변동성','회사채시장 종합 스트레스'],
 growth:['실질 GDP 성장률','제조업 모멘텀','서비스업 매출 모멘텀','산업생산'],
 consumption:['실질 소매판매','실질 가처분소득','개인저축률','카드 연체율'],
 earnings:['EPS 성장률','매출 성장률','이익 성장 종목 비율','영업이익률'],
 liquidity:['은행 준비금','M2 증가율','TGA 변화','ON RRP 변화'],
 fundFlows:['외국인 미국주식 순매수','미국 주식 ETF·펀드 순유입','전체 TIC 순유입','위험자산 유입 비중'],
 breadth:['해외 포트폴리오 주식수급','주식공급 폭','기관 선물 포지션','레버리지 선물 포지션'],
 dollarFx:['Broad Dollar Index','달러 3개월 변화율','EME Dollar Index','달러 변동성'],
 commodities:['WTI','Brent','구리','휘발유'],
};
const aliases={
 '해외 포트폴리오 주식수급':['Foreign Portfolio Equity Flow'],
 '주식공급 폭':['Share Supply Breadth'],
 '기관 선물 포지션':['Institutional Futures Positioning'],
 '레버리지 선물 포지션':['Leveraged Futures Positioning'],
};
const rateR3Details=[
 {componentId:'policy',label:'Fed 정책금리'},
 {componentId:'nominal',label:'미국 2년물'},
 {componentId:'real',label:'미국 10년 실질금리'},
 {componentId:'curve',label:'장단기 금리차'},
];
const rateR2LegacyDetails=[
 {componentId:'policy',label:'Fed 정책금리'},
 {componentId:'nominal',label:'미국 2년물'},
 {componentId:'real',label:'미국 10년 실질금리'},
 {componentId:'tenYear',label:'미국 10년물'},
];
const employmentR54Details=[
 {id:'employment-41',label:'실업률'},
 {id:'employment-42',label:'일자리 증가세'},
 {id:'employment-43',label:'실업수당 신청'},
 {id:'employment-44',label:'지역 고용 개선'},
];
const breadthR5Details=[
 {id:'breadth-41',label:'상승종목비율'},
 {id:'breadth-42',label:'상승거래대금비율'},
 {id:'breadth-43',label:'5일 수급 EMA'},
 {id:'breadth-44',label:'20일 수급 EMA'},
];
const breadthR3Names=['상승종목비율','상승거래대금비율','수익률커버리지','거래대금커버리지'];
const breadthR3Ids=['breadth-37','breadth-38','breadth-39','breadth-40'];
const growthR2Details=[
 {id:'G010',label:'제조업 신규주문'},
 {id:'G019',label:'산업생산'},
 {id:'G035',label:'비농업고용 증감'},
 {id:'G060',label:'신규 사업체 신청'},
];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function marketDetailRows(domainId,indicators=[]){
 const rateR3=domainId==='rates'&&indicators.some(item=>item?.componentId==='curve');
 const rateLegacy=domainId==='rates'&&!rateR3&&indicators.some(item=>item?.componentId==='tenYear');
 const employmentR54=domainId==='employment'&&employmentR54Details.every(def=>indicators.some(item=>item?.id===def.id));
 if(domainId==='growth'&&growthR2Details.every(def=>indicators.some(item=>item?.id===def.id))){
  return growthR2Details.map(def=>{
   const matches=indicators.filter(item=>item?.id===def.id);
   const item=matches.length===1&&matches[0]?.status==='READY'?matches[0]:null;
   const score=finite(item?.score)&&item.score>=0&&item.score<=100?item.score:null;
   return {label:def.label,score,raw:false,value:finite(item?.value)?item.value:null,unit:item?.unit??'',asOfDate:item?.asOfDate??item?.observationDate??null,source:item?.source??null};
  });
 }
 const r5Breadth=domainId==='breadth'&&breadthR5Details.every(def=>indicators.some(item=>item?.id===def.id));
 const r3Breadth=!r5Breadth&&domainId==='breadth'&&breadthR3Names.every(name=>indicators.some(item=>(item?.name??item?.label)===name));
 const labels=rateR3?rateR3Details.map(def=>def.label):rateLegacy?rateR2LegacyDetails.map(def=>def.label):employmentR54?employmentR54Details.map(def=>def.label):r5Breadth?breadthR5Details.map(def=>def.label):r3Breadth?breadthR3Names:(names[domainId]??[]);
 return labels.map((label,index)=>{
  const matches=rateR3
   ? indicators.filter(item=>item?.componentId===rateR3Details[index].componentId)
   : rateLegacy
   ? indicators.filter(item=>item?.componentId===rateR2LegacyDetails[index].componentId)
   : employmentR54
   ? indicators.filter(item=>item?.id===employmentR54Details[index].id)
   : r5Breadth
   ? indicators.filter(item=>item?.id===breadthR5Details[index].id)
   : r3Breadth
    ? indicators.filter(item=>item?.id===breadthR3Ids[index])
    : indicators.filter(item=>[label,...(aliases[label]??[])].includes(item.name??item.label));
  if(domainId==='rates'){
   const item=matches.length===1?matches[0]:null;
   const ready=item?.status==='READY';
   const displayValue=ready&&typeof item?.displayValue==='string'?item.displayValue:null;
   return {
    componentId:item?.componentId??['policy','nominal','real','curve'][names.rates.indexOf(label)],
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
  if(domainId==='breadth')return {
   label,score,raw:score===null&&finite(item?.value),
   value:finite(item?.value)?item.value:null,unit:item?.unit??'',
   asOfDate:item?.asOfDate??null,source:item?.source??null,
   displayValue:typeof item?.displayValue==='string'?item.displayValue:null,
  };
  const raw=domainId==='breadth'||domainId==='fundFlows'||(score===null&&finite(item?.value));
  return {label,score,raw,value:finite(item?.value)?item.value:null,unit:item?.unit??''};
 });
}
