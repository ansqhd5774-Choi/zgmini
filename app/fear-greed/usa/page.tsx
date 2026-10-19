import DetailInvestorNotes from "../../detail-investor-notes";
import type { Metadata } from "next";
import CnnPanel from "./cnn-panel";
import DetailReadingGuide from "../../detail-reading-guide";
import InvestorIntentGuide from "../investor-intent-guide";

const title = "미국 공포탐욕지수 | CNN 지수·S&P500 투자심리 - ZGmini";
const description = "미국 CNN 공포탐욕지수의 점수·관측일·기간별 차트와 7개 구성요소를 확인하세요. S&P500 모멘텀·VIX 변동성·풋콜비율과 미국 주식시장 투자심리를 함께 분석합니다.";
const url = "https://zgmini.kr/fear-greed/usa/";
export const metadata: Metadata = {
  title, description, alternates:{canonical:url},
  openGraph:{images: [{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],title,description,url,type:"website",siteName:"ZGmini"},
  twitter:{images:["https://zgmini.kr/zgmini-share.png"],card:"summary_large_image",title,description},
};

export default function UsaFearGreedPage() {
  return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
    <div className="mx-auto max-w-6xl">
      <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
      <nav aria-label="관련 지수 안내" className="my-4 flex flex-wrap gap-4 text-sm text-blue-200">
        <a className="py-2 underline" href="#cnn-education-title">공포탐욕지수 읽는 법 →</a>
        <a className="py-2 underline" href="/fear-greed/korea/">한국 지수도 확인하기 →</a>
      </nav>
      <CnnPanel showEducation/>
      <DetailReadingGuide title="미국 공포탐욕지수 확인 순서"
        sections={[
          {title:"점수와 관측일을 함께 확인하세요",text:"차트의 점수는 해당 관측일의 투자심리를 보여줍니다. 방문한 날짜와 데이터 관측일이 같다는 뜻은 아닙니다. 현재 점수, 관측일, 선택한 기간의 흐름을 함께 확인하고, 원본 확인 필요나 이력 없음 상태에서는 확인되지 않은 값을 해석하지 마세요."},
          {title:"CNN 지수와 ZGmini 한국 지수의 차이",text:"미국 상세는 CNN이 제공한 종합값을 표시하고, 아래에서 7개 구성요소의 원시값과 CNN 환산점수를 설명합니다. 한국 상세는 ZGmini 자체 지표입니다. 두 지수는 입력 시장과 산출 방식이 달라 같은 점수라고 동일한 투자 상황을 뜻하지 않습니다."},
        ]}
        sources={[{href:"https://www.cnn.com/markets/fear-and-greed",label:"CNN Fear & Greed 원본"}]}
        related={[{href:"/fear-greed/korea/",label:"한국 공포탐욕지수"},{href:"/inflation/",label:"미국 인플레이션 지표"},{href:"/recession/",label:"미국 경기침체 지표"}]}
      />
    <InvestorIntentGuide market="usa"/>
    <DetailInvestorNotes topic="usa"/>
</div>
  </main>;
}
