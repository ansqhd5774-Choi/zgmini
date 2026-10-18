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
const description="미국 기업 실적 침체를 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요. 현재 실적 안전점수와 관측일, 기간별 흐름을 함께 제공합니다.";
const url="https://zgmini.kr/earnings-recession/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 실적 침체 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function EarningsRecessionPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="earnings-recession"/><RiskDetailBeginnerLayout><EarningsRecessionPanel/><BeginnerRiskGuide topic="earnings-recession"/></RiskDetailBeginnerLayout>
<DetailReadingGuide title="미국 실적 침체 점수와 E1 저장 실적 읽기"
 variant="beginner"
 displayTitle="미국 기업 실적 점수, 처음이라면 이렇게 보세요"
 intro="메인 진단과 저장 실적 지표는 서로 다른 점수입니다. 네 가지를 구분해서 확인하세요."
 sections={[
  {title:"84.7점과 73.5점은 왜 다른가요?",text:"84.7점은 메인 기업 실적 방어 진단이고 73.5점은 E1-R5에 저장된 13개 실적 지표의 종합 점수예요. 대상과 계산 기준이 다르므로 두 점수를 같은 차트의 이전·현재 값처럼 비교하면 안 돼요.",highlight:"대상과 계산 기준이 다르므로",bold:"메인 기업 실적 방어 진단"},
  {title:"점수가 높으면 실적 침체가 없다는 뜻인가요?",text:"높은 점수는 저장된 평가 기준에서 기업 실적 여건이 양호한 방향이라는 뜻이에요. 공식 침체 판정이나 앞으로 주가가 오를 확률은 아니며, 매출과 이익이 여러 기업으로 확산되는지도 함께 살펴보세요.",highlight:"기업 실적 여건이 양호한 방향",bold:"공식 침체 판정이나 앞으로 주가가 오를 확률은 아니며"},
  {title:"분석 모집단 500개는 모두 유효하다는 뜻인가요?",text:"500개는 분석 대상으로 선정한 기업의 수예요. 13개 지표 각각에 실제 유효값을 제공한 기업 수와는 다르며, 유효 기업 수가 확인되지 않았을 때 이를 500개라고 표시하지 않아요.",highlight:"유효 기업 수가 확인되지 않았을 때",bold:"분석 대상으로 선정한 기업의 수"},
  {title:"평가 기준일과 1년 차트는 어떻게 읽나요?",text:"평가 기준일은 SEC 기업 공시와 BEA·BLS 통계, CFO 전망을 종합해 점수를 평가한 날짜예요. 각각의 원자료 발표일이 아니에요. 차트는 저장된 실제 점만 표시하므로, 관측점이 적다고 없는 날짜를 채워 넣지는 않아요.",highlight:"각각의 원자료 발표일이 아니에요",bold:"저장된 실제 점만 표시"},
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
