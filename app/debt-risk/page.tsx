import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import DebtRiskPanel from "./debt-risk-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
const title="미국 부채위험 지수 | 가계·기업 부채·DSR·금리부담 - ZGmini";
const description="미국 가계와 기업의 부채 부담을 DSR, 민간부채/GDP, 금리부담, 신용스트레스, 부채상환능력으로 확인하세요. 현재 부채위험 안전점수와 기간별 흐름을 함께 제공합니다.";
const url="https://zgmini.kr/debt-risk/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 가계·기업 부채위험 분석"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function DebtRiskPage(){return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><SearchIntentIntro topic="debt-risk"/><DebtRiskPanel/><BeginnerRiskGuide topic="debt-risk"/><DetailInvestorNotes topic="debt-risk"/>
</div></main>}
