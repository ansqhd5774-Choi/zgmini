import DetailInvestorNotes from "../../detail-investor-notes";
import type { Metadata } from "next";
import DataPanel from "./data-panel";
import DetailReadingGuide from "../../detail-reading-guide";
const title = "한국 공포탐욕지수 | 코스피 시장심리·차트 - ZGmini";
const description = "요즘 국내 증시 분위기가 궁금하다면, 한국 공포탐욕지수와 기간별 차트를 살펴보세요. ZGmini 자체 지표의 최근 제공 점수와 관측일을 함께 안내해요.";
const url = "https://zgmini.kr/fear-greed/korea/";
export const metadata: Metadata = {
  title, description, alternates: { canonical:url }, robots:{index:true,follow:true},
  openGraph:{images: [{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],title,description,url,type:"website",siteName:"ZGmini"},
  twitter:{images:["https://zgmini.kr/zgmini-share.png"],card:"summary_large_image",title,description},
};
export default async function KoreaPage() {
  const schema = {"@context":"https://schema.org","@type":"WebPage","@id":`${url}#webpage`,url,name:title,description,isPartOf:{"@id":"https://zgmini.kr/#website"},inLanguage:"ko-KR"};
  return <div className="min-h-screen bg-[#07162d]"><main className="mx-auto max-w-5xl px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <a href="https://zgmini.kr/" className="inline-flex min-h-11 items-center text-sm text-blue-200">← ZGmini 메인 대시보드</a>
    <h1 className="mt-4 text-2xl font-extrabold sm:text-4xl">한국 공포탐욕지수</h1>
    <DataPanel/>
    <DetailReadingGuide title="한국 지수의 출처와 관측일"
      sections={[
        {title:"국내 시장을 위한 자체 지표",text:"한국 공포탐욕지수는 CNN 미국 지수를 그대로 복제한 값이 아닙니다. 화면의 출처 표시에 따라 한국거래소 통계정보와 한국은행 ECOS 등 국내 시장 자료를 ZGmini가 가공한 결과입니다. 방법론과 입력 시장이 다른 미국 지수와 점수 크기만으로 우열을 비교하지 마세요."},
        {title:"관측 기준일과 갱신 지연을 구분하세요",text:"현재 점수 옆의 관측 기준일은 지수가 설명하는 데이터 시점입니다. 페이지를 연 날짜나 글 수정일과 다를 수 있습니다. 갱신이 지연되거나 일부 자료를 확인할 수 없는 경우에는 화면의 상태 안내를 함께 읽고, 누락을 0점으로 해석하지 마세요."},
      ]}
      sources={[{href:"https://data.krx.co.kr/",label:"한국거래소 정보데이터시스템"},{href:"https://ecos.bok.or.kr/",label:"한국은행 ECOS"}]}
      related={[{href:"/fear-greed/usa/",label:"미국 CNN 공포탐욕지수"}]}
    />
    <DetailInvestorNotes topic="korea"/>
    <div className="mt-12 space-y-8 text-sm leading-7 text-slate-300 sm:text-base">
      <section><h2 className="mb-3 text-xl font-bold text-white">한국 공포탐욕지수란 무엇인가</h2><p>국내 주식시장의 투자심리를 살펴보는 ZGmini 자체 지표입니다. 최근 점수와 관측일을 함께 확인해 보세요.</p></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">점수와 단계는 어떻게 읽나요?</h2><p>점수가 높을수록 위험을 감수하려는 심리가, 낮을수록 위험을 피하려는 심리가 강한 방향으로 해석합니다. 단계는 서버가 소수점 1자리로 반올림한 표시점수 기준입니다: 25 미만 극단적 공포, 25 이상 45 미만 공포, 45~55 중립, 55 초과 75 이하 탐욕, 75 초과 극단적 탐욕. 현재값과 과거값에 같은 규칙을 적용합니다.</p><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["극단적 공포","위험 회피가 매우 강한 상태입니다. 반등 가능성만 보고 하락 위험을 무시하지 않아야 합니다."],["공포","투자자들의 경계심이 높은 상태입니다. 수급과 변동성의 안정 여부를 함께 확인합니다."],["중립","위험 선호와 회피 중 어느 한쪽으로 뚜렷하게 기울지 않은 상태입니다."],["탐욕","위험을 감수하려는 심리가 강해진 상태입니다. 상승 추세와 가격 부담을 함께 살펴봅니다."],["극단적 탐욕","낙관이 매우 강한 상태입니다. 추세가 이어질 수도 있지만 과열과 급격한 변동에 유의합니다."]].map(([name,text])=><div key={name} className="border-l-2 border-blue-500 pl-4"><dt className="font-bold text-white">{name}</dt><dd>{text}</dd></div>)}</dl></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">투자 판단에 참고하는 방법</h2><p>하루 점수보다 여러 거래일 동안의 변화와 가격 흐름이 일치하는지 살펴보세요. 공포가 커졌다고 반드시 저점인 것은 아니며, 탐욕이 높다고 즉시 하락하는 것도 아닙니다. 지수는 미래 수익률을 보장하거나 매수·매도 시점을 확정하는 신호가 아닙니다.</p></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">어떤 시장 데이터를 함께 보면 좋을까요?</h2><p>코스피·코스닥 등락, 외국인·기관 수급, 원/달러 환율, 거래량과 변동성, 금리와 기업 실적을 함께 확인하면 투자심리 변화의 배경을 이해하는 데 도움이 됩니다. 자신의 투자 기간과 손실 감내 범위도 함께 고려하세요.</p><a className="mt-3 inline-flex min-h-11 items-center text-blue-200 underline" href="https://zgmini.kr/">ZGmini에서 주요 경제지표 함께 보기 →</a></section>
    </div>
  </main></div>;
}
