import type { Metadata } from "next";
import { BarChart3, CircleAlert } from "lucide-react";
import CnnPanel from "./cnn-panel";

export const metadata: Metadata = { title: "미국 공포탐욕지수 | ZGmini", description: "CNN Fear & Greed Index의 현재값과 제공 가능한 원자료를 확인합니다." };

export default function UsaFearGreedPage() {
  return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><CnnPanel/><section className="cnn-detail-panel" aria-labelledby="cnn-detail-title"><div className="cnn-detail-heading"><div><p className="cnn-eyebrow">MARKET SENTIMENT COMPONENTS</p><h1 id="cnn-detail-title">미국 시장 · 시장 심리 구성요인</h1><p>S&amp;P 500 · NASDAQ</p></div><span>원자료와 정규화 점수 계약을 확인한 항목만 표시합니다.</span></div><div className="cnn-spectrum" aria-label="Fear에서 Greed까지의 현재 위치"><div className="cnn-spectrum-labels"><b>Extreme Fear</b><b>Fear</b><b>Neutral</b><b>Greed</b><b>Extreme Greed</b></div><div className="cnn-spectrum-track"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><div className="cnn-spectrum-empty"><CircleAlert size={18}/><span>현재 점수 위치는 검증된 응답 수신 후 표시됩니다.</span></div></div><div className="cnn-components-panel"><div><p className="cnn-eyebrow">COMPONENT DATA</p><h2>구성요인</h2><p>구성요인별 현재 정규화 점수와 출처 상태를 표시합니다.</p></div><div className="cnn-component-grid">{["공포탐욕","시장 모멘텀","변동성 (VIX)","풋/콜 비율","정크본드","안전자산 수요","주가 강도","시장 폭"].map((name) => <article key={name}><BarChart3 size={20}/><h3>{name}</h3><strong>—</strong><span>자료 확인 필요</span></article>)}</div></div><a className="cnn-return-cta" href="/">← 메인 차트로 돌아가기</a></section></div></main>;
}
