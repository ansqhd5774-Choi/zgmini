// Stage 05: official, dated robotics industry statistics; never ETF holdings,
// prices, upstream ZGMINI formulas, issuer screening, or investment scores.
import fs from 'node:fs';
import path from 'node:path';

export const SELECTION_FILE = 'M2_STAGE4_SELECTION.json';
export const ROBOTICS_CHECKED_AT = '2026-10-24';
export const SOURCES = Object.freeze({
  industrial: {
    publisher: '국제로봇연맹(IFR)', published: '2026-09-24',
    url: 'https://ifr.org/img/worldrobotics/Executive_Summary_WR_2026_-_Industrial_Robots.pdf',
  },
  industrialRelease: {
    publisher: '국제로봇연맹(IFR)', published: '2026-09-24',
    url: 'https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally',
  },
  service: {
    publisher: '국제로봇연맹(IFR)', published: '2026-09-30',
    url: 'https://ifr.org/ifr-press-releases/news/global-sales-of-professional-service-robots-surge-24-percent',
  },
  technology: {
    publisher: '국제로봇연맹(IFR)', published: '2026-01-08',
    url: 'https://ifr.org/ifr-press-releases/news/top-5-global-robotics-trends-2026',
  },
  nist: {
    publisher: '미국 국립표준기술연구소(NIST)', published: '지속 연구',
    url: 'https://www.nist.gov/programs-projects/performance-collaborative-robot-systems',
  },
});

// Separate observed figures, conditional outlooks and qualitative technical
// commentary. Never sum volumes from incompatible industry definitions.
export const ROBOTICS_SEGMENTS = Object.freeze([
  {
    id: 'industrial', name: '제조·산업용 로봇', stage: '대규모 상용화',
    insight: '공장 설치·운용이 확인된 산업. 수요는 성장했지만 지역·최종고객 업종별 편차가 크다.',
    observations: [
      {label: '2025년 신규 설치', value: 603307, unit: '대', yoyPct: 11, source: 'industrial'},
      {label: '2025년 운용 중 재고', value: 5079078, unit: '대', yoyPct: 9, source: 'industrial'},
      {label: '2025년 신규 설치 시장가치', value: 18.6, unit: '십억 달러', yoyPct: 11, source: 'industrial'},
    ],
    outlooks: [{label: '2026년 신규 설치 예상', value: 655000, unit: '대', yoyPct: 9, source: 'industrial'},
      {label: '2029년 신규 설치 예상', value: 806000, unit: '대', yoyPct: null, source: 'industrial'}],
    technologies: ['산업용 머신비전·로봇 유도: 산업 현장 적용 확인', 'AI 검사·예지보전: 적용 확대 중, 단일 매출 분리 미확인'],
    regional: '2025년 중국 신규 354,226대(+20%); 미국 38,428대(+12%); 유럽 73,054대(-14%); 한국 약 30,000대(-1%).',
    missing: ['로봇 설치 시장가치와 산업 전체 TAM/SAM은 다름', '고객 투자수익률·공급사 평균 마진·특허 경쟁력 미검증'],
    focus: '고객 산업별 설비투자 지속성·반복 주문, 통합·설치 비용 및 서비스 수익 구조',
  },
  {
    id: 'logistics', name: '물류·이동형 서비스 로봇', stage: '상용 판매 확대',
    insight: '물류·운반·배송 업무에서 로봇 판매가 관측되며 서비스형 로봇(RaaS) 채널도 존재한다.',
    observations: [
      {label: '2025년 물류·운송 서비스 로봇 판매', value: 117500, unit: '대', yoyPct: 21, source: 'service'},
      {label: '2025년 전체 전문 서비스 로봇 판매', value: 250000, unit: '대(약)', yoyPct: 24, source: 'service'},
    ],
    outlooks: [], technologies: ['경로 계획·자율주행·관제 IT/OT 통합은 성장 동력으로 제시됨'],
    regional: 'IFR 발표에서 미국은 RaaS 계약이 지배적인 사업 방식으로 설명됨. 2025년 글로벌 분기별 반복 매출액은 제시되지 않음.',
    missing: ['판매 117,500대는 설치 603,307대와 분류·분모가 다름', 'RaaS 계약가·사용률·현장 단위 ROI·독립 운영 KPI 미검증'],
    focus: '고객의 실제 가동률, 작업당 비용, 배터리·유지보수, RaaS 계약 반복성과 해지율',
  },
  {
    id: 'medical', name: '수술·의료 로봇', stage: '임상 분야 상용 판매',
    insight: '수술 로봇 출하 확대는 관측되지만 임상 효용·규제 허가·수가체계가 제품마다 다르다.',
    observations: [{label: '2025년 수술 로봇 판매', value: 8400, unit: '대', yoyPct: 57, source: 'service'}],
    outlooks: [], technologies: ['정밀 동작·영상 보조·인체 접촉 안전성과 의료 소프트웨어 검증 필요'],
    regional: 'IFR 수치는 글로벌 판매로, 각국 병원의 누적 설치·수술 건수·허가 건수가 아님.',
    missing: ['수술량 및 시술당 경제성·실제 의료 성과 미검증', '개별 제품의 승인 상태·소모품 반복매출·시장 전체 TAM/SAM 미검증'],
    focus: '제품별 허가·임상 유효성, 병원 사용량, 소모품·서비스 반복매출',
  },
  {
    id: 'humanoid', name: '휴머노이드·범용 피지컬 AI', stage: '초기 판매·파일럿',
    insight: '실물 판매 수치는 있으나 산업용 범용 작업에서 비용·안전·가동 신뢰성이 아직 검증 단계다.',
    observations: [{label: '2025년 전신형 휴머노이드 판매', value: 7000, unit: '대(약)', yoyPct: null, source: 'service'}],
    outlooks: [], technologies: ['IFR: 범용 피지컬 AI는 아직 산업급이 아니며, 인간 원격조작에 의존하는 파일럿이 많음'],
    regional: 'IFR은 전신형 140cm 초과 제품에 한정해 7,000대라는 초기 판매 규모를 제시함.',
    missing: ['2025년 판매량을 자율운영·반복 구매·안전 인증으로 오인 금지', '작업 사이클·실패율·전력·정비비·사용자 ROI에 독립 검증 부족'],
    focus: '반복 가능한 실제 산업 과제, 인간 개입 비율, 안전·수명 KPI 및 총소유비용',
  },
]);

