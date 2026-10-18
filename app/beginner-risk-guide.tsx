"use client";

import {useEffect,useMemo,useRef,useState} from "react";
import {ChevronDown,ChevronUp} from "lucide-react";
import "./beginner-methodology-accordion.css";

type Topic=
 |"inflation"
 |"recession"
 |"liquidity-crisis"
 |"credit-risk"
 |"debt-risk"
 |"asset-bubble"
 |"supply-shock"
 |"earnings-recession";

type Factor={id:string;score:number};
type BeginnerCopy={status:"COPY_ONLY";summary:string;whyItMatters:string;marketMeaning:string;sourceHash:string;sourceVersion:string;sourceStoredAt:number;generatedAt:number};
type Config={
 endpoint:string;
 title:string;
 importance:string;
 marketImpact:string;
 highMeaning:string;
 lowMeaning:string;
 positiveHeading:string;
 negativeHeading:string;
 factorNames:Record<string,string>;
 factorDescriptions?:Record<string,string>;
 factorIds?:string[];
 stage:(score:number)=>string;
};

const safetyStage=(score:number,watch:string,risk:string)=>score>=75?"매우 양호":score>=60?"양호":score>=45?"중립":score>=25?watch:risk;

const configs:Record<Topic,Config>={
 inflation:{
  endpoint:"/api/inflation-detail",title:"물가 안정성",importance:"물가가 높으면 연준이 금리를 오래 높게 유지할 가능성이 커집니다. 반대로 물가가 안정되면 금리 부담이 완화될 여지가 생깁니다.",marketImpact:"물가 안정은 성장주·장기채 등 금리에 민감한 자산에 우호적일 수 있습니다. 반대로 물가 재상승은 금리 인하 기대를 약화시킬 수 있습니다.",highMeaning:"높을수록 물가가 안정 방향에 가깝다는 뜻입니다.",lowMeaning:"낮을수록 물가 압력이 강하다는 뜻입니다.",positiveHeading:"물가 안정에 기여한 요인",negativeHeading:"아직 부담이 남은 요인",stage:score=>score>=75?"매우 안정":score>=60?"안정":score>=45?"중립":score>=25?"물가 압력":"강한 물가 압력",factorNames:{CORE_PCE:"Core PCE",CORE_CPI:"Core CPI",CORE_CPI_3M:"Core CPI 3M",MEDIAN_CPI:"Median CPI",TRIM16_CPI:"16% Trimmed Mean CPI",HEADLINE_PCE:"Headline PCE",INF_EXPECT:"5Y 기대 인플레이션",PPI_FINAL:"PPI Final Demand",PPI_CORE_FD:"Core PPI Final Demand",IMPORT_EX_FUEL:"수입물가 ex Fuel",WTI:"WTI",GASOLINE:"미국 휘발유",WAGE_YOY:"평균 시간당 임금",ECI_COST:"Employment Cost Index",UNIT_LABOR_COST:"Unit Labor Cost",INDPRO:"산업생산"},
  factorDescriptions:{
   CORE_PCE:"식품·에너지를 뺀 개인소비지출 물가",
   CORE_CPI:"식품·에너지를 뺀 소비자물가",
   CORE_CPI_3M:"최근 3개월 물가 상승을 연율로 환산",
   MEDIAN_CPI:"품목별 가격 변화의 중간값",
   TRIM16_CPI:"가격 변동이 큰 품목을 일부 제외한 물가",
   HEADLINE_PCE:"식품·에너지까지 포함한 소비지출 물가",
   INF_EXPECT:"향후 5년간의 예상 물가상승률",
   PPI_FINAL:"미국 기업이 최종 수요처에 판매하는 가격",
   PPI_CORE_FD:"식품·에너지 등을 제외한 기업 판매가격",
   IMPORT_EX_FUEL:"연료를 제외한 미국 수입품 가격",
   WTI:"미국산 원유의 기준 가격",
   GASOLINE:"미국 휘발유 가격의 변화",
   WAGE_YOY:"한 시간당 평균 임금의 연간 변화",
   ECI_COST:"임금과 복지비를 포함한 고용비용",
   UNIT_LABOR_COST:"생산물 한 단위에 들어가는 인건비",
   INDPRO:"공장·광산·전력 생산량의 변화",
  }
 },
 recession:{
  endpoint:"/api/recession-detail",title:"경기 방어",importance:"경기침체는 기업 매출과 이익, 고용, 소비를 동시에 약화시킬 수 있습니다. 한 지표보다 여러 경제활동 지표가 함께 약해지는지를 보는 것이 중요합니다.",marketImpact:"경기 방어가 약해지면 경기민감주와 신용자산에 부담이 될 수 있습니다. 반대로 방어력이 유지되면 실적과 소비가 버틸 가능성이 커집니다.",highMeaning:"높을수록 경기 방어력이 양호한 방향입니다.",lowMeaning:"낮을수록 경기침체 위험 신호가 강한 방향입니다.",positiveHeading:"경기 방어에 기여한 요인",negativeHeading:"경기 부담 요인",stage:score=>safetyStage(score,"침체 주의","침체 위험"),factorNames:{nfp:"비농업고용",realGdp:"실질 GDP",industrialProduction:"산업생산",realPce:"실질 PCE",sahmGap:"Sahm Gap",retailSales:"실질 소매판매",disposableIncome:"실질 가처분소득",initialClaims:"신규 실업수당 4W",yieldCurve:"장단기 금리차",hyCreditStress:"HY 신용 스트레스",creditConditions:"신용여건"}
 },
 "liquidity-crisis":{
  endpoint:"/api/liquidity-crisis-detail",title:"유동성 방어",importance:"금융시장은 현금과 담보가 원활하게 돌 때 정상적으로 작동합니다. 단기자금시장이나 은행 준비금이 급격히 경색되면 자산가격 변동성이 커질 수 있습니다.",marketImpact:"유동성 경색은 주식·회사채 등 위험자산 전반에 빠르게 부담을 줄 수 있습니다. 자금시장이 안정되면 급격한 금융 스트레스 가능성이 낮아집니다.",highMeaning:"높을수록 자금시장과 유동성 환경이 안정적인 방향입니다.",lowMeaning:"낮을수록 유동성 경색 위험이 커지는 방향입니다.",positiveHeading:"유동성 안정에 기여한 요인",negativeHeading:"유동성 부담 요인",stage:score=>safetyStage(score,"유동성 주의","위기 위험"),factorNames:{sofrIorb:"SOFR−IORB 스프레드",obfrIorb:"OBFR−IORB 스프레드",repoGap:"DVP−Tri-Party Repo 격차",sofrIorbRv20:"SOFR−IORB 20일 변동성",bankEmergency:"은행 비상대출 비율",bankReserves:"은행 준비금",tga:"TGA 4주 변화",onRrp:"ON RRP 20영업일 변화",m2:"M2 YoY",bond2y:"미국 2년물 변동성",bond5y:"미국 5년물 변동성",bond10y:"미국 10년물 변동성",bond30y:"미국 30년물 변동성"}
 },
 "credit-risk":{
  endpoint:"/api/credit-risk-detail",title:"신용시장 방어",importance:"신용위험은 기업이 돈을 빌리는 비용과 직결됩니다. 회사채 스트레스와 채권 변동성이 커지면 기업의 자금조달이 어려워질 수 있습니다.",marketImpact:"신용 스트레스 확대는 특히 재무구조가 약한 기업과 경기민감주에 부담이 될 수 있습니다. 신용시장이 안정되면 위험자산의 자금조달 환경이 개선됩니다.",highMeaning:"높을수록 회사채와 신용시장이 안정적인 방향입니다.",lowMeaning:"낮을수록 신용 스트레스가 높은 방향입니다.",positiveHeading:"신용 안정에 기여한 요인",negativeHeading:"신용 부담 요인",stage:score=>safetyStage(score,"신용 주의","신용 위험"),factorNames:{hyCmdi:"HY CMDI",igCmdi:"IG CMDI",totalCmdi:"Total CMDI",bondVolatility:"채권 변동성",nfciCredit:"NFCI Credit",bond2y:"미국 2년물 변동성",bond5y:"미국 5년물 변동성",bond10y:"미국 10년물 변동성",bond30y:"미국 30년물 변동성"}
 },
 "debt-risk":{
  endpoint:"/api/debt-risk-detail",title:"부채 안전성",importance:"부채가 많아도 소득과 이익이 충분하면 버틸 수 있지만, 금리와 원리금 부담이 동시에 커지면 경기 충격에 취약해집니다.",marketImpact:"부채 부담 확대는 소비와 기업투자를 줄이고 신용손실 위험을 높일 수 있습니다. 상환여력이 개선되면 금융시장 충격에 대한 완충력이 커집니다.",highMeaning:"높을수록 가계·기업의 부채 부담을 감당하기 쉬운 방향입니다.",lowMeaning:"낮을수록 부채와 상환 부담이 위험한 방향입니다.",positiveHeading:"부채 안정에 기여한 요인",negativeHeading:"부채 부담 요인",stage:score=>safetyStage(score,"부채 주의","부채 위험"),factorNames:{dsr:"Debt Service Ratio",debtGdp:"민간부채/GDP",rateBurden:"금리부담",creditStress:"신용스트레스",debtServiceCapacity:"부채상환능력"}
 },
 "asset-bubble":{
  endpoint:"/api/asset-bubble-detail",title:"버블 방어",importance:"가격이 오르는 것 자체가 버블은 아닙니다. 밸류에이션, 가격가속, 투기성 자금, 시장 참여 폭과 유동성이 함께 과열되는지 봐야 합니다.",marketImpact:"버블 위험이 커지면 작은 충격에도 가격 조정 폭이 커질 수 있습니다. 과열이 완화되면 시장의 상승 기반이 더 건강해질 수 있습니다.",highMeaning:"높을수록 과열과 버블 위험이 낮은 방향입니다.",lowMeaning:"낮을수록 자산가격 과열 신호가 강한 방향입니다.",positiveHeading:"버블 위험을 낮추는 요인",negativeHeading:"과열 부담 요인",stage:score=>safetyStage(score,"버블 주의","버블 위험"),factorNames:{valuationPressure:"밸류에이션 압력",priceAcceleration:"가격가속",riskAssetShare:"위험자산 비중",speculativeFlows:"투기성 자금흐름",breadthDivergence:"시장폭 괴리",excessLiquidity:"과잉유동성"}
 },
 "supply-shock":{
  endpoint:"/api/supply-shock-detail",title:"공급 충격 방어",importance:"공급망이나 에너지 공급이 흔들리면 생산비와 물가가 동시에 올라 경기와 기업이익에 부담을 줄 수 있습니다.",marketImpact:"공급 충격 확대는 원가 부담과 인플레이션을 동시에 높여 주식시장에 불리할 수 있습니다. 공급 여건 안정은 비용 압력을 완화하는 데 도움이 됩니다.",highMeaning:"높을수록 공급망·에너지 충격 위험이 낮은 방향입니다.",lowMeaning:"낮을수록 공급 충격 압력이 높은 방향입니다.",positiveHeading:"공급 안정에 기여한 요인",negativeHeading:"공급 충격 부담 요인",stage:score=>safetyStage(score,"공급 주의","공급 충격 위험"),factorIds:["G","E","O","P","I"],factorNames:{G:"글로벌 공급망 압력",E:"미국 석유 공급 제약",O:"에너지 가격 충격",P:"공급 주도 물가 압력",I:"산업생산 충격"}
 },
 "earnings-recession":{
  endpoint:"/api/earnings-recession-detail",title:"기업 실적 방어",importance:"주가는 장기적으로 기업이 벌어들이는 이익과 현금흐름의 영향을 크게 받습니다. 매출·마진·이익 개선이 시장 전반으로 퍼지는지 함께 봐야 합니다.",marketImpact:"실적 방어가 약해지면 주가 밸류에이션을 지지하기 어려워질 수 있습니다. 반대로 이익과 매출 개선이 넓게 확산되면 주식시장의 펀더멘털 기반이 강해집니다.",highMeaning:"높을수록 미국 기업 실적이 양호한 방향입니다.",lowMeaning:"낮을수록 실적 침체 위험이 강한 방향입니다.",positiveHeading:"실적 방어에 기여한 요인",negativeHeading:"실적 부담 요인",stage:score=>safetyStage(score,"실적 주의","실적 침체 위험"),factorNames:{epsGrowth:"EPS 성장률",margin:"영업이익률",revenueGrowth:"매출 성장률",earningsGrowthBreadth:"이익 성장 종목 비율",S1:"EPS 성장 강도",S2:"매출 성장률",S3:"영업이익률 수준",S4:"영업이익률 변화",S5:"FCF 마진",S6:"BEA 기업이익",S7:"EPS 개선 기업 비율",S8:"흑자 기업 비율",S9:"이익 개선 업종 비율",S10:"생산자 원가 압력",S11:"단위노동비용 압력",S12:"미래 전망 수정",S13:"기업 가이던스 방향"}
 }
};

