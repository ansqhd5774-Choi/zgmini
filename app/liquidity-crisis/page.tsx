import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import LiquidityCrisisPanel from "./liquidity-crisis-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";

const title="미국 유동성 위기 지표 | Repo·은행 준비금·TGA·M2 - ZGmini";
const description="미국 금융시장의 현금 부족과 유동성 위기 위험을 확인하세요. 단기자금시장, Repo, 은행 준비금, TGA, ON RRP, M2, 국채 변동성을 종합해 현재 유동성 방어점수와 흐름을 보여줍니다.";
const url="https://zgmini.kr/liquidity-crisis/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 유동성 위기·단기자금시장 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function LiquidityCrisisPage(){
 return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   
   <SearchIntentIntro topic="liquidity-crisis"/>
   <RiskDetailBeginnerLayout><LiquidityCrisisPanel/><BeginnerRiskGuide topic="liquidity-crisis"/></RiskDetailBeginnerLayout>
  <DetailReadingGuide title="미국 유동성 위기 방어점수를 읽는 방법"
   variant="beginner"
   displayTitle="미국 유동성 위기 점수, 처음이라면 이렇게 보세요"
   intro="점수와 단기자금 금리·은행 준비금은 서로 다른 숫자예요. 아래 네 가지를 확인해 보세요."
   sections={[
    {title:"51점이면 금융위기가 발생할 확률이 51%인가요?",text:"아니요. 이 페이지의 0~100점은 미국 금융시장이 유동성 위기에 얼마나 잘 버티고 있는지를 나타내는 방어점수예요. 점수가 높을수록 방어 여건이 양호한 방향이며, 금융위기가 일어날 확률은 아니에요.",highlight:"점수가 높을수록 방어 여건이 양호한 방향",bold:"방어점수"},
    {title:"Repo와 은행 준비금은 왜 함께 보나요?",text:"Repo는 국채 같은 담보를 맡기고 단기간 자금을 빌리는 시장이에요. 은행 준비금은 은행들이 연준에 보유한 자금이고요. 단기자금 금리가 불안정해지거나 준비금이 줄어들 때 다른 신호도 함께 살펴보면 자금시장의 긴장을 이해하는 데 도움이 돼요.",highlight:"다른 신호도 함께 살펴보면",bold:"은행 준비금"},
    {title:"점수가 내려가면 주식을 팔아야 하나요?",text:"점수 하락은 금융시장 유동성 방어 신호가 약해졌다는 뜻이에요. 하지만 바로 주가 하락이나 금융위기를 확정하지는 않아요. 단기자금 스프레드·은행 준비금·신용 위험이 여러 관측 기간에 걸쳐 함께 악화되는지 확인하세요.",highlight:"여러 관측 기간에 걸쳐 함께 악화되는지",bold:"바로 주가 하락이나 금융위기를 확정하지는 않아요"},
    {title:"지난 수치와 현재 수치, 발표일은 왜 다를까요?",text:"관측일은 그 숫자가 설명하는 기간이에요. 자료가 매일·매주·매월 서로 다른 주기로 공개되기 때문에 날짜가 달라질 수 있어요. 표의 다음 발표일 중 예상 일정은 실제 공표일과 달라질 수 있고, ‘—’는 0이 아니라 사용할 수 있는 값이 없다는 뜻이에요.",highlight:"‘—’는 0이 아니라",bold:"예상 일정은 실제 공표일과 달라질 수"},
   ]}
   sources={[
    {href:"https://www.newyorkfed.org/markets/reference-rates/additional-information-about-reference-rates",label:"뉴욕 연은 SOFR·OBFR 공표 안내",description:"단기자금 기준금리와 발표 방식 확인"},
    {href:"https://www.federalreserve.gov/releases/h41/default.htm",label:"연준 H.4.1 준비금·유동성 자료",description:"연준 자산·은행 준비금 관련 공식 자료"},
    {href:"https://www.financialresearch.gov/short-term-funding-monitor/datasets/repo/",label:"미국 OFR Repo 시장 자료",description:"단기 담보자금시장 데이터 확인"},
   ]}
   related={[{href:"/credit-risk/",label:"미국 신용 위험 지표"},{href:"/recession/",label:"미국 경기침체 지표"}]}
  />
  <DetailInvestorNotes topic="liquidity-crisis"/>
</div>
 </main></>;
}
