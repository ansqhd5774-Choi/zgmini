import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import EarningsRiskOnlyPanel from "./earnings-risk-only-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 실적 침체 위험 | EPS·매출·이익률·이익 확산 - ZGmini";
const description="미국 실적 침체 위험을 EPS 성장, 매출 성장, 영업이익률과 이익 개선 기업 비율의 독립된 4지표 진단으로 확인하세요. 12대 기업 실적 지표와 점수·차트를 구분합니다.";
const url="https://zgmini.kr/earnings-recession/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 실적 침체 위험 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function EarningsRecessionPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="earnings-recession"/><RiskDetailBeginnerLayout><EarningsRiskOnlyPanel/><BeginnerRiskGuide topic="earnings-recession"/></RiskDetailBeginnerLayout>
<DetailReadingGuide title="미국 실적 침체 위험 진단 읽기"
 variant="beginner"
 displayTitle="미국 실적 침체 위험, 처음이라면 이렇게 보세요"
 intro="이 페이지는 8대 위험 지표의 실적 침체 방어 진단입니다. 12대 대표 기업 실적 점수와 혼동하지 마세요."
 sections={[
  {title:"기업 실적과 실적 침체 위험은 다른가요?",text:"12대 대표 지표의 기업 실적은 별도의 종합 평가입니다. 이 페이지는 EPS·매출·영업이익률·이익 개선의 확산으로 실적 침체 방어력을 진단합니다. 두 페이지의 점수와 차트는 서로 다른 산식을 사용하므로 혼합하면 안 됩니다.",highlight:"서로 다른 산식을 사용하므로",bold:"실적 침체 방어력을 진단합니다"},
  {title:"점수가 높으면 실적 침체가 없다는 뜻인가요?",text:"높은 점수는 현재 승인 진단 기준에서 실적 침체 방어력이 양호한 방향이라는 의미입니다. 공식 경기침체 판정이나 실적 침체 발생 확률은 아닙니다.",highlight:"실적 침체 방어력이 양호한 방향",bold:"실적 침체 발생 확률은 아닙니다"},
  {title:"네 가지 구성지표는 무엇인가요?",text:"주당이익 성장률, 매출 성장률, 영업이익률과 이익 개선 기업의 비율을 봅니다. 각 지표의 점수와 관측일은 별개이며, 관측일이 확인되지 않으면 추정 날짜를 표시하지 않습니다.",highlight:"관측일이 확인되지 않으면",bold:"주당이익 성장률"},
  {title:"평가 기준일과 1년 차트는 어떻게 읽나요?",text:"현재 진단 평가일과 각 실적 원자료의 관측일은 다를 수 있습니다. 과거 차트에는 동일 산식과 저장 출처가 검증된 진단 점수만 사용합니다. 검증되지 않은 날짜의 점수는 연결하지 않습니다.",highlight:"동일 산식과 저장 출처가 검증된 진단 점수만",bold:"관측일은 다를 수 있습니다"},
 ]}
 sources={[
  {href:"https://www.sec.gov/edgar/search/",label:"SEC EDGAR 기업 공시",description:"미국 기업의 실적과 공시 원자료 확인"},
 ]}
 related={[{href:"/economic-indicators/earnings/",label:"미국 기업 실적(12대 대표 지표)"},{href:"/recession/",label:"미국 경기침체 지표"},{href:"/credit-risk/",label:"미국 신용위험 지표"}]}
/>
<DetailInvestorNotes topic="earnings-recession"/>
</div></main></>}