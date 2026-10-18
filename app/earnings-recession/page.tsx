import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import EarningsRecessionPanel from "./earnings-recession-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
const title="미국 실적 침체 | EPS·매출·마진·이익 폭 - ZGmini";
const description="미국 기업 실적 침체를 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요. 현재 실적 안전점수와 관측일, 기간별 흐름을 함께 제공합니다.";
const url="https://zgmini.kr/earnings-recession/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 실적 침체 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function EarningsRecessionPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="earnings-recession"/><RiskDetailBeginnerLayout><EarningsRecessionPanel/><BeginnerRiskGuide topic="earnings-recession"/></RiskDetailBeginnerLayout><DetailInvestorNotes topic="earnings-recession"/>
</div></main></>}
