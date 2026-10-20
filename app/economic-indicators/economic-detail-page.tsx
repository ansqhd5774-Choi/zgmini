import SiteHeader from "@/components/site-header";
import {WebPageJsonLd} from "../seo-jsonld";
import {economicDetailById,type EconomicDomainId} from "../../lib/economic-detail-catalog";
import EconomicDetailPanel from "./economic-detail-panel";
import "../inflation/inflation-indicator-r2.css";
import "../inflation/inflation-score-comparisons-r1.css";
import "../inflation/inflation-hero-typography-r1.css";
import "../inflation/inflation-mobile-judgement.css";
import "../inflation/inflation-beginner-reading-r1.css";
import "../shared-risk-indicator-width-r1.css";
import "./economic-detail.css";
export default function EconomicDetailPage({id}:{id:EconomicDomainId}){
 const detail=economicDetailById(id);
 if(!detail)return null;
 const title="미국 "+detail.name+" 시장지표 | "+detail.tags+" - ZGmini";
 const description=detail.description+" 저장된 0~100점과 과거 추이, 구성지표의 현재값·관측일을 확인하세요.";
 const path="/economic-indicators/"+detail.slug+"/";
 return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12">
  <div className="mx-auto max-w-6xl">
   <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4">
    <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 {detail.name}, <span className="text-sky-300">{detail.question}</span></p>
    <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{detail.description}</p>
   </div>
   <WebPageJsonLd name={title} description={description} path={path}/>
   {<EconomicDetailPanel id={id}/>}
  </div>
 </main></>;
}