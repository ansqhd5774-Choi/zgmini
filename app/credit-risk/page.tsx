import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import CreditRiskPanel from "./credit-risk-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 신용위험 지수 | 회사채 스트레스·신용시장 위험 - ZGmini";
const description="미국 회사채 시장의 신용위험과 기업 자금조달 스트레스를 확인하세요. HY·IG·Total CMDI, 금융여건, 국채 변동성 등 주요 신용시장 지표의 현재값과 방어점수 추이를 함께 제공합니다.";
const url="https://zgmini.kr/credit-risk/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 회사채·신용시장 위험 분석"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function CreditRiskPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="credit-risk"/><RiskDetailBeginnerLayout><CreditRiskPanel/><BeginnerRiskGuide topic="credit-risk"/></RiskDetailBeginnerLayout><DetailReadingGuide title="미국 신용 위험 방어점수를 읽는 방법"
 variant="beginner"
 displayTitle="미국 신용 위험 점수, 처음이라면 이렇게 보세요"
 intro="신용 위험 점수와 회사채·국채의 원자료는 서로 다른 숫자예요. 네 가지 질문으로 알아보세요."
 sections={[
  {title:"50점이면 기업이 부도날 확률이 50%인가요?",text:"아니요. 이 페이지의 0~100점은 미국 신용시장 스트레스를 방어하는 여건을 평가한 점수예요. 개별 기업의 부도확률이나 채권 손실률이 아니며, 점수가 높을수록 신용시장 여건이 양호한 방향입니다.",highlight:"점수가 높을수록 신용시장 여건이 양호한 방향",bold:"부도확률이나 채권 손실률이 아니며"},
  {title:"HY·IG·Total CMDI는 무엇을 보여주나요?",text:"HY는 상대적으로 신용도가 낮은 회사채, IG는 투자등급 회사채, Total은 시장 전체의 신용시장 기능을 살펴보는 지표예요. CMDI 원지수 상승은 시장 스트레스 확대를 뜻하지만, 방어점수는 높은 쪽이 양호합니다.",highlight:"CMDI 원지수 상승은 시장 스트레스 확대",bold:"방어점수는 높은 쪽이 양호"},
  {title:"국채 금리가 흔들리면 신용위험도 커지나요?",text:"국채금리 변동성이 커지면 기업의 채권 발행과 위험관리 비용이 불안정해질 수 있어요. 하지만 변동성 하나만으로 신용위험을 확정하지 않아요. 회사채 CMDI와 금융여건 신호를 함께 보세요.",highlight:"회사채 CMDI와 금융여건 신호를 함께 보세요",bold:"변동성 하나만으로 신용위험을 확정하지 않아요"},
  {title:"과거 차트와 새로 발표된 수치가 다를 수 있나요?",text:"신용 위험의 1년 차트는 현재 확보한 개정 자료(Current Vintage)로 과거를 다시 계산한 값이에요. 당시 처음 발표된 자료만으로 만든 실시간 백테스트가 아니에요. 관측일과 발표 예정일은 다르며, ‘—’는 실제 숫자 0을 뜻하지 않아요.",highlight:"현재 확보한 개정 자료(Current Vintage)",bold:"실시간 백테스트가 아니에요"},
 ]}
 sources={[
  {href:"https://www.newyorkfed.org/research/policy/cmdi",label:"뉴욕 연은 회사채 시장 CMDI",description:"HY·IG·Total 회사채 스트레스 지수와 공표 정보"},
  {href:"https://www.chicagofed.org/research/data/nfci/current-data",label:"시카고 연은 NFCI",description:"금융여건과 신용 부문 주간 지수 원문"},
  {href:"https://www.federalreserve.gov/releases/h15/",label:"연준 H.15 국채금리",description:"국채금리와 공식 발표 주기 확인"},
 ]}
 related={[{href:"/liquidity-crisis/",label:"미국 유동성 위기 지표"},{href:"/recession/",label:"미국 경기침체 지표"}]}
 />
 <DetailInvestorNotes topic="credit-risk"/>
</div></main></>}
