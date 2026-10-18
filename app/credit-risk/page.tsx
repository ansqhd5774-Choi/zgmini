import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import CreditRiskPanel from "./credit-risk-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
const title="미국 신용위험 지수 | 회사채 스트레스·신용시장 위험 - ZGmini";
const description="미국 회사채 시장의 신용위험과 기업 자금조달 스트레스를 확인하세요. HY·IG·Total CMDI, 금융여건, 국채 변동성 등 주요 신용시장 지표의 현재값과 방어점수 추이를 함께 제공합니다.";
const url="https://zgmini.kr/credit-risk/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 회사채·신용시장 위험 분석"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function CreditRiskPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="credit-risk"/><RiskDetailBeginnerLayout><CreditRiskPanel/><BeginnerRiskGuide topic="credit-risk"/></RiskDetailBeginnerLayout><DetailInvestorNotes topic="credit-risk"/>
</div></main></>}
