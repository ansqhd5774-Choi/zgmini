// Stage 04 research memo, checked against the original publishers on 2026-10-24.
// These are DATED CLAIMS, not live data. Nothing in this module is automatically
// refreshed by a Windows CMD run. Sector-wide sales are not ETF constituent FCF.

export const FACTS_CHECKED_AT = '2026-10-24';
export const RECHECK_AFTER_DAYS = 30;

export const INDUSTRY_FACTS = Object.freeze({
  '로봇·자동화': {
    dimension:'INDUSTRY_OPERATING_STOCK',
    fact:'2025년 전 세계 가동 산업용 로봇 약 500만 대, 전년 대비 9% 증가',
    period:'2025년 연간',
    publisher:'국제로봇연맹(IFR)',
    url:'https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally',
    boundary:'보급 대수는 관련 ETF 편입 기업의 매출·이익이 아닙니다.',
  },
  '클라우드·SaaS': {
    dimension:'PAID_SERVICE_ADOPTION',
    fact:'2025년 EU 기업의 유료 클라우드 도입률 52.7%, 2023년 대비 7.4%p 증가',
    period:'2025년 / 2023년 비교',
    publisher:'Eurostat',
    url:'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260203-1',
    boundary:'EU 도입률은 세계 SaaS 매출·수익률이나 ETF 현금흐름이 아닙니다.',
  },
  '자율주행': {
    dimension:'TESTING_ACTIVITY_ONLY',
    fact:'캘리포니아 허가 기업의 시험 주행 거리: 2024.12~2025.11 기간 900만 마일 초과',
    period:'2024-12-01~2025-11-30',
    publisher:'캘리포니아 DMV',
    url:'https://www.dmv.ca.gov/portal/news-and-media/autonomous-vehicle-permit-holders-in-california-logged-more-than-9-million-test-miles-between-december-1-2024-and-november-30-2025/',
    boundary:'시험 주행·허가는 유상 운송, 상용 수요 또는 수익성 증거가 아닙니다.',
  },
  '원전·SMR': {
    dimension:'EXISTING_NUCLEAR_FLEET',
    fact:'2025년 전 세계 원전 발전 2,702 TWh, 2024년 2,667 TWh보다 35 TWh 증가',
    period:'2025년 / 2024년 비교',
    publisher:'세계원자력협회(WNA) 2026 전망 보고서',
    url:'https://world-nuclear.org/information-library/current-and-future-generation/nuclear-power-in-the-world-today',
    boundary:'기존 원전 발전량은 미상용 SMR 수주·인도·현금흐름이 아닙니다.',
  },
  '방산': {
    dimension:'REAL_MILITARY_SPENDING',
    fact:'2025년 세계 군사비 2조 8,870억 달러, 2024년 대비 실질 2.9% 증가',
    period:'2025년 실질 지출',
    publisher:'SIPRI',
    url:'https://www.sipri.org/media/press-release/2026/global-military-spending-rise-continues-european-and-asian-expenditures-surge',
    boundary:'군사비 총액은 특정 방산업체 수주·인도 또는 ETF 편입사의 이익이 아닙니다.',
    broadRevenue:{
      status:'INDUSTRY_SALES_VERIFIED_NOT_ETF',
      fact:'상위 100개 방산·군사서비스 기업의 2024년 관련 매출 6,790억 달러, 전년 대비 5.9% 증가',
      period:'2024년 / 2023년 비교',
      publisher:'SIPRI Top 100 (2025년 발표)',
      url:'https://www.sipri.org/publications/2025/sipri-fact-sheets/sipri-top-100-arms-producing-and-military-services-companies-2024',
    },
  },
  '핀테크': {
    dimension:'ONE_PAYMENT_RAIL_ONLY',
    fact:'FedNow 2026년 3분기 결제 6,376,467건, 직전 분기 대비 27.6% 증가',
    period:'2026년 3분기 / 2분기 비교',
    publisher:'미 연방준비은행 금융서비스',
    url:'https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/',
    boundary:'FedNow 거래 건수는 핀테크 전체 거래량·매출·수익을 대표하지 않습니다.',
  },
  '사이버보안': {
    dimension:'THREAT_PROXY_NOT_DEMAND',
    fact:'2025년 FBI IC3 인터넷 범죄 신고 1,008,597건, 2024년 859,532건에서 증가',
    period:'2025년 / 2024년 비교',
    publisher:'미 연방수사국(FBI)',
    url:'https://www.fbi.gov/news/press-releases/cryptocurrency-and-ai-scams-bilk-americans-of-billions',
    boundary:'피해·신고 증가가 보안 구매, 신규 계약, 보안업체 매출 증가를 입증하지는 않습니다.',
  },
  'AI 반도체': {
    dimension:'BROAD_SEMICONDUCTOR_NOT_AI',
    fact:'2025년 전체 반도체 매출: SIA 2026년 2월 발표 7,917억 달러, 7월 보고서 7,956억 달러',
    period:'2025년 / 발표 버전 차이',
    publisher:'미 반도체산업협회(SIA)',
    url:'https://www.semiconductors.org/2026-state-of-the-industry-report-historic-growth-amid-intensifying-global-competition/',
    boundary:'발표본 간 39억 달러 차이의 조정 사유 미검증. 전체 반도체 매출은 AI 가속기 매출과 다릅니다.',
    broadRevenue:{
      status:'VERSION_CONFLICT_REVIEW',
      fact:'2025년 글로벌 전체 반도체 매출 발표값 7,917억 달러 vs 7,956억 달러',
      period:'2026-02-06 발표 / 2026-07-27 보고서',
      publisher:'SIA 발표본 2종',
      url:'https://www.semiconductors.org/global-annual-semiconductor-sales-increase-25-6-to-791-7-billion-in-2025/',
    },
  },
  '바이오·신약': {
    dimension:'REGULATORY_OUTPUT_NOT_DEMAND',
    fact:'FDA CDER 2026년 신규 의약품 허가 목록 47건(가장 늦은 승인일 2026-10-20)',
    period:'2026-01-01~2026-10-20 누적',
    publisher:'미 식품의약국(FDA CDER)',
    url:'https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2026',
    boundary:'신약 승인 건수는 유료 처방 규모·매출·현금흐름이나 ETF 신약 기업의 성공률이 아닙니다.',
  },
});

export function evidenceForTheme(name, retrievedAt) {
  const fact=INDUSTRY_FACTS[name];
  if (!fact) return {status:'NO_REVIEWED_FACT'};
  const timestamp=Date.parse(retrievedAt);
  const checked=Date.parse(`${FACTS_CHECKED_AT}T23:59:59Z`);
  const ageDays=Number.isFinite(timestamp)?Math.max(0,(timestamp-checked)/86400000):Infinity;
  return {
    ...fact,checkedAt:FACTS_CHECKED_AT,
    status:ageDays>RECHECK_AFTER_DAYS?'RECHECK_REQUIRED':'DATED_ORIGINAL_VERIFIED',
    liveRefresh:false,
    etfMonetizationStatus:'NOT_VERIFIED',
  };
}
