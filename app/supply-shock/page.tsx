import InvestorSearchGuide from '../../components/investor-search-guide';
import {RISK_INVESTOR_SEARCH} from '../../lib/investor-search-content';
import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import SupplyShockPanel from "./supply-shock-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 공급 충격 지표 | 공급망·유가·물가 위험 - ZGmini";
const description="공급망 압력과 유가·원자재 변화를 통해 미국 공급 충격 위험을 확인하세요. 안전점수, 기간별 차트와 지표 해석을 제공합니다.";
const url="https://zgmini.kr/supply-shock/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/supply-shock-share.png",width:1200,height:630,alt:"ZGmini 미국 공급 충격 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/supply-shock-share.png"]}};
export default function SupplyShockPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="supply-shock"/><RiskDetailBeginnerLayout><SupplyShockPanel/><BeginnerRiskGuide topic="supply-shock"/></RiskDetailBeginnerLayout><DetailReadingGuide title="미국 공급 충격 안전점수를 읽는 방법"
 variant="beginner" displayTitle="미국 공급 충격 점수, 처음이라면 이렇게 보세요"
 intro="유가·공급망·물가가 다르게 움직일 수 있습니다. 네 가지 질문으로 이해해 보세요."
 sections={[
  {title:"공급 충격 점수는 유가의 등락을 그대로 뜻하나요?",text:"아니요. 0~100점은 글로벌 공급망·석유 공급·에너지 가격·공급 주도 물가·산업생산 영역을 함께 평가한 방어점수입니다. 높을수록 공급 충격 부담이 낮은 방향이며 유가나 물가상승률 그 자체가 아닙니다.",highlight:"유가나 물가상승률 그 자체가 아닙니다",bold:"공급 충격 부담이 낮은 방향"},
  {title:"가격이 오르면 모두 공급 부족 때문인가요?",text:"아니요. 에너지 가격은 수요 확대와 공급 차질 모두에서 움직입니다. 이 페이지의 평가 영역은 수요의 영향을 줄여 해석하지만 원인을 확정하거나 특정 사건을 증명하지 않습니다.",highlight:"원인을 확정하거나 특정 사건을 증명하지 않습니다",bold:"수요 확대와 공급 차질 모두"},
  {title:"공급 충격과 미국 물가를 함께 봐야 하나요?",text:"공급망과 에너지 비용이 커지면 기업 생산비와 소비자물가에 시차를 두고 영향을 줄 수 있습니다. 다만 통계의 관측 기간·발표일이 서로 달라 같은 날의 변화처럼 읽으면 안 됩니다.",highlight:"관측 기간·발표일이 서로 달라",bold:"시차를 두고 영향을 줄 수 있습니다"},
  {title:"1년 차트·발표일·이전 값이 다른 이유는?",text:"점수의 월간 관측일과 화면의 저장·평가일은 다릅니다. 현재 개정 자료로 다시 계산한 과거 점수는 당시 최초 발표 자료가 아닙니다. ‘—’는 저장 근거가 없는 결측이며 0을 의미하지 않습니다.",highlight:"‘—’는 저장 근거가 없는 결측",bold:"월간 관측일과 화면의 저장·평가일은 다릅니다"},
 ]}
 sources={[]}
 related={[{href:"/inflation/",label:"미국 인플레이션 지표"},{href:"/recession/",label:"미국 경기침체 지표"}]}
 /><DetailInvestorNotes topic="supply-shock"/>
 <InvestorSearchGuide id="investor-search-supply-shock" copy={RISK_INVESTOR_SEARCH['supply-shock']}/>
</div></main></>}
