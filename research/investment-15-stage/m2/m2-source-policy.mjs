// User-mandated absolute exclusion of the prohibited US disclosure source.
// Historical snapshots and the user's original PDF/calculator are not rewritten.
// No imports from disallowed data adapters are permitted in this runtime lane.

export const SOURCE_POLICY='SEC_ABSOLUTELY_PROHIBITED';
const prohibitedUrl=url=>typeof url==='string'&&/(?:^|\.)sec\.gov(?:\/|$)/i.test((()=>{
 try{return new URL(url).hostname+'/';}catch{return ''}
})());

export function withoutProhibitedStage6Evidence(stage6){
 if(stage6?.status!=='READY')return stage6;
 return {...stage6,
  candidates:stage6.candidates.map(item=>{
   if(!prohibitedUrl(item.latestSource?.url))return item;
   return {...item,verification:'SOURCE_PROHIBITED_NOT_EVALUATED',
    connection:'사용 가능한 출처로 사업 관련성을 재검증해야 합니다.',
    boundary:'이전 출처를 사용할 수 없어 해당 사업 내용은 평가에 반영하지 않습니다.',
    latestSource:null,nextVerification:'허용 출처의 발행사 IR·거래소 발표 등으로 새로 검증',
    revenue:null};
  }),
  exclusions:stage6.exclusions.filter(item=>!prohibitedUrl(item.source)),
 };
}

export function blockedLegacyFinancials(stage6){
 return {status:'BLOCKED',reason:'PREVIOUS_FINANCIAL_SNAPSHOTS_FROM_PROHIBITED_SOURCE',
  usScope:stage6?.usScope||'UNAVAILABLE',krScope:stage6?.krScope||'UNAVAILABLE',
  usCount:stage6?.candidates?.length||0,usVerifiedCount:0,
  koreanConfigured:stage6?.koreaQueue?.length||0,items:[],koreanFinancials:[],
  companyFinancialsLiveRefresh:false,investmentRanking:null,investmentScore:null,
  decision:'NO_TRADE'};
}
