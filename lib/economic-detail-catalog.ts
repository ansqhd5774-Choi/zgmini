// Presentation-only catalogue. Domain ids are the existing published /api/market-score ids.
// No formula, factor weight, publisher schema or provider transport is defined here.
export const ECONOMIC_DETAIL_CATALOG=[
  {
    "id": "inflation",
    "searchTitle": "미국 물가지표 | CPI·PCE·기대인플레이션",
    "slug": "inflation",
    "name": "물가",
    "tags": "CPI·PCE·기대물가",
    "question": "압력이 낮아지고 있을까요?",
    "description": "미국 소비자물가지수(CPI), 개인소비지출 물가지수(PCE)와 기대인플레이션으로 물가상승률이 기업 비용·금리 환경에 주는 영향을 살펴봅니다.",
    "reading": "물가 상승률 자체가 아니라 물가 여건의 시장 우호도를 나타내는 0~100점입니다.",
    "impact": "물가 부담이 안정되면 금리와 기업 비용 압박이 완화될 수 있습니다. 단일 점수가 주가를 예측하지는 않습니다."
  },
  {
    "id": "employment",
    "searchTitle": "미국 고용지표 | 비농업고용·실업률·실업수당",
    "slug": "employment",
    "name": "고용",
    "tags": "실업률·신규 고용·실업수당",
    "question": "일자리는 건강한 상태일까요?",
    "description": "미국 고용지표인 실업률, 비농업고용(NFP)과 신규 실업수당 청구로 일자리 증가세와 노동시장 흐름을 비교합니다.",
    "reading": "높을수록 노동시장 환경이 시장에 우호적인 방향입니다. 취업자 비율이나 고용 증가율 그 자체가 아닙니다.",
    "impact": "고용이 급격히 둔화하면 소비와 기업 실적에 부담이 생길 수 있습니다. 지나친 과열도 비용 압력으로 이어질 수 있습니다."
  },
  {
    "id": "rates",
    "searchTitle": "미국 기준금리·국채금리 | 연준 금리·실질금리",
    "slug": "rates",
    "name": "금리",
    "tags": "정책금리·국채금리·실질금리",
    "question": "시장에 부담을 줄까요?",
    "description": "미국 기준금리인 연방기금금리와 국채금리·실질금리로 연준(Fed)의 정책과 자금 조달 여건을 확인합니다. 금리 발표 일정은 별도 FOMC 안내에서 확인합니다.",
    "reading": "높을수록 금리 여건이 시장에 유리하다는 평가입니다. 실제 연준 금리 수준을 의미하지 않습니다.",
    "impact": "금리는 대출 비용과 주식 가치평가에 영향을 줍니다. 단일 금리만으로 투자 방향을 결정할 수 없습니다."
  },
  {
    "id": "credit",
    "searchTitle": "미국 회사채 지표 | 하이일드·신용시장·채권 변동성",
    "slug": "credit",
    "name": "채권신용",
    "tags": "회사채·신용여건·변동성",
    "question": "회사채 시장은 안정적인가요?",
    "description": "미국 투자등급(IG)·하이일드(HY) 회사채와 채권시장 변동성, 기업의 자금조달 압력을 살펴봅니다.",
    "reading": "높을수록 신용시장 여건이 더 안정적인 방향입니다. 실제 채권 수익률과는 다릅니다.",
    "impact": "신용시장이 경직되면 기업 자금 조달 비용이 상승할 수 있습니다. 시장 전체 신용 스트레스와 함께 해석해야 합니다."
  },
  {
    "id": "growth",
    "searchTitle": "미국 경기지표 | 산업생산·신규주문·경기 둔화",
    "slug": "growth",
    "name": "경기",
    "tags": "산업생산·신규주문·사업 활동",
    "question": "실물경기는 회복하고 있을까요?",
    "description": "미국 산업생산과 신규주문, 고용·사업 활동으로 실물경기 흐름을 살펴봅니다. 경기침체 위험 진단과 구분한 경제지표 평가입니다.",
    "reading": "높을수록 실물경기 여건이 우호적인 방향입니다. GDP 성장률 자체나 공식 경기침체 확률은 아닙니다.",
    "impact": "경기가 둔화하면 기업 매출과 생산에 부담이 생길 수 있습니다. 현재 점수는 저장된 모델 결과입니다."
  },
  {
    "id": "consumption",
    "searchTitle": "미국 소비지표 | 개인소비지출·실질소비·소득",
    "slug": "consumption",
    "name": "소비",
    "tags": "실질소비·소득·가계 금융여력",
    "question": "가계 소비는 잘 버티고 있을까요?",
    "description": "미국 실질 개인소비지출(PCE)과 소득·고용, 가계 금융 여력을 함께 비교합니다. 소비 지출과 PCE 물가지수는 다른 통계입니다.",
    "reading": "높을수록 가계 소비 여건이 상대적으로 우호적인 방향입니다. 소비 증가율 자체가 아닙니다.",
    "impact": "가계 소비는 기업 매출과 경기 확장에 중요한 영역입니다. 소득과 연체 같은 부담도 함께 살펴야 합니다."
  },
  {
    "id": "earnings",
    "searchTitle": "미국 기업 실적 | EPS·매출·영업이익률·현금흐름",
    "slug": "earnings",
    "name": "기업실적",
    "tags": "EPS·매출·이익률·현금흐름",
    "question": "기업 실적의 질은 좋아지고 있을까요?",
    "description": "미국 기업의 주당순이익(EPS)과 매출 성장, 이익률·현금흐름·실적 확산을 평가합니다. 실적 침체 위험 진단과 구분한 시장지표입니다.",
    "reading": "높을수록 기업 실적 환경이 우호적이라는 뜻입니다. 별도의 실적 침체 메인 진단점수와 혼동하지 않습니다.",
    "impact": "매출과 이익의 개선이 일부 기업에만 집중되어 있는지도 중요합니다. 기업 전체의 수익성과 비용 부담을 함께 봅니다."
  },
  {
    "id": "liquidity",
    "searchTitle": "미국 유동성 지표 | M2 통화량·은행 준비금·TGA",
    "slug": "liquidity",
    "name": "유동성",
    "tags": "은행 준비금·M2·TGA·ON RRP",
    "question": "시장에 충분한 자금이 있을까요?",
    "description": "미국 은행 준비금, 통화량(M2), 재무부 일반계정(TGA)과 익일 역레포(ON RRP)로 시장 유동성과 정부·연준의 자금 흐름을 살펴봅니다.",
    "reading": "높을수록 시장의 자금 환경이 우호적인 방향입니다. 다른 페이지의 유동성 위기 방어점수와 별개입니다.",
    "impact": "시장 유동성은 금리와 금융여건에 영향을 줍니다. 단일 통화량 증가만으로 위험을 판단하지 않습니다."
  },
  {
    "id": "fundFlows",
    "searchTitle": "미국 펀드 자금흐름 | 자금 유입·유출·환매 압력",
    "slug": "fund-flows",
    "name": "자금흐름",
    "tags": "등록펀드 순유입·환매 압력",
    "question": "투자자금이 시장으로 들어오고 있나요?",
    "description": "미국 등록펀드 자금 유입·유출과 순유입, 환매 압력을 비교합니다. 펀드 자금흐름(fund flows)의 관측 주기와 저장 시점을 함께 확인합니다.",
    "reading": "높을수록 자금흐름이 시장에 더 우호적인 방향입니다. 모든 주식형 상품의 실시간 매매금액은 아닙니다.",
    "impact": "순유입이 강해도 다른 수급 요인과 가격은 달리 움직일 수 있습니다. 관측 주기와 저장 시점을 확인하세요."
  },
  {
    "id": "breadth",
    "searchTitle": "미국 증시 수급·시장 폭 | 상승종목·거래비중",
    "slug": "breadth",
    "name": "수급·폭",
    "tags": "상승종목·거래비중·참여 폭",
    "question": "증시 상승은 넓게 확산되고 있나요?",
    "description": "미국 증시의 상승 종목과 거래비중, 단기·중기 참여 추세로 시장 폭(market breadth)을 살펴봅니다. 지수 상승이 여러 종목으로 확산되는지 확인합니다.",
    "reading": "높을수록 상승 참여와 시장 수급의 폭이 우호적이라는 평가입니다. 개별 주식의 상승 확률이 아닙니다.",
    "impact": "소수 대형주만 상승할 때와 많은 종목이 함께 오를 때는 시장의 구조가 다릅니다. 단기 잡음과 결측을 구분해야 합니다."
  },
  {
    "id": "dollarFx",
    "searchTitle": "미국 달러지수 | 달러 강세·약세·환율 환경",
    "slug": "dollar-fx",
    "name": "달러환율",
    "tags": "달러지수·추세·변동성",
    "question": "달러 강세가 시장에 부담인가요?",
    "description": "미국 달러 종합지수의 수준·추세·변동성으로 달러 강세와 약세 흐름을 살펴봅니다. 원·달러 환율 자체와는 다른 자료입니다.",
    "reading": "높을수록 달러 여건이 시장에 우호적이라는 평가입니다. 원·달러 환율 자체를 의미하지 않습니다.",
    "impact": "달러 강세는 국제 유동성과 기업 실적에 다양한 영향을 줄 수 있습니다. 환율 한 가지로 경기 방향을 확정하지 않습니다."
  },
  {
    "id": "commodities",
    "searchTitle": "국제유가·원자재 지표 | WTI·브렌트유·구리",
    "slug": "commodities",
    "name": "유가원자재",
    "tags": "WTI·Brent·구리·휘발유",
    "question": "원자재 가격은 시장에 부담을 줄까요?",
    "description": "서부텍사스산 원유(WTI), 브렌트유(Brent)와 구리·휘발유로 국제유가와 원자재의 가격 환경을 살펴봅니다.",
    "reading": "높을수록 원자재 비용 환경이 시장에 우호적인 방향입니다. 원유 가격 상승 자체를 뜻하지 않습니다.",
    "impact": "원자재는 기업 비용과 공급 충격의 신호가 될 수 있습니다. 수요 증가와 공급 제약을 구분해서 읽어야 합니다."
  }
] as const;
export type EconomicDomainId=typeof ECONOMIC_DETAIL_CATALOG[number]["id"];
export function economicDetailById(id:string){return ECONOMIC_DETAIL_CATALOG.find(entry=>entry.id===id)??null;}
export function economicDetailBySlug(slug:string){return ECONOMIC_DETAIL_CATALOG.find(entry=>entry.slug===slug)??null;}
