import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import RecessionPanel from "./recession-panel";
import "./recession-mobile-judgement.css";
import "./recession-mobile-header.css";
import DetailReadingGuide from "../detail-reading-guide";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";

const title="미국 경기침체 지표 | 실업률·GDP·Sahm Rule·장단기 금리차 - ZGmini";
const description="미국 경기침체 지표를 실업률·Sahm Rule, 비농업고용, 실질 GDP, 산업생산, 소비, 장단기 금리차와 신용여건으로 확인하세요. ZGmini 0~100 방어점수는 경기침체 확률이 아니며 현재값·관측일·1년 추이를 제공합니다.";
const url="https://zgmini.kr/recession/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 경기침체 지표·실업률·GDP·Sahm Rule 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function RecessionPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a aria-label="메인 대시보드로 돌아가기" title="메인 대시보드로 돌아가기" className="group inline-flex h-11 w-11 items-center justify-center rounded-full border border-blue-300/35 bg-blue-300/5 text-blue-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-200 hover:-translate-x-0.5 hover:border-blue-200/70 hover:bg-blue-300/15 hover:text-white hover:shadow-[0_0_16px_rgba(96,165,250,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] active:translate-x-0 active:scale-90 active:border-blue-100 active:bg-blue-200/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#03121d] motion-reduce:transform-none motion-reduce:transition-none" href="/">
    <span aria-hidden="true" className="text-xl font-bold leading-none">←</span>
   </a>
   <SearchIntentIntro topic="recession"/>
   <RiskDetailBeginnerLayout><RecessionPanel/><BeginnerRiskGuide topic="recession"/></RiskDetailBeginnerLayout>
   <DetailReadingGuide title="미국 경기침체 지표와 방어점수를 읽는 방법"
    sections={[
     {title:"방어점수는 경기침체 확률이 아닙니다",text:"ZGmini의 0~100 점수는 고용·실질 GDP·산업생산·소비·소득 등 여러 지표를 종합한 경기 방어점수입니다. 예를 들어 54점이 경기침체 발생 확률 54%라는 뜻은 아닙니다. 점수가 높을수록 경기 방어가 양호한 방향이며, 각 지표의 현재값과 판단을 함께 확인하세요."},
     {title:"실질 GDP 2개 분기만으로 침체를 확정하지 않습니다",text:"미국 경기침체 판단은 실질 GDP뿐 아니라 비농업고용, 실업률, 실질소득, 소비, 산업생산처럼 경제 전반의 약화를 함께 봐야 합니다. Sahm Rule과 장단기 금리차도 유용한 선행·확인 지표지만 하나의 신호만으로 침체를 확정하지 마세요."},
     {title:"현재 개정 자료와 보조지표를 구분하세요",text:"화면의 Current Vintage 이력은 현재 확보한 개정 통계로 과거 구간을 계산한 자료입니다. 당시 발표본만 사용한 실시간 백테스트와는 다를 수 있습니다. 표의 보조지표는 종합점수 구성요소와 구분해 읽고, 월별·분기별 자료의 관측일과 데이터 기준일을 함께 확인하세요."},
    ]}
    sources={[{href:"https://www.nber.org/research/business-cycle-dating",label:"NBER 미국 경기순환·경기침체 판정"},{href:"https://fred.stlouisfed.org/release?rid=456",label:"FRED Sahm Rule Recession Indicator"},{href:"https://www.bls.gov/cps/",label:"미국 노동통계국 고용·실업 통계"},{href:"https://www.bea.gov/data/gdp/gross-domestic-product",label:"미국 경제분석국 GDP"}]}
    related={[{href:"/inflation/",label:"미국 인플레이션 지표"},{href:"/fear-greed/usa/",label:"미국 공포탐욕지수"}]}
   />
  <DetailInvestorNotes topic="recession"/>
</div>
 </main>;
}
