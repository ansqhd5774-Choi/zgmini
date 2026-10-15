import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import RecessionPanel from "./recession-panel";
import DetailReadingGuide from "../detail-reading-guide";

const title="미국 경기침체 지표 | 고용·GDP·생산·소비·신용 분석 - ZGmini";
const description="미국 경기침체 위험을 고용, 실질 GDP, 산업생산, 소비, 소득, 신용지표로 확인하세요. 경기침체 방어점수와 각 경제지표의 현재값·관측일·기간별 흐름을 함께 제공합니다.";
const url="https://zgmini.kr/recession/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 경기침체·고용·GDP 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function RecessionPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <SearchIntentIntro topic="recession"/>
   <RecessionPanel/>
   <DetailReadingGuide title="경기침체 방어점수의 의미와 한계"
    sections={[
     {title:"점수가 높으면 침체 위험이 높다는 뜻인가요?",text:"아닙니다. 이 페이지의 점수는 경기침체 방어점수로, 높을수록 경기 방어가 양호한 방향입니다. 54점이 경기침체 발생 확률 54%라는 뜻은 아닙니다. 고용·실질 GDP·생산·소비·소득 등 구성 지표의 현재값과 판단을 함께 확인하세요."},
     {title:"과거 차트는 현재 개정 자료를 포함합니다",text:"화면의 Current Vintage 표시는 현재 확보한 통계 이력으로 과거 구간을 계산했다는 뜻입니다. 나중에 개정된 값이 포함될 수 있어 당시 투자자가 알던 자료만으로 계산한 이력과는 다릅니다. 따라서 차트를 그대로 당시의 예측 성과로 해석하지 마세요."},
     {title:"종합점수와 보조지표를 구분하세요",text:"표에서 보조지표로 표시된 항목은 종합점수의 구성 지표와 구분해 읽습니다. 월별·분기별 자료의 발표 주기가 다르므로 데이터 기준일과 행별 관측일도 함께 확인하세요. 확인되지 않은 — 값을 0으로 채우거나 한 지표만으로 경기침체를 확정하지 마세요."},
    ]}
    sources={[{href:"https://www.bls.gov/cps/",label:"미국 노동통계국 고용·실업 통계"},{href:"https://www.bea.gov/data/gdp/gross-domestic-product",label:"미국 경제분석국 GDP"}]}
    related={[{href:"/inflation/",label:"미국 인플레이션 지표"},{href:"/fear-greed/usa/",label:"미국 공포탐욕지수"}]}
   />
  <DetailInvestorNotes topic="recession"/>
</div>
 </main>;
}
