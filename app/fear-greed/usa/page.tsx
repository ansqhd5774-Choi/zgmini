import type { Metadata } from "next";
import CnnPanel from "./cnn-panel";

const title = "CNN 공포탐욕지수 | 7개 구성요소와 해석 - ZGmini";
const description = "CNN 공포탐욕지수의 현재 점수와 7개 구성요소를 원시값, 비교기준, 정규화 점수와 함께 초보자도 이해하기 쉽게 살펴보세요.";
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
    </div>
  </main>;
}
