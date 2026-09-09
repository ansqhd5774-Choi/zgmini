import type { Metadata } from "next";
import { GET } from "../../api/kospi-fear-greed/route";
import DataPanel, {type Snapshot} from "./data-panel";
const title = "한국 공포탐욕지수 오늘 | 국내 증시 투자심리 - ZGmini";
const description = "오늘 한국 공포탐욕지수와 국내 증시 투자심리 상태를 확인하세요. 현재 점수와 공포·중립·탐욕 단계, 기간별 변화와 주요 시장 심리를 ZGmini에서 한눈에 확인할 수 있습니다.";
const url = "https://zgmini.kr/fear-greed/korea/";
export const metadata: Metadata = {
  title, description, alternates: { canonical:url }, robots:{index:true,follow:true},
  openGraph:{title,description:"한국 증시의 현재 공포탐욕 점수와 투자심리 변화, 기간별 흐름을 확인하세요.",url,type:"website",siteName:"ZGmini"},
  twitter:{card:"summary_large_image",title,description},
};
export default async function KoreaPage() {
  const response = await GET();
  const initial = await response.json() as Snapshot;
  const schema = {"@context":"https://schema.org","@type":"WebPage","@id":`${url}#webpage`,url,name:title,description,isPartOf:{"@id":"https://zgmini.kr/#website"},inLanguage:"ko-KR"};
  return <div className="min-h-screen bg-[#07162d]"><main className="mx-auto max-w-5xl px-4 py-8 text-slate-100 sm:px-6 sm:py-12">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,"\\u003c")}}/>
    <a href="https://zgmini.kr/" className="inline-flex min-h-11 items-center text-sm text-blue-200">← ZGmini 메인 대시보드</a>
    <h1 className="mt-4 text-2xl font-extrabold sm:text-4xl">한국 공포탐욕지수</h1>
    <DataPanel initial={initial}/>
    <div className="mt-12 space-y-8 text-sm leading-7 text-slate-300 sm:text-base">
      <section><h2 className="mb-3 text-xl font-bold text-white">한국 공포탐욕지수란 무엇인가</h2><p>국내 주식시장의 위험 회피와 위험 선호를 점수로 살펴보는 투자심리 지표입니다. 이 페이지는 메인 대시보드와 같은 KOSPI Fear &amp; Greed 데이터를 사용합니다. ZGmini가 임의로 점수를 만들거나 CNN의 미국 지수를 한국 지수로 바꾸어 표시하지 않습니다.</p><p className="mt-3">제공처는 시장 모멘텀, 변동성, 안전자산 수요, 외국인 수급을 결합합니다. 한국 거래소가 발표하는 공식 공포탐욕지수라는 의미는 아닙니다.</p><a className="underline text-blue-200" href="https://kospi.feargreedchart.com/api-docs" target="_blank" rel="noreferrer">데이터 출처 및 산출 방법 확인 ↗</a></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">점수와 단계는 어떻게 읽나요?</h2><p>점수가 높을수록 위험을 감수하려는 심리가, 낮을수록 위험을 피하려는 심리가 강한 방향으로 해석합니다. 현재 단계는 데이터 제공처의 분류를 따릅니다.</p><dl className="mt-4 grid gap-4 sm:grid-cols-2">{[["극단적 공포","위험 회피가 매우 강한 상태입니다. 반등 가능성만 보고 하락 위험을 무시하지 않아야 합니다."],["공포","투자자들의 경계심이 높은 상태입니다. 수급과 변동성의 안정 여부를 함께 확인합니다."],["중립","위험 선호와 회피 중 어느 한쪽으로 뚜렷하게 기울지 않은 상태입니다."],["탐욕","위험을 감수하려는 심리가 강해진 상태입니다. 상승 추세와 가격 부담을 함께 살펴봅니다."],["극단적 탐욕","낙관이 매우 강한 상태입니다. 추세가 이어질 수도 있지만 과열과 급격한 변동에 유의합니다."]].map(([name,text])=><div key={name} className="border-l-2 border-blue-500 pl-4"><dt className="font-bold text-white">{name}</dt><dd>{text}</dd></div>)}</dl></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">투자 판단에 참고하는 방법</h2><p>하루 점수보다 여러 거래일 동안의 변화와 가격 흐름이 일치하는지 살펴보세요. 공포가 커졌다고 반드시 저점인 것은 아니며, 탐욕이 높다고 즉시 하락하는 것도 아닙니다. 지수는 미래 수익률을 보장하거나 매수·매도 시점을 확정하는 신호가 아닙니다.</p></section>
      <section><h2 className="mb-3 text-xl font-bold text-white">어떤 시장 데이터를 함께 보면 좋을까요?</h2><p>코스피·코스닥 등락, 외국인·기관 수급, 원/달러 환율, 거래량과 변동성, 금리와 기업 실적을 함께 확인하면 투자심리 변화의 배경을 이해하는 데 도움이 됩니다. 자신의 투자 기간과 손실 감내 범위도 함께 고려하세요.</p><a className="mt-3 inline-flex min-h-11 items-center text-blue-200 underline" href="https://zgmini.kr/">ZGmini에서 주요 경제지표 함께 보기 →</a></section>
    </div>
  </main></div>;
}
