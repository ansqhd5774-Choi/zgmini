import InvestorSearchGuide from '../../components/investor-search-guide';
import {RISK_INVESTOR_SEARCH} from '../../lib/investor-search-content';
import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import RecessionPanel from "./recession-panel";
import "./recession-mobile-judgement.css";
import "./recession-mobile-header.css";
import "../inflation/inflation-beginner-reading-r1.css";
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
 return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   
   <SearchIntentIntro topic="recession"/>
   <RiskDetailBeginnerLayout><RecessionPanel/><BeginnerRiskGuide topic="recession"/></RiskDetailBeginnerLayout>
   <DetailReadingGuide title="미국 경기침체 지표와 방어점수를 읽는 방법"
    variant="beginner"
    displayTitle="미국 경기침체 점수, 처음이라면 이렇게 보세요"
    intro="점수는 경기침체 확률이 아니에요. 경제가 얼마나 버티고 있는지 네 가지 질문으로 알아보세요."
    sections={[
     {title:"45점이면 경기침체 확률이 45%인가요?",text:"아니요. 경기 방어점수는 고용·생산·소비 등 경제활동이 얼마나 잘 버티고 있는지 나타내는 평가점수예요. 0~100점 중 높은 쪽이 경기 방어에 유리하고, 실제로 침체가 일어날 확률을 뜻하지는 않아요.",highlight:"높은 쪽이 경기 방어에 유리",bold:"경기 방어점수"},
     {title:"경기침체는 어떻게 판단하나요?",text:"미국 경기침체는 GDP만으로 확정하지 않아요. 미국의 경기순환을 판정하는 NBER은 일자리·소득·생산·소비 등 여러 경제활동이 넓은 범위에서 상당 기간 줄었는지를 함께 살펴봐요. 한 지표만 나빠졌다고 침체가 확정되는 건 아니에요.",highlight:"여러 경제활동이 넓은 범위에서 상당 기간 줄었는지",bold:"일자리·소득·생산·소비"},
     {title:"점수가 내려가면 주식은 떨어지나요?",text:"점수가 내려가면 경기 방어 신호가 약해진 거예요. 고용과 소비가 함께 나빠지면 기업의 매출·이익에 부담을 줄 수 있지만, 점수 하나만으로 주가 방향이나 매매 시점을 확정할 수는 없어요. 여러 지표의 움직임을 함께 보세요.",highlight:"여러 지표의 움직임을 함께 보세요",bold:"경기 방어 신호가 약해진"},
     {title:"과거 차트와 오늘 발표한 통계가 왜 다를까요?",text:"이 페이지의 경기침체 R13은 현재 확보한 개정 통계(Current Vintage)로 과거도 다시 계산해요. 당시 처음 발표됐던 값만으로 만든 실시간 백테스트가 아니므로, 예전 날짜에 표시된 점수를 그날 이미 알 수 있었던 점수처럼 해석하면 안 돼요.",highlight:"현재 확보한 개정 통계(Current Vintage)",bold:"실시간 백테스트가 아니므로"},
    ]}
    sources={[{href:"https://www.nber.org/research/business-cycle-dating",label:"NBER 미국 경기순환·경기침체 판정"},{href:"https://fred.stlouisfed.org/release?rid=456",label:"FRED Sahm Rule Recession Indicator"},{href:"https://www.bls.gov/cps/",label:"미국 노동통계국 고용·실업 통계"},{href:"https://www.bea.gov/data/gdp/gross-domestic-product",label:"미국 경제분석국 GDP"}]}
    related={[{href:"/inflation/",label:"미국 인플레이션 지표"},{href:"/fear-greed/usa/",label:"미국 공포탐욕지수"}]}
   />
  <DetailInvestorNotes topic="recession"/>
 <InvestorSearchGuide id="investor-search-recession" copy={RISK_INVESTOR_SEARCH['recession']}/>
</div>
 </main></>;
}
