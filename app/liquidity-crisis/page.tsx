import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import LiquidityCrisisPanel from "./liquidity-crisis-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";

const title="미국 유동성 위기 지표 | Repo·은행 준비금·TGA·M2 - ZGmini";
const description="미국 금융시장의 현금 부족과 유동성 위기 위험을 확인하세요. 단기자금시장, Repo, 은행 준비금, TGA, ON RRP, M2, 국채 변동성을 종합해 현재 유동성 방어점수와 흐름을 보여줍니다.";
const url="https://zgmini.kr/liquidity-crisis/";

export const metadata:Metadata={
 title,description,alternates:{canonical:url},robots:{index:true,follow:true},
 openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 유동성 위기·단기자금시장 분석"}]},
 twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]},
};

export default function LiquidityCrisisPage(){
 return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a>
   <SearchIntentIntro topic="liquidity-crisis"/>
   <LiquidityCrisisPanel/>
   <BeginnerRiskGuide topic="liquidity-crisis"/>
  <DetailInvestorNotes topic="liquidity-crisis"/>
</div>
 </main>;
}