type MethodologyExplanation={inputs:string;interpretation:string;marketUse:string;limitation:string};
type VerifiedImprovement={version:string;date:string;category:"산출 방식"|"저장·검증"|"데이터·추이"|"화면·해석";title?:string;change:string;marketUse:string;caveat?:string};

// Public educational descriptions only; approved formulas, weights and internal normalization are not disclosed.
const methodologyExplanations:Record<Topic,MethodologyExplanation>={
 inflation:{
  inputs:"마트·외식 등에서 체감하는 물가, 기업이 받는 가격, 임금·에너지 비용, 앞으로의 물가 예상 등 16개 지표를 7개 영역으로 나눠 살펴봅니다.",
  interpretation:"각 지표를 물가 목표나 과거의 일반적인 수준과 비교해 물가 안정에 도움이 되는 방향인지 평가하고, 그 결과를 하나의 점수로 종합합니다.",
  marketUse:"물가 상승 속도가 느려지면 금리가 오래 높게 유지될 부담이 줄어들 수 있어요. 반대로 임금과 기업 비용이 다시 빠르게 오르면 주의해서 살펴봐야 해요.",
  limitation:"점수 60점은 물가가 60% 올랐다는 뜻도, 앞으로 물가가 오를 확률이 60%라는 뜻도 아니에요.",
 },
 recession:{
  inputs:"고용·실질 GDP·산업생산·실질 소비와 소득·신용여건 등 여러 경기 활동 자료를 확인합니다.",
  interpretation:"각 활동 지표가 경기 방어에 우호적인지 확인한 뒤 저장된 구성 점수를 종합합니다. 한 지표만으로 침체 여부를 결정하지 않습니다.",
  marketUse:"고용·소비·생산이 함께 약해지면 기업 매출과 이익에 부담이 될 수 있으므로 움직임을 함께 확인합니다.",
  limitation:"점수는 공식 경기침체 판정이나 향후 경기침체 발생 확률이 아닙니다.",
 },
 "liquidity-crisis":{
  inputs:"단기자금시장 금리 차이, 은행 준비금과 비상대출, 통화량, 국채시장 변동성 등을 관찰합니다.",
  interpretation:"자금조달이 원활한지, 유동성 압력이 쌓이는지를 각 구성 지표의 저장 점수로 종합합니다.",
  marketUse:"여러 자금시장 신호가 동시에 악화하면 위험자산의 변동성이 커질 가능성을 경계합니다.",
  limitation:"일부 자금시장 지표가 일시적으로 출렁였다고 금융위기 발생을 확정할 수는 없습니다.",
 },
 "credit-risk":{
  inputs:"회사채 신용 스트레스와 금융여건, 채권시장 변동성 등 신용 관련 지표를 봅니다.",
  interpretation:"기업이 돈을 빌리기 얼마나 어려운지 나타내는 신호를 안정성 방향의 점수로 종합합니다.",
  marketUse:"신용 여건이 나빠지면 자금 조달 의존도가 높은 기업과 경기민감주의 부담을 함께 점검합니다.",
  limitation:"점수는 개별 기업의 부도 확률이나 채권의 투자등급 판정이 아닙니다.",
 },
 "debt-risk":{
  inputs:"가계·기업의 부채 규모, 원리금 상환 부담, 금리 부담, 신용 스트레스와 상환 여력 등을 확인합니다.",
  interpretation:"부채의 절대 규모뿐 아니라 소득·현금흐름으로 버틸 수 있는지를 구성 점수로 평가합니다.",
  marketUse:"높은 금리와 상환 부담이 겹치면 소비·설비투자·기업이익에 부담이 될 수 있습니다.",
  limitation:"점수는 특정 국가·기업의 파산 확률을 직접 의미하지 않습니다.",
 },
 "asset-bubble":{
  inputs:"가격 수준과 상승 가속도, 위험자산 참여, 투기성 자금, 시장폭과 유동성의 과열 신호를 살펴봅니다.",
  interpretation:"가격 상승 자체가 아니라 과열 신호가 여러 영역에 동시에 나타나는지를 종합합니다.",
  marketUse:"과열이 확산되면 주가 상승 중에도 작은 충격에 취약해질 수 있어 위험 노출을 함께 점검합니다.",
  limitation:"연구 후보 버전은 검증 상태를 별도로 표시하며, 높은 주가 자체를 버블로 확정하지 않습니다.",
 },
 "supply-shock":{
  inputs:"글로벌 공급망, 석유 공급, 에너지 가격, 공급 주도 물가 압력과 산업생산 신호를 봅니다.",
  interpretation:"공급 제약과 비용 상승이 경기 활동에 부담을 주는 정도를 5개 평가 영역으로 종합합니다.",
  marketUse:"공급 비용이 급등하면 물가와 기업 마진이 동시에 압박받을 수 있다는 점을 살펴봅니다.",
  limitation:"과거 차트가 현재 수정 자료 기반이면 당시 투자자가 알 수 있었던 값과 다를 수 있습니다.",
 },
 "earnings-recession":{
  inputs:"기업의 매출·주당이익(EPS)·이익률과 현금흐름, 이익 개선 기업의 폭, 비용 압력 등을 확인합니다.",
  interpretation:"기업 이익의 수준과 개선의 확산 정도를 점수로 종합합니다. 사용할 수 있는 실적 버전에 따라 분석 항목이 달라집니다.",
  marketUse:"소수 대형주의 이익만 좋아지는지, 여러 기업과 업종으로 실적 개선이 확산되는지 비교합니다.",
  limitation:"기업 실적 점수와 메인 경기 진단 점수는 서로 다를 수 있으며, 주가 상승 확률이 아닙니다.",
 },
};

