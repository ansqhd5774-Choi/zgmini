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

const title="미국 인플레이션 위험 지표 | 재가속·지속성·7개 평가 축 - ZGmini";
const description="미국 인플레이션 압력과 재가속·지속성 위험을 7개 평가 축, CPI·PCE·생산자물가·임금·에너지 등 16개 입력지표와 저장된 1년 추이로 확인하세요. 12대 경제지표 물가와는 다른 R2 진단입니다.";
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
    displayTitle="인플레이션 위험 점수, 이렇게 읽으세요"
    intro="R2는 16개 입력지표를 7개 영역으로 살펴보는 안정성 점수입니다. 실제 물가상승률이나 미래 위험 확률과 구별해서 읽으세요."
    sections={[
     {title:"점수 60이면 인플레이션 위험이 60%인가요?",text:"아니요. R2의 0~100점은 물가 압력 신호의 상대적 안정성을 평가한 숫자입니다. 점수가 높으면 안정적인 쪽, 낮으면 부담이 큰 쪽이에요. 물가상승률이나 위험 발생 확률이 아닙니다.",highlight:"상대적 안정성",bold:"상대적 안정성"},
     {title:"왜 물가 지표 외에 임금과 유가도 보나요?",text:"인플레이션 재가속은 한 통계에만 나타나지 않을 수 있습니다. 기조 물가, 예상 물가, 생산자·수입 가격, 노동비용과 수요 환경을 함께 살펴 압력의 지속성을 평가합니다. 모든 지표가 같은 단위인 것은 아닙니다.",highlight:"압력의 지속성",bold:"기조 물가"},
     {title:"이 신호가 주식시장에 주는 영향은?",text:"인플레이션 압력이 다시 높아지면 금리 인하가 늦어질 수 있고 기업의 비용·마진에 부담이 될 수 있습니다. 반대로 압력이 둔화해도 주가 상승이 보장되지는 않아요. 점수 하나로 매매를 결정하지 마세요.",highlight:"점수 하나로 매매를 결정하지 마세요.",bold:"기업의 비용·마진"},
     {title:"12대 경제지표의 물가와 같은 점수인가요?",text:"아니요. 12대 경제지표의 물가는 별도 4요소 산식을 사용하고, 이 페이지는 16개 입력지표를 7개 평가 축으로 묶는 Inflation R2입니다. 서로 점수가 달라도 오류가 아닙니다. 이력은 처음 발표되어 저장된 자료를 기준으로 합니다.",highlight:"서로 점수가 달라도 오류가 아닙니다.",bold:"별도 4요소 산식"},
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
