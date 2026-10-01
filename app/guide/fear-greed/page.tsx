import type { Metadata } from "next";

const title = "공포탐욕지수 보는 법 | 미국·한국 차이와 차트 해석 - ZGmini";
const description = "공포탐욕지수가 무엇인지, 미국 CNN 지수와 한국 ZGmini 모델이 어떻게 다른지 알아보세요. 관측일·기간별 차트·자료 미완료 표시를 읽는 방법을 안내합니다.";
const url = "https://zgmini.kr/guide/fear-greed/";
export const metadata: Metadata = {
  title, description, alternates: { canonical: url },
  openGraph: { title, description, url, type: "article", images: ["https://zgmini.kr/zgmini-share.png"] },
  twitter: { card: "summary_large_image", title, description, images: ["https://zgmini.kr/zgmini-share.png"] },
};

export default function FearGreedGuide() {
  return <main className="min-h-screen bg-[#03121d] px-5 py-10 text-slate-100">
    <article className="mx-auto max-w-3xl space-y-8 leading-8">
      <a href="/" className="inline-block py-2 text-blue-200 underline">← ZGmini 대시보드</a>
      <header><p className="text-sm text-amber-300">ZGmini 이용 가이드</p><h1 className="mt-2 text-3xl font-bold leading-tight">공포탐욕지수, 어떻게 읽을까요?</h1><p className="mt-4 text-slate-300">점수 하나보다 관측일과 변화 흐름을 함께 확인하세요. 미국과 한국 지수는 서로 다른 모델입니다.</p></header>
      <nav aria-label="지수 차트 바로가기" className="flex flex-wrap gap-3">
        <a href="/fear-greed/usa/" className="rounded bg-amber-300 px-4 py-3 font-bold text-slate-950">미국 지수·차트 보기 →</a>
        <a href="/fear-greed/korea/" className="rounded border border-blue-300 px-4 py-3 font-bold text-blue-100">한국 지수·차트 보기 →</a>
      </nav>
      <section><h2 className="text-xl font-bold">공포탐욕지수란?</h2><p className="mt-3 text-slate-300">시장 참여자의 공포와 탐욕을 여러 자료로 요약해 보여주는 지표입니다. ZGmini 화면에서는 0~100 점수와 시장 심리 구간, 과거 차트를 함께 제공합니다. 낮은 값은 공포 쪽, 높은 값은 탐욕 쪽의 심리를 나타냅니다.</p></section>
      <section><h2 className="text-xl font-bold">미국과 한국 점수를 그대로 비교해도 되나요?</h2><p className="mt-3 text-slate-300">미국 카드는 CNN 공포탐욕지수를, 한국 카드는 한국 시장 자료를 활용한 ZGmini 독자 모델을 표시합니다. 자료와 계산 방식이 달라 같은 점수여도 같은 시장 상태를 뜻하지 않습니다. 각 시장의 이전 관측값과 비교해 흐름을 살펴보세요.</p></section>
      <section><h2 className="text-xl font-bold">차트는 이 순서로 확인하세요</h2><ol className="mt-3 list-decimal space-y-3 pl-6 text-slate-300"><li><strong>관측일 확인:</strong> 페이지를 연 시각과 데이터 기준일은 다를 수 있습니다.</li><li><strong>기간 선택:</strong> 1주·1개월·3개월·6개월·1년 중 보고 싶은 범위를 선택합니다. 제공되는 관측 범위에 따라 차트가 달라집니다.</li><li><strong>변화 비교:</strong> 현재 점수뿐 아니라 이전 값과 기간 내 흐름을 함께 봅니다.</li><li><strong>출처 확인:</strong> 상세 페이지에서 지표의 출처와 준비 상태를 확인합니다.</li></ol></section>
      <section><h2 className="text-xl font-bold">점수가 ‘—’ 또는 ‘자료 확인 중’이면?</h2><p className="mt-3 text-slate-300">필수 자료가 준비되지 않아 점수를 제공할 수 없다는 뜻입니다. 점수 0과 결측은 다릅니다. ZGmini는 없는 값을 중립 점수로 채우지 않으며, 종합 시장 점수도 필수 자료가 부족하면 부분 데이터로 표시할 수 있습니다.</p></section>
      <section><h2 className="text-xl font-bold">공포이면 매수, 탐욕이면 매도인가요?</h2><p className="mt-3 text-slate-300">이 지수는 시장 심리를 읽는 참고 자료이며 수익률 예측이나 매매 지시가 아닙니다. 한 지표만으로 판단하지 말고 시장 상황과 자신의 투자 조건을 함께 검토하세요.</p></section>
      <footer className="border-t border-slate-700 pt-6"><a href="/" className="inline-block py-3 font-semibold text-blue-200 underline">대시보드에서 현재 점수 확인하기 →</a><p className="text-sm text-slate-400">ZGmini · 데이터 기준일과 출처는 각 지표 화면에 표시합니다.</p></footer>
    </article>
  </main>;
}