// Curated from merged PR #207 (2026-10-09), #204 (2026-10-09), #309 (2026-10-15).
// These entries describe confirmed changes, not proof of better forecasting performance.
const verifiedImprovements:Partial<Record<Topic,VerifiedImprovement[]>>={
 inflation:[
  {
   version:"INFLATION_R2_R29_56",date:"2026-10-18",category:"화면·해석",
   title:"5개 기간의 점수 변화폭 제공",
   change:"기존 두 기간 비교에서 1주·1개월·3개월·6개월·1년의 다섯 기간 비교로 늘렸어요. 저장된 과거 점수와 지금 점수의 차이를 보여줍니다.",
   marketUse:"최근 일주일의 변화가 지난 1년 흐름과 같은 방향인지 함께 볼 수 있어요.",
   caveat:"산출식과 가중치는 변경하지 않았습니다. 근거: GitHub PR #375.",
  },
  {
   version:"INFLATION_R2_R29_56",date:"2026-10-18",category:"데이터·추이",
   title:"개별 경제지표의 1년 추이 표시",
   change:"16개 물가 지표 각각에 지난 1년 동안 어떻게 변했는지 보여주는 작은 차트를 붙였습니다.",
   marketUse:"종합점수뿐 아니라 물가·임금·기름값 중 무엇이 변했는지도 살펴볼 수 있어요.",
   caveat:"표시 및 저장 결과 구성 개선으로 산출식 변경은 아닙니다. 근거: GitHub PR #365.",
  },
  {
   version:"INFLATION_R2_R29_56",date:"2026-10-07",category:"데이터·추이",
   title:"월간 1년 차트의 기간 보정",
   change:"한 달씩 찍은 점 12개로는 약 11개월만 보이던 문제를 고쳐, 13개 월을 표시하도록 했습니다.",
   marketUse:"차트의 시작과 끝이 실제 1년 범위에 더 잘 맞도록 했습니다.",
   caveat:"점수 산출식 변경이나 예측 성능 개선을 의미하지 않습니다. 근거: GitHub PR #99.",
  },
  {
   version:"INFLATION_R2_R29_56",date:"2026-09-28",category:"저장·검증",
   title:"공개 데이터의 산출식 버전 식별 유지",
   change:"공개된 물가 점수에 어떤 계산 기준을 사용했는지 알려주는 버전 이름이 함께 전달되는지 확인하도록 했습니다.",
   marketUse:"어떤 계산 기준의 점수인지 버전으로 구분할 수 있습니다.",
   caveat:"점수 자체의 산출 방식을 바꾸지는 않았습니다. 근거: GitHub 커밋 621cc331.",
  },
  {
   version:"INFLATION_R2_R29_56",date:"2026-09-28",category:"산출 방식",
   title:"인플레이션 R2 운영 산출식 도입",
   change:"처음 발표됐을 때의 소비자물가·기업 가격·예상 물가·임금·에너지 자료를 7개 영역으로 나눠 평가하는 R2 계산 방식을 운영에 적용했습니다.",
   marketUse:"소비자물가 숫자 하나만 보는 대신 서로 다른 물가 원인도 함께 살펴볼 수 있어요.",
   caveat:"R2 도입 사실의 기록이며, 이전 모델보다 예측 정확도가 높아졌다는 검증은 아닙니다. 근거: GitHub 커밋 b27662fe.",
  },
  {
   version:"INFLATION_R2_R29_56",date:"2026-09-27",category:"저장·검증",
   title:"R2 도입 전 발표 당시 자료 복구 경로 보정",
   change:"PCE 물가 자료에서 발표 당시 기록을 올바르게 읽고, 원자료 항목을 잘못 찾는 부분을 바로잡았습니다.",
   marketUse:"나중에 고쳐진 값과 처음 발표됐던 값을 구분해 살펴보는 기반을 다졌습니다.",
   caveat:"운영 R2 활성화 이전의 입력 준비 이력입니다. 근거: GitHub 커밋 ccef172d·6bb180c2.",
  },
 ],
 "supply-shock":[{
  version:"SUPPLY_SHOCK_R10",date:"2026-10-09",category:"산출 방식",
  change:"기존 가격 중심 평가를 공급망·석유 공급·에너지 비용·공급 주도 물가·산업생산의 5개 영역 평가로 확대했습니다.",
  marketUse:"가격 상승이 공급 측 부담과 함께 나타나는지 더 세분화해 읽을 수 있습니다.",
  caveat:"과거 점수는 현재 수정 자료 기반이며 발표 당시 자료로 검증한 백테스트는 아닙니다.",
 }],
 "earnings-recession":[{
  version:"E1-R5",date:"2026-10-15",category:"산출 방식",
  change:"실적 평가를 13개 구성 요소로 확장하고, 저장 자료 기반 계산과 결측 시 이전 E1-R4 유지 경로를 연결했습니다.",
  marketUse:"이익 성장뿐 아니라 원가 압력과 개선 기업의 확산을 함께 해석할 수 있습니다.",
  caveat:"새 버전 도입은 예측 정확도 향상을 뜻하지 않으며, 저장된 R5가 활성화된 경우에만 해당합니다.",
 }],
 "asset-bubble":[{
  version:"ASSET_BUBBLE_R9",date:"2026-10-05",category:"저장·검증",
  change:"가격 지표가 누락될 때 승인된 OECD/FRED 저장 자료를 사용할 수 있도록 입력 연결을 보완했습니다. 기존 R9 점수 산출 방식과 가중치는 그대로 유지했습니다.",
  marketUse:"점수의 변화와 데이터 입력 범위가 달라진 경우를 구분해 살펴볼 수 있습니다.",
  caveat:"이는 예측 성능이 좋아졌다는 검증이 아니라 입력 자료 연결 개선입니다.",
 },{
  version:"ASSET_BUBBLE_R10_CANDIDATE",date:"2026-10-09",category:"저장·검증",
  change:"R10 연구 후보의 저장 결과를 상세페이지와 게시 경로에 연결했습니다. 기존 R9 산출 방식은 변경하지 않았습니다.",
  marketUse:"연구 후보 점수와 기존 점수를 혼동하지 않고 평가 시점을 확인할 수 있습니다.",
  caveat:"R10은 연구 후보이며 과거 자료 검증과 일부 외부 근거 확인이 아직 완료되지 않았습니다.",
 }],
};

