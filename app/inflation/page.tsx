import type {Metadata} from "next";
import InflationPanel from "./inflation-panel";

const title="미국 인플레이션 | 7개 축과 전체 구성지표 - ZGmini";
const description="ZGmini Inflation R2의 현재 점수와 7개 축, 실제 하위 물가 지표, 저장 이력 기반 추이를 한 페이지에서 확인하세요.";
const url="https://zgmini.kr/inflation/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 인플레이션 상세"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function InflationPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <InflationPanel/>
  </div>
 </main>;
}
