import type {Metadata} from 'next';
import SiteHeader from "@/components/site-header";
import StagflationPanel from './stagflation-panel';
import SearchIntentIntro from '../search-intent-intro';
import BeginnerRiskGuide from '../beginner-risk-guide';
import RiskDetailBeginnerLayout from '../risk-detail-beginner-layout';
import DetailReadingGuide from '../detail-reading-guide';
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
  {title:"월별 평가와 잠정 평가는 어떻게 다른가요?",text:"월별 확정 평가는 최근 공통 관측월로 계산합니다. 최신 발표 조합은 관측 월이 다른 새 자료를 별도로 반영한 잠정 평가입니다. 월별 차트는 현재 개정치로 재구성한 것이며 발표 당시 점수가 아닙니다. ‘—’는 0이 아니라 자료 부족입니다."},
 ]} sources={[{href:"https://fred.stlouisfed.org/series/PCEPI",label:"BEA PCE 물가",description:"물가 지수 원자료"},{href:"https://fred.stlouisfed.org/series/INDPRO",label:"연준 산업생산",description:"실물 생산 원자료"},{href:"https://fred.stlouisfed.org/series/PAYEMS",label:"BLS 비농업고용",description:"고용 원자료"}]} related={[{href:"/inflation/",label:"인플레이션 지표"},{href:"/recession/",label:"경기침체 지표"},{href:"/economic-indicators/liquidity/",label:"유동성 지표"}]}/>
 <DetailReadingGuide title="스태그플레이션 위험 신호, 쉽게 읽기" variant="beginner" intro="안전 점수와 영역별 위험 강도, 월별 관측 기준을 구분해 읽어보세요." sources={[]}
 sections={[
  ["안전 점수와 영역별 위험 강도는 반대 방향입니다","맨 위 안전 점수는 높을수록 동시 위험이 낮습니다. 네 가지 영역별 위험 강도는 높을수록 부담이 큽니다. 영역 점수를 단순히 평균하거나 안전 점수와 같은 방향으로 비교하지 마세요."],
  ["성장 둔화와 경제 수축은 다른 말입니다","생산·소비·고용이 늘어나고 있어도 과거보다 증가 속도가 약하면 둔화로 평가될 수 있습니다. 증가 속도와 실제 감소 여부를 구분해서 읽으세요."],
  ["월별 차트의 날짜를 확인하세요","발표 주기가 다른 자료의 최근 공통 관측월로 계산합니다. 최근 1년 차트는 현재 개정치로 재구성한 월별 이력입니다. 해당 월에 투자자가 알던 점수나 위기를 미리 맞힌 성과가 아닙니다."],
 ].map(([title,text])=>({title,text}))} related={[{href:"/inflation/",label:"미국 인플레이션 위험 지표"},{href:"/recession/",label:"미국 경기침체 지표"}]}/>
 </div></main></>}