function reportedMethodologyVersion(topic:Topic,payload:any):string|null{
 // E1: the stored earnings component version and the main diagnostic may differ.
 const version=topic==="earnings-recession"&&payload?.storedE1?.status==="READY"
  ?payload?.storedE1?.methodologyVersion
  :payload?.methodologyVersion;
 return typeof version==="string"&&version.trim()?version.trim():null;
}

function finiteScore(value:unknown){return typeof value==="number"&&Number.isFinite(value)?value:null;}
function validBeginnerCopy(value:any):value is BeginnerCopy{
 const expected=["generatedAt","marketMeaning","sourceHash","sourceStoredAt","sourceVersion","status","summary","whyItMatters"];
 if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).sort().join("|")!==expected.join("|"))return false;
 return value.status==="COPY_ONLY"&&typeof value.summary==="string"&&!!value.summary.trim()&&typeof value.whyItMatters==="string"&&!!value.whyItMatters.trim()&&typeof value.marketMeaning==="string"&&!!value.marketMeaning.trim()&&typeof value.sourceHash==="string"&&/^[a-f0-9]{64}$/.test(value.sourceHash)&&typeof value.sourceVersion==="string"&&!!value.sourceVersion.trim()&&Number.isFinite(value.sourceStoredAt)&&Number.isFinite(value.generatedAt);
}

