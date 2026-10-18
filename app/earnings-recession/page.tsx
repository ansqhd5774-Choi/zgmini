import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import EarningsRecessionPanel from "./earnings-recession-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 실적 침체 | EPS·매출·마진·이익 폭 - ZGmini";
const description="미국 기업 실적 침체를 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요. 현재 진단 점수와 별도 저장 실적 평가점수, 평가 기준일·사후 재구성 추이를 함께 확인하세요.";
const url="https://zgmini.kr/earnings-recession/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 실적 침체 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function EarningsRecessionPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="earnings-recession"/><RiskDetailBeginnerLayout><EarningsRecessionPanel/><BeginnerRiskGuide topic="earnings-recession"/></RiskDetailBeginnerLayout>
<DetailReadingGuide title="미국 실적 침체 점수와 E1 저장 실적 읽기"
 variant="beginner"
 displayTitle="미국 기업 실적 점수, 처음이라면 이렇게 보세요"
 intro="메인 진단과 저장 실적 지표는 서로 다른 점수입니다. 네 가지를 구분해서 확인하세요."
 sections={[
  {title:"메인 진단과 E1 저장 점수는 왜 다른가요?",text:"메인 점수는 기업 실적 방어 진단이고 E1 점수는 별도로 저장된 실적 지표의 평가 결과예요. 실적 버전에 따라 구성지표가 달라질 수 있어요. 대상과 계산 기준이 다르므로 두 점수를 같은 차트의 이전·현재 값처럼 비교하면 안 돼요.",highlight:"대상과 계산 기준이 다르므로",bold:"기업 실적 방어 진단"},
  {title:"점수가 높으면 실적 침체가 없다는 뜻인가요?",text:"높은 점수는 저장된 평가 기준에서 기업 실적 여건이 양호한 방향이라는 뜻이에요. 공식 침체 판정이나 앞으로 주가가 오를 확률은 아니며, 매출과 이익이 여러 기업으로 확산되는지도 함께 살펴보세요.",highlight:"기업 실적 여건이 양호한 방향",bold:"공식 침체 판정이나 앞으로 주가가 오를 확률은 아니며"},
  {title:"분석 모집단은 모두 유효한 기업인가요?",text:"분석 모집단은 대상으로 선정한 기업의 수예요. 개별 지표에 실제 유효값을 제공한 기업 수와는 다르며, 유효 기업 수가 확인되지 않았을 때 모집단 수로 대신 표시하지 않아요.",highlight:"유효 기업 수가 확인되지 않았을 때",bold:"대상으로 선정한 기업의 수"},
  {title:"평가 기준일과 1년 차트는 어떻게 읽나요?",text:"평가 기준일은 SEC 공시·BEA·BLS·CFO 자료를 종합해 실적을 평가한 날짜로, 각각의 공식 발표일은 아니에요. E1-R5 과거 차트는 현재 보유 자료를 과거 평가 시점에 맞춰 사후 재구성한 결과예요. 설문 마감일이 실제 발표일보다 앞선 경우도 있어 당시 투자자가 알 수 있었던 신호로 해석하면 안 돼요.",highlight:"사후 재구성한 결과예요",bold:"당시 투자자가 알 수 있었던 신호로 해석하면 안 돼요"},
 ]}
 sources={[
  {href:"https://www.sec.gov/edgar/search/",label:"SEC EDGAR 기업 공시",description:"미국 기업의 실적·가이던스 공시 확인"},
  {href:"https://www.bea.gov/data/income-saving/corporate-profits",label:"BEA 기업이익 통계",description:"미국 전체 기업이익 및 발표 주기"},
  {href:"https://www.bls.gov/ppi/",label:"BLS 생산자물가(PPI)",description:"생산자 가격·원가 관련 공식 통계"},
 ]}
 related={[{href:"/recession/",label:"미국 경기침체 지표"},{href:"/credit-risk/",label:"미국 신용위험 지표"},{href:"/asset-bubble/",label:"미국 자산 버블 지표"}]}
/>
<DetailInvestorNotes topic="earnings-recession"/>
</div></main></>}
