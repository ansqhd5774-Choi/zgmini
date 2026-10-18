import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import SupplyShockPanel from "./supply-shock-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
const title="미국 공급 충격 지표 | 공급망·유가·물가 위험 - ZGmini";
const description="공급망 압력과 유가·원자재 변화를 통해 미국 공급 충격 위험을 확인하세요. 안전점수, 기간별 차트와 지표 해석을 제공합니다.";
const url="https://zgmini.kr/supply-shock/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/supply-shock-share.png",width:1200,height:630,alt:"ZGmini 미국 공급 충격 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/supply-shock-share.png"]}};
export default function SupplyShockPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="supply-shock"/><RiskDetailBeginnerLayout><SupplyShockPanel/><BeginnerRiskGuide topic="supply-shock"/></RiskDetailBeginnerLayout><DetailInvestorNotes topic="supply-shock"/>
</div></main></>}
