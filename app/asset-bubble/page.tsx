import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import AssetBubblePanel from "./asset-bubble-panel";
const title="미국 자산 버블 | 밸류에이션·가격가속·투기자금 - ZGmini";
const description="미국 자산 버블 안전점수와 밸류에이션 압력, 가격가속, 위험자산 비중, 투기성 자금흐름, 시장폭 괴리, 과잉유동성을 확인하세요.";
const url="https://zgmini.kr/asset-bubble/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 자산 버블 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function AssetBubblePage(){return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><SearchIntentIntro topic="asset-bubble"/><AssetBubblePanel/><DetailInvestorNotes topic="asset-bubble"/>
</div></main>}
