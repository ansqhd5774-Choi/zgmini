import type {Metadata} from "next";
import RecessionPanel from "./recession-panel";

const title="미국 경기침체 | 주요 지표·현재값·판단 - ZGmini";
const description="미국 경기침체 방어점수와 고용·GDP·생산·소비·소득·신용 지표의 기준, 현재값, 긍정·중립·부정 판단을 한 페이지에서 확인하세요.";
const url="https://zgmini.kr/recession/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 경기침체 상세"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function RecessionPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <RecessionPanel/>
  </div>
 </main>;
}