function extractFactors(topic:Topic,payload:any,config:Config):Factor[]{
 let rows:any[]=[];
 if(topic==="inflation")rows=Object.entries(payload?.features??{}).map(([id,row])=>({id,...(row as object)}));
 else if(topic==="recession")rows=[...(payload?.components??[]),...(payload?.supplementals??[])];
 else if(topic==="credit-risk")rows=[...(payload?.core??[]),...(payload?.supplementals??[])];
 else if(topic==="earnings-recession")rows=payload?.storedE1?.indicators??[];
 else rows=payload?.indicators??[];
 const allowed=config.factorIds?new Set(config.factorIds):null;
 return rows.flatMap(row=>{
  const id=String(row?.id??"");
  const score=finiteScore(row?.score);
  if(!id||score===null||!config.factorNames[id]||(allowed&&!allowed.has(id)))return [];
  if(row?.status&&row.status!=="READY")return [];
  return [{id,score}];
 });
}

function FactorListItem({item,config}:{item:Factor;config:Config}){
 const description=config.factorDescriptions?.[item.id];
 if(!description)return <li>• {config.factorNames[item.id]}</li>;
 return <li><span>• {config.factorNames[item.id]}</span><span className="block pl-3 text-xs leading-5 text-slate-400">{description}</span></li>;
}

