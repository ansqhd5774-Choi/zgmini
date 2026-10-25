// Stage 04: claim-specific research routes, NOT a new data provider or a score engine.
// Official links are discovery anchors reviewed 2026-10-24; their contents are
// neither fetched nor assumed current during subsequent local runs.
// No raw upstream content is stored or republished by this program.
import {evidenceForTheme,FACTS_CHECKED_AT} from './m2-theme-evidence.mjs';

export const RESEARCH_ROUTE_CHECKED_AT = '2026-10-24';

export const RESEARCH_ROUTES = Object.freeze({
  '로봇·자동화': {
    authority:'국제로봇연맹(IFR)',
    topic:'산업용 로봇 설치·가동 대수',
    period:'2025년 실적 / 2026년 발표',
    url:'https://ifr.org/ifr-press-releases/news/five-million-robots-now-operate-in-factories-globally',
    limitation:'산업용 로봇 규모만 나타내며 ETF 수익성이나 개별 기업 매출은 입증하지 않음',
  },
  '클라우드·SaaS': {
    authority:'유럽연합 통계청(Eurostat)',
    topic:'기업의 유료 클라우드 서비스 채택률',
    period:'EU 기업 2025년 / 2023년 비교',
    url:'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/ddn-20260203-1',
    limitation:'EU 기업의 도입률이며 세계 SaaS 매출액·영업이익과 동일하지 않음',
  },
  '자율주행': {
    authority:'캘리포니아 차량관리국(DMV)',
    topic:'자율주행 시험 운행 거리·운행 허가',
    period:'2024-12~2025-11 신고 기간',
    url:'https://www.dmv.ca.gov/portal/news-and-media/autonomous-vehicle-permit-holders-in-california-logged-more-than-9-million-test-miles-between-december-1-2024-and-november-30-2025/',
    limitation:'캘리포니아 도로 시험만 포함하며 유상 승객 운송·기업 수익을 의미하지 않음',
  },
  '원전·SMR': {
    authority:'국제원자력기구(IAEA PRIS)',
    topic:'운전·건설 중 원자로와 원전 발전량',
    period:'원자로별 관측 시점 상이',
    url:'https://pris-stats.iaea.org/',
    limitation:'기존 원전 운영 통계와 미래 SMR 매출·상용화는 별개',
  },
  '방산': {
    authority:'스톡홀름국제평화연구소(SIPRI)',
    topic:'세계 군사비 지출 추이',
    period:'2025년 지출 / 2026년 발행',
    url:'https://www.sipri.org/media/press-release/2026/global-military-spending-rise-continues-european-and-asian-expenditures-surge',
    limitation:'정부 지출 추정과 ETF 보유 기업의 수주·이익·현금흐름은 다름',
  },
  '핀테크': {
    authority:'미 연방준비은행 금융서비스(FedNow)',
    topic:'즉시결제 처리 건수·결제 금액',
    period:'2026년 분기별 통계',
    url:'https://www.frbservices.org/resources/financial-services/fednow-service-resources/fednow-service-volume-value-statistics/',
    limitation:'FedNow 한 결제망의 실적이며 핀테크 산업 전체 매출이 아님',
  },
  '사이버보안': {
    authority:'미 연방수사국(FBI IC3)',
    topic:'인터넷범죄 신고·피해액',
    period:'2025년 연례 보고',
    url:'https://www.ic3.gov/AnnualReport/Reports',
    limitation:'피해 신고는 위협 강도 보조지표이며 보안 솔루션 매출·수익성은 아님',
  },
  'AI 반도체': {
    authority:'미 반도체산업협회(SIA)',
    topic:'세계 반도체 판매액·성장률',
    period:'2025년 글로벌 반도체 전체',
    url:'https://www.semiconductors.org/global-annual-semiconductor-sales-increase-25-6-to-791-7-billion-in-2025/',
    limitation:'반도체 전체 통계이므로 AI 가속기 수요·ETF 수익과 직접 동일시하면 안 됨',
  },
  '바이오·신약': {
    authority:'미 식품의약국(FDA CDER)',
    topic:'신약 승인 목록·승인일·적응증',
    period:'2026년 연중 누적',
    url:'https://www.fda.gov/drugs/novel-drug-approvals-fda/novel-drug-approvals-2026',
    limitation:'승인 건수·허가는 개발 단계 결과이며 상업 매출·마진·성공 확률이 아님',
  },
});

/** Data from ZGMINI remains the only numerical input. Discovery != evidence. */
export function buildThemeResearch(themeFeed, marketDate, retrievedAt='2026-10-24T00:00:00Z') {
  if(themeFeed?.status!=='READY')return {
    status:'BLOCKED',items:[],reason:themeFeed?.reason||'THEME_DATA_UNAVAILABLE',
    noRanking:true,noTrading:true,
  };
  const items=themeFeed.items.map(item=>{
    const route=RESEARCH_ROUTES[item.name];
    return {
      name:item.name,
      sentiment:{score:item.score,date:item.date,phase:item.phase,
        comparableToMarket:!!marketDate&&item.date===marketDate},
      demand:route?{
        status:'SOURCE_LOCATED_NOT_VERIFIED',
        authority:route.authority,topic:route.topic,period:route.period,
        url:route.url,limitation:route.limitation,discoveredAt:RESEARCH_ROUTE_CHECKED_AT,
        automaticRefresh:false,rights:'METADATA_LINK_ONLY',
      }:{status:'NO_APPROVED_SOURCE'},
      researchFact:evidenceForTheme(item.name,retrievedAt),
      monetization:{status:'NOT_VERIFIED',required:[
        '해당 기술·사업의 기업별 실질 매출 노출도',
        '실제 매출총이익·현금흐름과 기준 기간',
        '반증 가능한 비용·경쟁·희석 위험',
      ]},
      attractivenessScore:null,recommendation:null,
      decision:'UNRANKED_REVIEW',
    };
  });
  return {status:'SOURCE_DISCOVERY_UNRANKED',items,noRanking:true,noTrading:true,
    researchedAt:RESEARCH_ROUTE_CHECKED_AT,marketReferenceDate:marketDate,
    factsCheckedAt:FACTS_CHECKED_AT,
    notAutomated:'산업 원천 자료의 본문·최신 수치는 실행 시 자동 조회하지 않음',
  };
}
