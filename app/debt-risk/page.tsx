import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import DebtRiskPanel from "./debt-risk-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 부채위험 지수 | 가계·기업 부채·DSR·금리부담 - ZGmini";
const description="미국 가계와 기업의 부채 부담을 DSR, 민간부채/GDP, 금리부담, 신용스트레스, 부채상환능력으로 확인하세요. 현재 부채위험 안전점수와 기간별 흐름을 함께 제공합니다.";
const url="https://zgmini.kr/debt-risk/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 가계·기업 부채위험 분석"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function DebtRiskPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="debt-risk"/><RiskDetailBeginnerLayout><DebtRiskPanel/><BeginnerRiskGuide topic="debt-risk"/></RiskDetailBeginnerLayout><DetailReadingGuide title="미국 부채 위험 안전점수를 읽는 방법"
 variant="beginner" displayTitle="미국 부채 위험 점수, 처음이라면 이렇게 보세요"
 intro="부채 규모와 실제 상환 부담은 다릅니다. 네 가지 질문으로 표를 읽어보세요."
 sections={[
  {title:"점수 50점은 채무 불이행 확률 50%인가요?",text:"아니요. 부채 위험의 0~100점은 상환 부담과 재무 방어 여건을 종합한 안전점수입니다. 실제 파산·연체 발생 확률이 아니며, 점수가 높을수록 부채 위험 부담이 낮은 방향입니다.",highlight:"실제 파산·연체 발생 확률이 아니며",bold:"상환 부담과 재무 방어 여건"},
  {title:"부채 규모가 크면 무조건 위험한가요?",text:"부채가 많아도 소득과 이익이 늘면 감당할 수 있습니다. DSR·민간부채/GDP·금리부담·신용스트레스·상환능력을 함께 봐야 합니다.",highlight:"소득과 이익이 늘면 감당할 수 있습니다",bold:"함께 봐야 합니다"},
  {title:"금리 상승은 어떤 영향을 주나요?",text:"대출 금리가 오르면 같은 부채여도 이자 지출이 늘 수 있습니다. 그러나 고정금리·만기 구조와 소득에 따라 영향이 달라 신용 여건과 상환능력을 함께 확인해야 합니다.",highlight:"이자 지출이 늘 수 있습니다",bold:"고정금리·만기 구조와 소득"},
  {title:"이전 값·발표일·차트가 비어 있으면?",text:"‘—’는 0이 아니라 저장된 비교 자료나 확인된 공식 발표 일정이 없다는 뜻입니다. 점수 1년 이력을 개별 부채 지표의 이전 원자료로 대신 사용하지 않으며, 관측일과 평가일을 구분해야 합니다.",highlight:"점수 1년 이력을 개별 부채 지표의 이전 원자료로 대신 사용하지 않으며",bold:"‘—’는 0이 아니라"},
 ]}
 sources={[]}
 related={[{href:"/credit-risk/",label:"미국 신용 위험 지표"},{href:"/liquidity-crisis/",label:"미국 유동성 위기 지표"}]}
 /><DetailInvestorNotes topic="debt-risk"/>
</div></main></>}
