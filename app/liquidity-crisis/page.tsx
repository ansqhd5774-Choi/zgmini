import DetailInvestorNotes from "../detail-investor-notes";
import type {Metadata} from "next";
import LiquidityCrisisPanel from "./liquidity-crisis-panel";

const title="미국 유동성 위기 | 주요 지표·현재값·판단 - ZGmini";
const description="미국 유동성 위기 방어점수와 단기자금시장·Repo·은행 준비금·TGA·ON RRP·M2·국채 변동성의 현재값과 판단을 한 페이지에서 확인하세요.";
const url="https://zgmini.kr/liquidity-crisis/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 유동성 위기 상세"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function LiquidityCrisisPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <LiquidityCrisisPanel/>
  <DetailInvestorNotes topic="liquidity-crisis"/>
</div>
 </main>;
}
