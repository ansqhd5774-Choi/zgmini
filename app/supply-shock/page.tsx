import type {Metadata} from "next";
import SupplyShockPanel from "./supply-shock-panel";
const title="미국 공급 충격 | GSCPI·유가·원자재·물가괴리 - ZGmini";
const description="미국 공급 충격 안전점수와 GSCPI, WTI, 휘발유, 구리, 산업생산, Headline-Core 물가괴리를 확인하세요.";
const url="https://zgmini.kr/supply-shock/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 공급 충격 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function SupplyShockPage(){return <main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><a className="inline-flex min-h-11 items-center text-sm text-blue-200" href="/">← ZGmini 메인 대시보드</a><SupplyShockPanel/></div></main>}
