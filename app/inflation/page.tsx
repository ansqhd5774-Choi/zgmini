import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import InflationPanel from "./inflation-panel";
import "./inflation-mobile-judgement.css";
import "./inflation-mobile-header.css";
import "./inflation-beginner-reading-r1.css";
import DetailReadingGuide from "../detail-reading-guide";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";

const title="미국 인플레이션 지수 | CPI·PCE·기대물가·물가 추이 - ZGmini";
const description="미국 인플레이션 지수와 물가 안정 점수를 확인하세요. CPI·PCE, 임금·에너지 등 16개 물가 지표의 현재값과 최근 1년 추이, 주식시장과의 관계를 초보자도 쉽게 이해할 수 있습니다.";
const url="https://zgmini.kr/inflation/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 CPI·PCE·인플레이션 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function InflationPage(){
 return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   
   <SearchIntentIntro topic="inflation"/>
   <RiskDetailBeginnerLayout><InflationPanel/><BeginnerRiskGuide topic="inflation"/></RiskDetailBeginnerLayout>
   <DetailReadingGuide title="미국 인플레이션 점수를 읽는 방법"
    variant="beginner"
    displayTitle="미국 물가 점수, 처음이라면 이렇게 보세요"
    intro="점수와 물가상승률은 다른 숫자예요. 아래 네 가지만 알면 차트와 표를 쉽게 읽을 수 있어요."
    sections={[
     {title:"70점이면 물가가 70% 오른 건가요?",text:"아니요. ZGmini의 0~100점은 미국 물가가 얼마나 안정적인 방향인지 보여주는 점수예요. 점수가 높을수록 안정적인 쪽에 가깝다는 뜻이고, 실제 물가상승률은 아래 지표 표에서 확인해야 해요.",highlight:"점수가 높을수록 안정적인 쪽",bold:"실제 물가상승률"},
     {title:"미국 물가가 주식과 무슨 관계가 있나요?",text:"물가가 너무 빨리 오르면 미국 중앙은행이 금리(돈을 빌릴 때 내는 이자율)를 높게 유지할 수 있어요. 기업이 제품을 만드는 비용도 늘 수 있죠. 물가가 안정되면 이런 부담이 줄어들 수 있지만, 주가가 반드시 오르는 건 아니에요.",highlight:"물가가 안정되면 이런 부담이 줄어들 수",bold:"금리(돈을 빌릴 때 내는 이자율)"},
     {title:"차트가 내려가면 주식을 팔아야 하나요?",text:"점수가 내려가면 물가 안정 신호가 약해졌다는 뜻이에요. 하지만 그 자체가 매도 신호는 아니에요. 며칠 또는 몇 달의 흐름과 다른 경제지표를 함께 보세요.",highlight:"며칠 또는 몇 달의 흐름",bold:"물가 안정 신호"},
     {title:"지난달 숫자와 오늘 숫자는 왜 다를까요?",text:"물가 통계는 매일 나오는 주가와 달리 보통 한 달이나 분기마다 발표돼요. 이 페이지는 처음 발표됐을 때 저장한 자료를 사용하므로 나중에 수정된 공식 통계와 차이가 날 수 있어요. 표의 관측일은 그 숫자가 설명하는 시점이에요.",highlight:"표의 관측일",bold:"처음 발표됐을 때 저장한 자료"},
    ]}
    sources={[
     {href:"https://www.bls.gov/cpi/",label:"미국 소비자물가(CPI) 원문",description:"미국 정부가 발표한 소비자물가 수치 보기"},
     {href:"https://www.bea.gov/data/personal-consumption-expenditures-price-index",label:"미국 PCE 물가 원문",description:"미국 경제분석국의 물가 자료 보기"},
    ]}
    related={[{href:"/recession/",label:"미국 경기침체 지표"},{href:"/fear-greed/usa/",label:"미국 공포탐욕지수"}]}
   />
  <DetailInvestorNotes topic="inflation"/>
</div>
 </main></>;
}