export const ROBOTICS_TECHNOLOGIES = Object.freeze([
  {name:'산업용 머신비전·로봇 유도',status:'기술 상용화 확인',source:'industrial',
    basis:'IFR 2026 요약: 감지와 로봇 유도 머신비전은 산업용으로 정착.',
    gap:'동일 과제의 독립 정확도·고장률·가격 대조 및 관련 시장 매출은 미확인.'},
  {name:'AI 검사·예지보전·공정 최적화',status:'활용 확대 관측',source:'industrial',
    basis:'IFR 2026 요약: 예지보전·공정 최적화·AI 검사는 공장에서 사용 확대.',
    gap:'로봇 전용 AI 제품의 독립 매출/수익성, 동일조건 성능 비교 미확인.'},
  {name:'로봇 간 협업·IT/OT 통합',status:'기술 검증 진행',source:'nist',
    basis:'NIST는 협업 안전성·성능·통신 프로토콜 측정법의 필요성을 명시.',
    gap:'NIST의 측정 연구를 상용 로봇 시장 규모 또는 기술 우위 증명으로 취급 금지.'},
  {name:'범용 피지컬 AI·휴머노이드',status:'초기 파일럿',source:'industrial',
    basis:'IFR 2026 요약: 범용 피지컬 AI 및 휴머노이드는 아직 산업급 신뢰성에 못 미침.',
    gap:'확실한 경제성과 인간 대체 생산성이 기술 전체에서 검증된 상태가 아님.'},
]);

function validIsoDay(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value+'T00:00:00Z')) &&
    new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;
}

