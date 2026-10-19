"use client";
import {useKoreaFunds} from "../korea-funds-store";
import FactorAnalysisR2,{type FactorR2} from "./factor-analysis-r2";

const factors=[
 {id:"momentum",name:"시장 모멘텀",metric:"코스피·125일 이동평균",meaning:"코스피와 125거래일 이동평균의 상대적 흐름을 관측합니다.",direction:"지수의 장기 추세보다 약해지면 공포 방향입니다."},
 {id:"strength",name:"주가 강도",metric:"52주 신고가·신저가",meaning:"시장 종목의 장기 신고가와 신저가의 상대적 강도를 확인합니다.",direction:"신저가 쪽이 우세하면 공포 방향입니다."},
 {id:"breadth",name:"시장 폭",metric:"상승·하락 거래량",meaning:"상승과 하락 종목의 거래량 차이를 기반으로 시장 참여가 확산하는지 봅니다.",direction:"하락 참여가 넓어질수록 공포 방향입니다."},
 {id:"putCall",name:"풋/콜 옵션",metric:"최근 풋콜비율",meaning:"옵션시장 방어 수요의 상대적 수준을 확인합니다.",direction:"풋 비중이 커질수록 공포 방향입니다."},
 {id:"volatility",name:"시장 변동성",metric:"VKOSPI200·50일 평균",meaning:"VKOSPI200의 50일 평균 대비 예상 변동성을 살펴봅니다.",direction:"평소보다 변동성이 높아질수록 공포 방향입니다."},
 {id:"safeHaven",name:"안전자산 수요",metric:"주식·국채 20일 상대 수익률",meaning:"국내 주식과 국채의 최근 20거래일 성과 차이를 참고합니다.",direction:"국채가 주식보다 강하면 위험 회피 방향입니다."},
 {id:"junkBond",name:"정크본드 수요",metric:"국내 신용스프레드",meaning:"저신용 위험자산을 보유할 때 투자자가 요구하는 위험 보상 수준을 확인합니다.",direction:"신용스프레드가 확대되면 공포 방향입니다."},
] as const;
export default function KoreaFactorAnalysisR2(){
 const {composite:c,loading}=useKoreaFunds();
 const byId=new Map((c?.components??[]).map(item=>[item.id,item]));
 const rows:FactorR2[]=factors.map(def=>{
  const stored=byId.get(def.id);
  const score=typeof stored?.score==="number"&&Number.isFinite(stored.score)&&stored.score>=0&&stored.score<=100?stored.score:null;
  return {id:def.id,name:def.name,metric:def.metric,meaning:def.meaning,direction:def.direction,
   score,raw:null,
   state:score===null?"미확인":c?.status==="STALE"?"갱신 지연":"관측됨",
   observedAt:score===null?null:c?.observationDate??null,
  };
 });
 return <FactorAnalysisR2 market="korea" factors={rows}
  source={c?.sourceAttribution??"한국거래소 통계정보 · 한국은행 ECOS · ZGmini 자체 가공"}
  observedAt={c?.observationDate??null}
  sourceNote={loading?"공개 저장 데이터를 확인하고 있습니다.":c?.status==="WARMUP"?"계산 준비 기간입니다.":c?.status==="STALE"?"마지막 유효 자료이며 최신 관측 갱신이 지연됐습니다.":"한국 구성요소별 원시값은 공개 API에 제공되지 않으므로 임의로 표시하지 않습니다. 개별 점수는 실제 저장된 components 값만 사용합니다."}/>;
}
