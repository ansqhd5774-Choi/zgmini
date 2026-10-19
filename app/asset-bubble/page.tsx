import SiteHeader from "@/components/site-header";
import DetailInvestorNotes from "../detail-investor-notes";
import SearchIntentIntro from "../search-intent-intro";
import type {Metadata} from "next";
import AssetBubblePanel from "./asset-bubble-panel";
import BeginnerRiskGuide from "../beginner-risk-guide";
import RiskDetailBeginnerLayout from "../risk-detail-beginner-layout";
import DetailReadingGuide from "../detail-reading-guide";
import "../inflation/inflation-beginner-reading-r1.css";
const title="미국 자산 버블 | 밸류에이션·가격가속·투기자금 - ZGmini";
const description="미국 자산 버블 안전점수와 밸류에이션 압력, 가격가속, 위험자산 비중, 투기성 자금흐름, 시장폭 괴리, 과잉유동성을 확인하세요.";
const url="https://zgmini.kr/asset-bubble/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini 미국 자산 버블 상세"}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function AssetBubblePage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><SearchIntentIntro topic="asset-bubble"/><RiskDetailBeginnerLayout><AssetBubblePanel/><BeginnerRiskGuide topic="asset-bubble"/></RiskDetailBeginnerLayout><DetailReadingGuide title="미국 자산 버블 안전점수를 읽는 방법"
 variant="beginner"
 displayTitle="미국 자산 버블 점수, 처음이라면 이렇게 보세요"
 intro="점수는 가격 전망이 아닙니다. 네 가지 질문으로 과열 신호와 결측 자료를 구분해 보세요."
 sections={[
  {title:"점수가 낮으면 언제 폭락한다는 뜻인가요?",text:"아니요. 버블 안전점수는 가격·유동성·투기성 자금 등의 과열 압력을 비교하는 지표입니다. 붕괴 날짜나 확률을 예측하는 수치가 아니며, 점수가 높을수록 과열 부담이 낮은 방향입니다.",highlight:"붕괴 날짜나 확률을 예측하는 수치가 아니며",bold:"점수가 높을수록 과열 부담이 낮은 방향"},
  {title:"주가 상승이 곧 자산 버블인가요?",text:"아니요. 가격 상승만 보지 않고 밸류에이션, 상승 가속, 위험자산 비중, 투기성 자금, 시장폭, 과잉유동성을 함께 봅니다. 실적 개선과 가격 상승은 구분해서 읽어야 합니다.",highlight:"실적 개선과 가격 상승은 구분",bold:"가격 상승만 보지 않고"},
  {title:"연구 후보와 공개 참고 지표는 무엇이 다른가요?",text:"R9 및 R10의 방법론·출처 상태가 다를 수 있습니다. 화면에 표시된 연구 후보·참고 지표·검증 상태를 확인해야 하며, 공개 참고 지표라고 해서 과거의 출처 권리·시점 검증이 모두 완료됐다는 뜻은 아닙니다.",highlight:"출처 상태가 다를 수 있습니다",bold:"검증이 모두 완료됐다는 뜻은 아닙니다"},
  {title:"이전 값과 발표일에 ‘—’가 표시되는 이유는?",text:"‘—’는 0이 아니라 확인된 저장 자료가 없다는 뜻입니다. 분기 관측일, 실제 저장일과 공식 발표일은 서로 다르며, 현재 개정 자료로 재구성한 1년 차트는 당시 투자자에게 제공됐던 백테스트가 아닙니다.",highlight:"‘—’는 0이 아니라 확인된 저장 자료가 없다는 뜻",bold:"분기 관측일, 실제 저장일과 공식 발표일은 서로 다르며"},
 ]}
 related={[{href:"/earnings-recession/",label:"기업 실적 침체 지표"},{href:"/credit-risk/",label:"미국 신용 위험 지표"}]}
 />
 <DetailInvestorNotes topic="asset-bubble"/>
</div></main></>}
