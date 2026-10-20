// Public display catalog only. No formulas, weights or provider gate internals.
const names={
 inflation:['물가 목표 안정','물가 기조','기대 물가','공급 물가 압력'],
 employment:['실업률','일자리 증가세','실업수당 신청','지역 고용 개선'],
 rates:['미국 기준금리','2년 국채금리','미국 실질금리','장단기 금리차'],
 credit:['고위험 회사채','우량 회사채','신용여건','채권 변동성'],
 growth:['제조업 신규주문','산업생산','비농업고용 증감','신규 사업체 신청'],
 consumption:['실질 소비 최근 3개월','실질 소비 전년 대비','소비 가속·둔화'],
 earnings:['주당이익 성장','매출 성장률','이익 증가 종목','영업이익률'],
 liquidity:['은행 준비금','시중 통화량','재무부 현금','연준 단기자금'],
 fundFlows:['등록펀드 순유입'],
 breadth:['해외 포트폴리오 주식수급','주식공급 폭','기관 선물 포지션','레버리지 선물 포지션'],
 dollarFx:['Broad Dollar Index','달러 3개월 변화율','EME Dollar Index','달러 변동성'],
 commodities:['미국 원유','국제 원유','구리','휘발유'],
};
const aliases={
 '물가 목표 안정':['목표안정'],
 '물가 기조':['기조모멘텀'],
 '기대 물가':['기대인플레'],
 '공급 물가 압력':['공급압력'],
 '주당이익 성장':['EPS 성장률'],
 '이익 증가 종목':['이익 성장 종목 비율'],
 '시중 통화량':['M2 증가율'],
 '재무부 현금':['TGA 변화'],
 '연준 단기자금':['ON RRP 변화'],
 '미국 원유':['WTI'],
 '국제 원유':['Brent'],
 '해외 포트폴리오 주식수급':['Foreign Portfolio Equity Flow'],
 '주식공급 폭':['Share Supply Breadth'],
 '기관 선물 포지션':['Institutional Futures Positioning'],
 '레버리지 선물 포지션':['Leveraged Futures Positioning'],
};
const rateR3Details=[
 {componentId:'policy',label:'미국 기준금리'},
 {componentId:'nominal',label:'2년 국채금리'},
 {componentId:'real',label:'미국 실질금리'},
 {componentId:'curve',label:'장단기 금리차'},
];
const rateR2LegacyDetails=[
 {componentId:'policy',label:'미국 기준금리'},
 {componentId:'nominal',label:'2년 국채금리'},
 {componentId:'real',label:'미국 실질금리'},
 {componentId:'tenYear',label:'10년 국채금리'},
];
const creditR2Details=[
 {id:'credit-41',label:'고위험 회사채'},
 {id:'credit-42',label:'우량 회사채'},
 {id:'credit-43',label:'신용여건'},
 {id:'credit-44',label:'채권 변동성'},
];
const employmentR54Details=[
 {id:'employment-41',label:'실업률'},
 {id:'employment-42',label:'일자리 증가세'},
 {id:'employment-43',label:'실업수당 신청'},
 {id:'employment-44',label:'지역 고용 개선'},
];
// Dashboard representatives only. The complete E1-R5 S1-S13 set remains in the stored API and detail page.
const earningsR5Details=[
 {id:'S1',label:'주당이익 성장'},
 {id:'S2',label:'매출 성장률'},
 {id:'S7',label:'이익 증가 종목'},
 {id:'S3',label:'영업이익률'},
];
const breadthR5Details=[
 {id:'breadth-41',label:'오른 종목 비율'},
 {id:'breadth-42',label:'상승 거래비중'},
 {id:'breadth-43',label:'5일 수급 추세'},
 {id:'breadth-44',label:'20일 수급 추세'},
];
const breadthR3Names=['상승종목비율','상승거래대금비율','수익률커버리지','거래대금커버리지'];
const breadthR3Ids=['breadth-37','breadth-38','breadth-39','breadth-40'];
const fundFlowR54Details=[
 {id:'fund-flow-54-1',label:'전체 펀드 순유입'},
 {id:'fund-flow-54-2',label:'순유입 추세'},
 {id:'fund-flow-54-3',label:'펀드 동반 유입'},
 {id:'fund-flow-54-4',label:'환매 압력'},
];
const dollarFxR54Details=[
 {id:'dollar-fx-54-1',label:'달러 강세 부담'},
 {id:'dollar-fx-54-2',label:'단기 달러 추세'},
 {id:'dollar-fx-54-3',label:'중기 달러 추세'},
 {id:'dollar-fx-54-4',label:'달러 변동성'},
];
const growthR2Details=[
 {id:'G010',label:'제조업 신규주문'},
 {id:'G019',label:'산업생산'},
 {id:'G035',label:'비농업고용 증감'},
 {id:'G060',label:'신규 사업체 신청'},
];
const finite=value=>typeof value==='number'&&Number.isFinite(value);
export function marketDetailRows(domainId,indicators=[]){
 // The restored original four-factor market inflation producer uses stable IDs.
 // Never match its four scores to the obsolete R2 dashboard labels by position.
 if(domainId==='inflation'&&indicators.some(item=>['corePce','coreCpi','cpi','inflationExpectations'].includes(item?.id))){
  const parts=[
   {id:'corePce',label:'근원 PCE'},
   {id:'coreCpi',label:'근원 CPI'},
   {id:'cpi',label:'소비자물가'},
   {id:'inflationExpectations',label:'기대 인플레이션'},
  ];
  return parts.map(part=>{
   const matches=indicators.filter(item=>item?.id===part.id);
   const item=matches.length===1?matches[0]:null;
   const ready=item?.status==='READY'&&finite(item?.score)&&item.score>=0&&item.score<=100;
   return {label:part.label,score:ready?item.score:null,raw:false,
    value:ready&&finite(item?.value)?item.value:null,unit:item?.unit??'',
    asOfDate:item?.observationDate??item?.asOfDate??null,source:item?.source??null};
  });
 }
 // Match the verified V9 5-factor public projection by IDs, not obsolete B1-R5 labels.
 // Never create fake factors or fall back to mismatched legacy labels for V9.
 if(domainId==='breadth'){
  const v9Ids=['breadth-v9-f1','breadth-v9-f2','breadth-v9-f3','breadth-v9-f4','breadth-v9-f5'];
  if(v9Ids.every(id=>indicators.filter(item=>item?.id===id).length===1)){
   return v9Ids.map(id=>{
    const item=indicators.find(x=>x?.id===id);
    const ready=item?.status==='READY'&&finite(item?.score)&&item.score>=0&&item.score<=100;
    return {label:item?.label??item?.name??id,score:ready?item.score:null,raw:false,
     value:ready&&finite(item?.value)?item.value:null,unit:item?.unit??'',
     asOfDate:item?.observationDate??item?.asOfDate??null,source:item?.source??null};
   });
  }
 }

 if(domainId==='consumption'&&indicators.some(item=>item?.area)){
  // Dashboard representatives only; the complete R5 inputs remain in the stored API.
  return ['pce3','income3','payroll','delinquency'].map(id=>{
   const matches=indicators.filter(item=>item.id===id);
   const item=matches.length===1?matches[0]:null;
   return {label:({pce3:'실질 소비',income3:'가처분소득',payroll:'실질 총급여',delinquency:'대출 연체율'}[id]),score:item?.status==='READY'&&finite(item.score)?item.score:null,raw:false,value:finite(item?.value)?item.value:null,unit:item?.unit??'',asOfDate:item?.observationDate??null,source:item?.source??null};
  });
 }
 const rateR3=domainId==='rates'&&indicators.some(item=>item?.componentId==='curve');
 const rateLegacy=domainId==='rates'&&!rateR3&&indicators.some(item=>item?.componentId==='tenYear');
 const creditR2=domainId==='credit'&&creditR2Details.every(def=>indicators.some(item=>item?.id===def.id));
 const employmentR54=domainId==='employment'&&employmentR54Details.every(def=>indicators.some(item=>item?.id===def.id));
 const earningsR5=domainId==='earnings'&&earningsR5Details.some(def=>indicators.some(item=>item?.id===def.id));
 const r5Breadth=domainId==='breadth'&&breadthR5Details.every(def=>indicators.some(item=>item?.id===def.id));
 const r3Breadth=!r5Breadth&&domainId==='breadth'&&breadthR3Names.every(name=>indicators.some(item=>(item?.name??item?.label)===name));
 const fundFlowR54=domainId==='fundFlows'&&fundFlowR54Details.every(def=>indicators.some(item=>item?.id===def.id));
 const dollarFxR54=domainId==='dollarFx'&&dollarFxR54Details.every(def=>indicators.some(item=>item?.id===def.id));
 const growthR2=domainId==='growth';
 const labels=rateR3?rateR3Details.map(def=>def.label):rateLegacy?rateR2LegacyDetails.map(def=>def.label):creditR2?creditR2Details.map(def=>def.label):employmentR54?employmentR54Details.map(def=>def.label):earningsR5?earningsR5Details.map(def=>def.label):r5Breadth?breadthR5Details.map(def=>def.label):r3Breadth?breadthR3Names:fundFlowR54?fundFlowR54Details.map(def=>def.label):dollarFxR54?dollarFxR54Details.map(def=>def.label):growthR2?growthR2Details.map(def=>def.label):(names[domainId]??[]);
 return labels.map((label,index)=>{
  const matches=rateR3
   ? indicators.filter(item=>item?.componentId===rateR3Details[index].componentId)
   : rateLegacy
   ? indicators.filter(item=>item?.componentId===rateR2LegacyDetails[index].componentId)
   : creditR2
   ? indicators.filter(item=>item?.id===creditR2Details[index].id)
   : employmentR54
   ? indicators.filter(item=>item?.id===employmentR54Details[index].id)
   : earningsR5
   ? indicators.filter(item=>item?.id===earningsR5Details[index].id)
   : r5Breadth
   ? indicators.filter(item=>item?.id===breadthR5Details[index].id)
   : r3Breadth
    ? indicators.filter(item=>item?.id===breadthR3Ids[index])
    : fundFlowR54
    ? indicators.filter(item=>item?.id===fundFlowR54Details[index].id)
   : dollarFxR54
    ? indicators.filter(item=>item?.id===dollarFxR54Details[index].id)
   : growthR2
    ? indicators.filter(item=>item?.id===growthR2Details[index].id)
    : indicators.filter(item=>[label,...(aliases[label]??[])].includes(item.name??item.label));
  if(domainId==='rates'){
   const item=matches.length===1?matches[0]:null;
   const ready=item?.status==='READY';
   const displayValue=ready&&typeof item?.displayValue==='string'?item.displayValue:null;
   const score=ready&&finite(item?.score)&&item.score>=0&&item.score<=100?item.score:null;
   return {
    componentId:item?.componentId??['policy','nominal','real','curve'][names.rates.indexOf(label)],
    label,valueType:item?.valueType??(label==='미국 기준금리'?'range':'number'),
    score,raw:score===null,value:ready&&finite(item?.value)?item.value:null,
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
  const raw=domainId==='breadth'||(score===null&&finite(item?.value));
  return {
   label,score,raw,value:finite(item?.value)?item.value:null,unit:item?.unit??'',
   asOfDate:item?.asOfDate??item?.observationDate??null,source:item?.source??null,
  };
 });
}
