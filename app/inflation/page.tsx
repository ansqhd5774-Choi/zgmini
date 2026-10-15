import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import InflationPanel from "./inflation-panel";
import DetailReadingGuide from "../detail-reading-guide";

const title="미국 인플레이션 지수 | CPI·PCE·기대물가·물가 추이 - ZGmini";
const description="미국 Core CPI·Core PCE·Headline PCE와 기대인플레이션, 생산자물가·임금·에너지 지표를 종합해 물가 안정 점수와 추이를 확인하세요. 현재값·관측일·판단도 함께 제공합니다.";
const url="https://zgmini.kr/inflation/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 CPI·PCE·인플레이션 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function InflationPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <SearchIntentIntro topic="inflation"/>
   <InflationPanel/>
   <DetailReadingGuide title="미국 인플레이션 점수를 읽는 방법"
    sections={[
     {title:"점수는 물가 상승률이 아닙니다",text:"ZGmini의 0~100 점수는 물가 안정 방향을 종합한 지표입니다. 71점이 물가 상승률 71%라는 뜻은 아닙니다. 실제 상승률은 구성 지표 표의 현재값과 단위에서 확인하세요. 점수가 높을수록 안정 방향이며, 각 지표의 긍정·중립·부정은 저장된 정규화 점수의 판단이며, 표의 기준 문구는 해석 방향을 설명합니다."},
     {title:"서로 다른 단위와 관측일을 비교하세요",text:"전년 대비 상승률, 최근 3개월 연율, 3개월 변화율은 비교 기간이 다릅니다. 같은 % 단위여도 숫자를 그대로 비교하지 말고 지표명 아래의 계산 기간과 행별 관측일을 확인하세요. 개발중 항목의 —는 실제 값 0이나 판단에 사용할 수 있는 관측값이 아닙니다."},
     {title:"초기발표 이력을 사용하는 이유",text:"이 페이지는 저장된 초기발표 이력을 사용합니다. 뒤늦게 수정된 통계의 최신 이력과 차이가 날 수 있으므로, 과거 시점의 자료와 현재 개정 자료를 구분해야 합니다. 데이터 기준일과 방법론 표기를 함께 확인하고, 과거 차트만으로 미래 물가나 수익률을 확정하지 마세요."},
    ]}
    sources={[{href:"https://www.bls.gov/cpi/",label:"미국 노동통계국 CPI"},{href:"https://www.bea.gov/data/personal-consumption-expenditures-price-index",label:"미국 경제분석국 PCE 물가지수"}]}
    related={[{href:"/recession/",label:"미국 경기침체 지표"},{href:"/fear-greed/usa/",label:"미국 공포탐욕지수"}]}
   />
  <DetailInvestorNotes topic="inflation"/>
</div>
 </main>;
}
