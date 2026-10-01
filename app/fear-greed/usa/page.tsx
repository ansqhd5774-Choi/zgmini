import type { Metadata } from "next";
import { BarChart3, CircleAlert } from "lucide-react";
import CnnPanel from "./cnn-panel";

const title = "CNN 공포탐욕지수 | 미국 증시 심리·차트 - ZGmini";
const description = "미국 증시, 지금은 공포일까요 탐욕일까요? CNN 공포탐욕지수의 최근 점수와 기간별 흐름을 차트로 살펴보세요. 데이터 관측일도 함께 안내해요.";
const url = "https://zgmini.kr/fear-greed/usa/";
export const metadata: Metadata = {
  title, description, alternates:{canonical:url},
  openGraph:{images: [{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],title,description,url,type:"website",siteName:"ZGmini"},
  twitter:{images:["https://zgmini.kr/zgmini-share.png"],card:"summary_large_image",title,description},
};

export default function UsaFearGreedPage() {
  return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><nav aria-label="관련 지수 안내" className="my-4 flex flex-wrap gap-4 text-sm text-blue-200"><a className="py-2 underline" href="/guide/fear-greed/">공포탐욕지수 읽는 법 →</a><a className="py-2 underline" href="/fear-greed/korea/">한국 지수도 확인하기 →</a></nav><CnnPanel/><section className="cnn-detail-panel" aria-labelledby="cnn-detail-title"><div className="cnn-detail-heading"><div><p className="cnn-eyebrow">MARKET SENTIMENT COMPONENTS</p><h1 id="cnn-detail-title">CNN 공포탐욕지수</h1><p>S&amp;P 500 · NASDAQ</p></div><span>원자료와 정규화 점수 계약을 확인한 항목만 표시합니다.</span></div><div className="cnn-spectrum" aria-label="Fear에서 Greed까지의 현재 위치"><div className="cnn-spectrum-labels"><b>Extreme Fear</b><b>Fear</b><b>Neutral</b><b>Greed</b><b>Extreme Greed</b></div><div className="cnn-spectrum-track"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><div className="cnn-spectrum-empty"><CircleAlert size={18}/><span>현재 점수 위치는 검증된 응답 수신 후 표시됩니다.</span></div></div><div className="cnn-components-panel"><div><p className="cnn-eyebrow">COMPONENT DATA</p><h2>구성요인</h2><p>구성요인별 현재 정규화 점수와 출처 상태를 표시합니다.</p></div><div className="cnn-component-grid">{["공포탐욕","시장 모멘텀","변동성 (VIX)","풋/콜 비율","정크본드","안전자산 수요","주가 강도","시장 폭"].map((name) => <article key={name}><BarChart3 size={20}/><h3>{name}</h3><strong>—</strong><span>자료 확인 필요</span></article>)}</div></div><a className="cnn-return-cta" href="/">← 메인 차트로 돌아가기</a></section></div></main>;
}