export function validateStage4Selection(value) {
  if (!value || Array.isArray(value) || typeof value!=='object') throw Error('SELECTION_NOT_OBJECT');
  if (value.schema!=='ZGMINI_M2_STAGE4_SELECTION_V1' ||
      value.purpose!=='STAGE5_INDUSTRY_TECH_RESEARCH_ONLY' || value.noTrade!==true ||
      value.investmentAttractiveness!=='NOT_EVALUATED') throw Error('SELECTION_CONTRACT_INVALID');
  if (value.selectedTheme!=='로봇·자동화') throw Error('ONLY_SELECTED_ROBOTICS_RESEARCH_PREPARED');
  if (value.source!=='https://zgmini.kr/api/theme-fear-greed') throw Error('SELECTION_SOURCE_UNEXPECTED');
  if (!Number.isFinite(Date.parse(value.selectedAt)) || !validIsoDay(value.sentiment?.observationDate) ||
      typeof value.sentiment?.score!=='number' || !Number.isFinite(value.sentiment.score) ||
      value.sentiment.score<0 || value.sentiment.score>100 ||
      !['CONFIRMED','PROVISIONAL'].includes(value.sentiment.phase) ||
      typeof value.sentiment.marketDateMatch!=='boolean') throw Error('SELECTION_SENTIMENT_INVALID');
  return Object.freeze({
    selectedTheme:value.selectedTheme,selectedAt:value.selectedAt,source:value.source,
    sentiment:Object.freeze({score:value.sentiment.score,observationDate:value.sentiment.observationDate,
      phase:value.sentiment.phase,marketDateMatch:value.sentiment.marketDateMatch}),
    noTrade:true,
  });
}

export function loadStage4Selection(directory) {
  const file=path.join(directory,SELECTION_FILE);
  if(!fs.existsSync(file)) return {status:'BLOCKED',reason:'STAGE4_SELECTION_FILE_MISSING'};
  try {
    if(fs.statSync(file).size>32768)throw Error('SELECTION_FILE_TOO_LARGE');
    return {status:'READY',selection:validateStage4Selection(JSON.parse(fs.readFileSync(file,'utf8')))};
  }catch(error){return {status:'BLOCKED',reason:String(error.message||'INVALID_SELECTION')};}
}

export function buildStage5Research(loadResult,model,retrievedAt) {
  if(loadResult.status!=='READY')return {status:'BLOCKED',reason:loadResult.reason};
  const selection=loadResult.selection;
  const current=model.feeds?.theme?.status==='READY'
    ?model.feeds.theme.items.find(item=>item.name===selection.selectedTheme):null;
  let sentimentComparison='CURRENT_FEED_UNAVAILABLE';
  if(current){
    sentimentComparison=current.date!==selection.sentiment.observationDate?'DIFFERENT_OBSERVATION_DATES':
      Math.abs(current.score-selection.sentiment.score)>0.00001?'SAME_DATE_SCORE_CHANGED':'SAME_SCORE_SAME_DATE';
  }
  const asOf=validIsoDay(retrievedAt?.slice(0,10))?retrievedAt.slice(0,10):ROBOTICS_CHECKED_AT;
  const ageDays=(Date.parse(asOf+'T00:00:00Z')-Date.parse(ROBOTICS_CHECKED_AT+'T00:00:00Z'))/86400000;
  return {
    status:'READY',selection,sentimentComparison,
    currentSentiment:current?{score:current.score,date:current.date,phase:current.phase}:null,
    evidenceCheckedAt:ROBOTICS_CHECKED_AT,
    evidenceStatus:ageDays>45?'RECHECK_REQUIRED':'DATED_ORIGINAL_SNAPSHOT',
    sources:SOURCES,segments:ROBOTICS_SEGMENTS,technologies:ROBOTICS_TECHNOLOGIES,
    limits:{industryWideTamSam:null,issuerRevenueExposure:null,technologyIpAdvantage:null,
      investmentAttractiveness:null,valuation:null,tradeDecision:'NO_TRADE'},
  };
}
