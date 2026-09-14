import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";
import CnnPanel from "./cnn-panel";

export const metadata: Metadata = { title: "미국 공포탐욕지수 | ZGmini", description: "CNN Fear & Greed Index의 현재값과 제공 가능한 원자료를 확인합니다." };

export default function UsaFearGreedPage() {
  return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><h1 className="mt-5 text-3xl font-black sm:text-5xl">미국 공포탐욕지수</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">CNN이 공개한 종합 점수를 기준으로 현재 시장 심리를 보여줍니다. 구성요인 정규화 이력이 확인되지 않는 경우 점수를 추정하지 않습니다.</p><CnnPanel/><section className="cnn-components-panel" aria-labelledby="cnn-components-title"><div><p className="cnn-eyebrow">COMPONENT DATA</p><h2 id="cnn-components-title">시장 심리 구성요인</h2><p>현재 공개 계약에서 정규화된 과거 구성요인 점수를 확인할 수 없어 보류 상태입니다.</p></div><div className="cnn-component-grid">{["시장 모멘텀","주가 강도","시장 폭","풋/콜 비율","변동성 (VIX)","안전자산 수요","정크본드 수요"].map((name) => <article key={name}><BarChart3 size={20}/><h3>{name}</h3><strong>—</strong><span>원자료 확인 필요</span></article>)}</div></section></div></main>;
}
