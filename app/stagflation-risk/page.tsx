import type {Metadata} from 'next';
import SiteHeader from "@/components/site-header";
import StagflationPanel from './stagflation-panel';
import SearchIntentIntro from '../search-intent-intro';
import BeginnerRiskGuide from '../beginner-risk-guide';
import RiskDetailBeginnerLayout from '../risk-detail-beginner-layout';
import DetailReadingGuide from '../detail-reading-guide';
import DetailInvestorNotes from '../detail-investor-notes';
import {WebPageJsonLd} from '../seo-jsonld';
import '../inflation/inflation-beginner-reading-r1.css';
import '../inflation/inflation-mobile-judgement.css';
import '../inflation/inflation-mobile-header.css';
const title="미국 스태그플레이션 위험 | 물가·성장·고용 분석 - ZGmini";
const description="미국의 고물가와 성장·고용 둔화가 겹치는 위험을 확인하세요. PCE 물가와 실질소비·소득·생산·고용 등 독립 원자료 8종·10신호로 평가한 안전 점수와 현재 개정치 기준 최근 1년 월별 재구성입니다.";
const url="https://zgmini.kr/stagflation-risk/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini"},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-search-share.png"]}};
export default function StagflationPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl">
 <WebPageJsonLd name={title} description={description} path="/stagflation-risk/"/>
 <SearchIntentIntro topic="stagflation-risk"/>
 <RiskDetailBeginnerLayout><StagflationPanel/><BeginnerRiskGuide topic="stagflation-risk"/></RiskDetailBeginnerLayout>
 <DetailReadingGuide title="스태그플레이션 안전 점수를 읽는 방법" variant="beginner" displayTitle="스태그플레이션 점수, 처음이라면 이렇게 보세요" intro="물가와 성장·고용을 함께 읽고 관측월을 확인하세요."
 sections={[
  {title:"점수가 높으면 투자가 안전한가요?",text:"높을수록 스태그플레이션 동시 위험이 낮다는 뜻입니다. 시장 전체의 안전도나 위기 확률은 아닙니다."},
  {title:"성장률이 양수인데 왜 둔화인가요?",text:"경제가 늘어나더라도 증가 속도는 약해질 수 있습니다. 성장 둔화와 절대적인 수축은 구분합니다."},
  {title:"왜 물가와 고용을 함께 보나요?",text:"고물가만 나타나거나 저물가 침체만 나타난 상황을 고물가·둔화의 동시 위험과 구분하기 위해서입니다."},
  {title:"오늘 점수와 관측월이 왜 다른가요?",text:"원자료 발표 주기가 달라 최근 공통 관측월로 계산합니다. 차트는 현재 개정치로 월별 재구성한 것이며 발표 당시 점수가 아닙니다. ‘—’는 0이 아니라 자료 부족입니다."},
 ]} sources={[{href:"https://fred.stlouisfed.org/series/PCEPI",label:"BEA PCE 물가",description:"물가 지수 원자료"},{href:"https://fred.stlouisfed.org/series/INDPRO",label:"연준 산업생산",description:"실물 생산 원자료"},{href:"https://fred.stlouisfed.org/series/PAYEMS",label:"BLS 비농업고용",description:"고용 원자료"}]} related={[{href:"/inflation/",label:"인플레이션 지표"},{href:"/recession/",label:"경기침체 지표"},{href:"/economic-indicators/liquidity/",label:"유동성 지표"}]}/>
 <DetailInvestorNotes topic="stagflation-risk"/>
 </div></main></>}