export default function BeginnerRiskGuide({topic}:{topic:Topic}){
 const config=configs[topic];
 const historyDetailsRef=useRef<HTMLDetailsElement>(null);
 const [payload,setPayload]=useState<any>(null);
 const [loading,setLoading]=useState(true);
 useEffect(()=>{
  const controller=new AbortController();
  fetch(config.endpoint,{cache:"no-store",signal:controller.signal})
   .then(async response=>{if(!response.ok)throw Error("GUIDE_FETCH_FAILED");return response.json();})
   .then(body=>setPayload(body))
   .catch(()=>{})
   .finally(()=>setLoading(false));
  return()=>controller.abort();
 },[config.endpoint]);
 const score=finiteScore(payload?.score);
 const factors=useMemo(()=>extractFactors(topic,payload,config),[topic,payload,config]);
 const positive=useMemo(()=>factors.filter(x=>x.score>=60).sort((a,b)=>b.score-a.score).slice(0,3),[factors]);
 const negative=useMemo(()=>factors.filter(x=>x.score<45).sort((a,b)=>a.score-b.score).slice(0,3),[factors]);
 const stage=score===null?"확인 필요":config.stage(score);
 const methodology=methodologyExplanations[topic];
 const currentVersion=reportedMethodologyVersion(topic,payload);
 const applicableImprovements=(verifiedImprovements[topic]??[]).filter(item=>item.version===currentVersion);
 const isCandidateVersion=currentVersion?.includes("CANDIDATE")??false;
 const storedCopy=validBeginnerCopy(payload?.beginnerCopy)?payload.beginnerCopy:null;
 const currentText=storedCopy?.summary??(loading?"저장된 최신 결과를 확인하고 있습니다.":score===null?"현재 저장 결과만으로 종합 점수를 확인할 수 없습니다.":`현재 ${config.title} 점수는 ${score.toFixed(1)}점이며 ${stage} 구간입니다. ${config.highMeaning}`);
 const importanceText=storedCopy?.whyItMatters??config.importance;
 const marketImpactText=storedCopy?.marketMeaning??config.marketImpact;
 return <section className="mt-5 space-y-4" data-testid={`beginner-risk-guide-${topic}`} data-copy-source={storedCopy?"stored":"deterministic"} aria-label={`${config.title} 초보자 해석`}>
  <div className="rounded-lg bg-[#071c2a] p-4 sm:p-5">
   <p className="text-xs font-bold tracking-[.14em] text-cyan-300">BEGINNER GUIDE</p>
   <h2 className="mt-1 text-lg font-bold text-white">초보자라면 이렇게 보세요</h2>
   <div className="mt-4 grid gap-3 md:grid-cols-3">
    <article className="bg-[#0a2434] p-4"><h3 className="font-bold text-white">지금 어떤 상태인가요?</h3><p className="mt-2 text-sm leading-6 text-slate-300">{currentText}</p></article>
    <article className="bg-[#0a2434] p-4"><h3 className="font-bold text-white">왜 중요한가요?</h3><p className="mt-2 text-sm leading-6 text-slate-300">{importanceText}</p></article>
    <article className="bg-[#0a2434] p-4"><h3 className="font-bold text-white">주식시장에는?</h3><p className="mt-2 text-sm leading-6 text-slate-300">{marketImpactText}</p><p className="mt-2 text-xs text-slate-400">이 지표 하나만으로 주가 방향을 확정하지 않습니다.</p></article>
   </div>
  </div>
  <div className="rounded-lg bg-[#071c2a] p-4 sm:p-5">
   <h2 className="text-lg font-bold text-white">왜 {score===null?"이 점수":score.toFixed(1)+"점"}인가요?</h2>
   <p className="mt-1 text-sm text-slate-400">현재 저장된 구성 점수를 기준으로 강한 방향의 요인을 최대 3개씩 보여줍니다.</p>
   <div className="mt-4 grid gap-3 md:grid-cols-2">
    <div className="bg-emerald-950/25 p-4"><h3 className="font-bold text-emerald-300">{config.positiveHeading}</h3>{positive.length?<ul className="mt-3 space-y-2 text-sm text-slate-200">{positive.map(item=><FactorListItem key={item.id} item={item} config={config}/>)}</ul>:<p className="mt-3 text-sm text-slate-400">현재 뚜렷한 기여 요인을 확인하지 못했습니다.</p>}</div>
    <div className="bg-rose-950/20 p-4"><h3 className="font-bold text-rose-300">{config.negativeHeading}</h3>{negative.length?<ul className="mt-3 space-y-2 text-sm text-slate-200">{negative.map(item=><FactorListItem key={item.id} item={item} config={config}/>)}</ul>:<p className="mt-3 text-sm text-slate-400">현재 뚜렷한 부담 요인을 확인하지 못했습니다.</p>}</div>
   </div>
  </div>
  <details className="rounded-lg bg-[#071c2a] p-4 sm:p-5">
   <summary className="cursor-pointer font-bold text-white">이 점수는 어떻게 계산하나요?</summary>
   <div className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
    <p className="text-xs text-slate-400">이 설명 영역은 점수·가중치·판정을 새로 계산하지 않고, 승인된 저장 결과를 해석합니다.</p>
    <p><strong className="text-slate-100">① 사용하는 지표</strong> {methodology.inputs}</p>
    <p><strong className="text-slate-100">② 평가 방법</strong> {methodology.interpretation}</p>
    <p><strong className="text-slate-100">③ 점수 읽는 법</strong> 75점 이상 {config.stage(75)}, 60~74점 {config.stage(60)}, 45~59점 중립, 25~44점 {config.stage(25)}, 25점 미만 {config.stage(0)}. {config.highMeaning} {config.lowMeaning}</p>
    <p><strong className="text-slate-100">④ 주식시장에서</strong> {methodology.marketUse}</p>
    <p><strong className="text-slate-100">⑤ 결측·한계</strong> 필요한 자료가 없으면 임의의 0점으로 채우지 않고 미산출 상태로 남길 수 있습니다. {methodology.limitation}</p>
   </div>
  </details>
  <details ref={historyDetailsRef} className="zg-method-history rounded-lg bg-[#071c2a] p-4 sm:p-5" data-testid={`beginner-methodology-history-${topic}`}>
   <summary className="zg-method-history-summary cursor-pointer font-bold text-white">
    <span className="zg-method-history-title">
     <span>산출식 개선 이력</span>
     <span className="text-xs font-normal text-slate-300" data-testid="current-methodology-version">현재 {loading?"확인 중":currentVersion??"버전 미확인"}{isCandidateVersion?" · 연구 후보":""}</span>
    </span>
    <ChevronDown aria-hidden="true" className="zg-method-history-chevron"/>
   </summary>
   <div className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
    <p>{topic==="inflation"?<>여기에 적힌 버전은 <strong className="text-slate-100">지금 점수를 계산하는 방식의 이름</strong>이에요. 웹사이트 화면의 업데이트 번호와는 달라요. 계산 방식이 바뀌면 경제 상황이 같아도 점수가 달라질 수 있어요.</>:"위 버전은 현재 공개된 저장 결과가 알려주는 산출식 식별자입니다. 페이지 버전·배포 버전과 다르며, 점수 변화가 모두 경제 상황 때문인 것은 아닙니다."}</p>
    {topic==="earnings-recession"&&currentVersion&&payload?.methodologyVersion!==currentVersion?<p>실적 구성지표 버전과 메인 진단 버전은 별개입니다. 메인 진단: {payload?.methodologyVersion??"미확인"}</p>:null}
    {applicableImprovements.length?applicableImprovements.map(item=><div key={item.version+item.date} className="border-t border-slate-700/50 pt-3">
     <p className="text-xs text-slate-400">{item.date} · {item.category}</p>
     <p className="font-semibold text-slate-100">{item.title??item.version}</p>
     <p className="mt-1">{item.change}</p>
     <p className="mt-1">시장 해석: {item.marketUse}</p>
     {item.caveat?<p className="mt-1 text-xs text-slate-400">{item.caveat}</p>:null}
    </div>):<p className="border-t border-slate-700/50 pt-3 text-slate-400">이 버전에 대해 공개 검증된 산출식 변경 이력은 정리 중입니다. 근거 없는 개선 효과나 날짜는 표시하지 않습니다.</p>}
    <p className="text-xs text-slate-400">이력은 확인된 변경 내용만 표시하며, 산출식 변경과 자료·화면 개선을 구분합니다. 최신 버전이 항상 더 정확한 예측을 의미하지는 않습니다.</p>
    <div className="zg-method-history-close-row">
     <button type="button" className="zg-method-history-close" aria-label="산출식 개선 이력 접기" onClick={()=>{if(historyDetailsRef.current)historyDetailsRef.current.open=false;}}>
      <ChevronUp aria-hidden="true" size={16}/>
      <span>접기</span>
     </button>
    </div>
   </div>
  </details>
 </section>;
}