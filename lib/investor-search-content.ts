// Editorial content only. No score, provider, timing or formula contract.
import type {InvestorSearchCopy} from '../components/investor-search-guide';
export const DASHBOARD_INVESTOR_SEARCH:InvestorSearchCopy={
  "heading": "주식 투자자를 위한 시장 점검",
  "items": [
    {
      "question": "미국 증시 전망을 볼 때 어떤 지표를 함께 확인하나요?",
      "answer": "미국 주식시장 투자심리는 CNN 공포탐욕지수와 VIX·풋콜비율로, 경기 환경은 물가·고용·금리·기업 실적·유동성으로 나눠 확인합니다. 종합 시장 점수는 이 흐름을 비교하는 자체 평가이며 개별 종목의 목표주가를 뜻하지 않습니다."
    },
    {
      "question": "공탐지수로 주식 매수 타이밍과 저점을 판단할 수 있나요?",
      "answer": "공포·탐욕은 시장 참여자의 위험 선호를 읽는 단서입니다. 극단적 공포·극단적 탐욕과 과거 차트를 함께 보고, 주가 급락 원인과 경기침체·신용 위험을 확인하세요. 점수 하나로 매수·매도 시점이나 반등을 확정하지 않습니다."
    },
    {
      "question": "CPI·PCE·FOMC 발표 일정은 어디에서 보나요?",
      "answer": "미국 소비자물가지수(CPI)와 개인소비지출 물가지수(PCE) 발표일·발표시간, 연준 금리 결정(FOMC) 일정은 각각의 안내에서 한국시간으로 확인할 수 있습니다. 시장 예상치와 공식 발표값, 데이터 관측일을 구분해 읽습니다."
    },
    {
      "question": "업종별·테마별로 주식시장 분위기를 비교하려면?",
      "answer": "미국 섹터별 공탐은 기술·금융·에너지·헬스케어 등 업종의 투자심리를 비교합니다. 테마별 공탐은 AI·반도체, 로봇·자동화, 클라우드·SaaS, 방산, 바이오 등 공개된 ETF 기반 점수를 비교하며 각 자료의 관측일과 잠정 여부를 표시합니다."
    }
  ],
  "links": [
    {
      "href": "/fear-greed/usa/",
      "label": "미국 공탐지수·CNN 공포지수"
    },
    {
      "href": "/fear-greed/korea/",
      "label": "한국 공탐지수·코스피 투자심리"
    },
    {
      "href": "/economic-indicators/",
      "label": "미국 경제지표 12가지"
    },
    {
      "href": "/risk-indicators/",
      "label": "주식 투자와 경제 위험 지표"
    },
    {
      "href": "/sector-fear-greed/",
      "label": "미국 업종별 공탐"
    },
    {
      "href": "/theme-fear-greed/",
      "label": "테마 ETF 투자심리"
    },
    {
      "href": "/guides/cpi-pce-release/",
      "label": "CPI·PCE 발표일·한국시간"
    },
    {
      "href": "/guides/fomc/",
      "label": "연준 금리 발표일·FOMC 일정"
    }
  ]
};
export const ECONOMIC_INVESTOR_SEARCH:Record<string,InvestorSearchCopy>={
  "inflation": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "CPI·PCE 물가지표는 미국 주식과 어떤 관계가 있나요?",
        "answer": "소비자물가와 근원 CPI·근원 PCE는 기업 비용과 금리 여건을 함께 읽을 때 확인하는 자료입니다. 물가상승률 원값과 시장 우호점수는 단위가 다릅니다. 발표 일정은 별도 안내에서 확인하세요."
      }
    ],
    "links": [
      {
        "href": "/guides/cpi-pce-release/",
        "label": "CPI·PCE 발표 일정·한국시간"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "employment": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 비농업고용·실업률·실업수당을 왜 함께 보나요?",
        "answer": "비농업고용(NFP)은 일자리 증가, 실업률은 노동시장 상태, 신규 실업수당 청구는 고용 약화 흐름을 살펴보는 자료입니다. 고용지표와 주가 반응은 금리 기대와 소비·기업 실적 여건을 함께 비교해 읽습니다."
      }
    ],
    "links": [
      {
        "href": "/recession/",
        "label": "미국 경기침체·샴의 법칙"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "rates": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 기준금리와 국채 10년물 금리는 어떻게 다른가요?",
        "answer": "연준의 정책금리와 시장에서 거래되는 미국 국채금리는 다른 값입니다. 명목금리와 물가를 반영한 실질금리를 구분하고 주식 가치평가·기업 차입 여건과 함께 읽습니다. 금리 발표 시간과 FOMC 일정은 별도 안내에서 확인하세요."
      }
    ],
    "links": [
      {
        "href": "/guides/fomc/",
        "label": "연준 금리 발표일·한국시간"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "credit": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 회사채 신용 스트레스가 주식 투자에 왜 중요한가요?",
        "answer": "투자등급(IG)·하이일드(HY) 회사채의 시장 기능과 신용여건은 기업의 자금조달 환경을 이해하는 데 도움이 됩니다. CMDI 평가와 채권 변동성을 함께 보며, 이 점수를 회사채 금리나 신용 스프레드 원값으로 읽지는 않습니다."
      }
    ],
    "links": [
      {
        "href": "/credit-risk/",
        "label": "미국 신용위험·신용경색 신호"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "growth": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 경기 둔화와 경기침체는 같은 말인가요?",
        "answer": "산업생산·신규주문·기업 활동의 증가 속도가 약해지는 경기 둔화와 경제활동이 줄어드는 경기 수축을 구분합니다. 이 페이지는 실물경기 환경을 평가하며, 리세션 위험은 경기침체 진단에서 별도로 확인합니다."
      }
    ],
    "links": [
      {
        "href": "/recession/",
        "label": "미국 리세션·경기침체 지표"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "consumption": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 개인소비지출 PCE와 PCE 물가는 어떻게 다른가요?",
        "answer": "개인소비지출은 가계가 얼마나 소비했는지를, PCE 물가지수는 소비 가격이 얼마나 변했는지를 보여줍니다. 실질 소비·소득과 가계 여력을 함께 비교해 기업 매출과 경기 흐름을 살펴봅니다."
      }
    ],
    "links": [
      {
        "href": "/economic-indicators/inflation/",
        "label": "미국 PCE 물가·CPI 지표"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "earnings": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "EPS 증가와 기업 실적 개선은 같은 뜻인가요?",
        "answer": "주당순이익(EPS)뿐 아니라 매출 성장·영업이익률·현금흐름과 이익 개선 기업의 확산을 함께 봅니다. 미국 기업 실적의 질을 비교하는 시장지표이며, 개별 기업의 실적 발표 일정이나 목표주가는 제공하지 않습니다."
      }
    ],
    "links": [
      {
        "href": "/earnings-recession/",
        "label": "미국 실적 침체 위험"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "liquidity": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "M2·TGA·역레포는 미국 증시 유동성과 어떻게 연결되나요?",
        "answer": "M2 통화량, 은행 준비금, 재무부 일반계정(TGA), 익일 역레포(ON RRP)는 서로 다른 자금 흐름을 보여줍니다. 연준·재무부의 자금 환경과 금리를 함께 확인하며, 하나의 수치 증가를 곧바로 주가 상승 신호로 해석하지 않습니다."
      }
    ],
    "links": [
      {
        "href": "/economic-indicators/rates/",
        "label": "미국 금리·국채금리"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "fundFlows": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "주식시장 자금 유입과 펀드 순유입은 어떻게 읽나요?",
        "answer": "등록펀드의 자금 유입·유출과 환매 압력은 투자자 자금흐름을 살펴보는 자료입니다. 전체 증시 거래대금이나 외국인·기관 순매수와는 다른 범위이며, 주간 등 관측 주기를 확인해 시장 폭과 함께 읽습니다."
      }
    ],
    "links": [
      {
        "href": "/economic-indicators/breadth/",
        "label": "미국 증시 수급·시장 폭"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "breadth": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "미국 증시는 오르는데 상승 종목이 적다면 무엇을 보나요?",
        "answer": "시장 폭(market breadth)은 상승이 여러 종목으로 확산되는지 살펴보는 기준입니다. 상승 종목·거래비중·참여 추세를 지수 흐름과 함께 비교하고, 국내 외국인·기관 매매 수급과는 구분합니다."
      }
    ],
    "links": [
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐·주가 강도·시장 폭"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "dollarFx": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "달러 강세와 원·달러 환율은 같은 자료인가요?",
        "answer": "이 페이지는 미국 달러 종합지수의 수준·추세·변동성을 평가합니다. 달러인덱스(DXY) 시세나 원·달러 환율 자체와는 다른 자료이며, 달러 강세·약세를 국제 유동성과 기업 실적 여건에 연결해 읽습니다."
      }
    ],
    "links": [
      {
        "href": "/economic-indicators/liquidity/",
        "label": "미국 유동성·통화량 지표"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  },
  "commodities": {
    "heading": "주식 투자와 경제지표 읽기",
    "items": [
      {
        "question": "WTI·브렌트유·구리는 주식시장과 어떤 관계가 있나요?",
        "answer": "국제유가와 구리·휘발유는 에너지·원자재 비용 환경을 살펴보는 자료입니다. 원유 가격 수준과 변화율, 평가점수를 구분하고 공급망 차질과 기업 비용 부담을 함께 확인합니다."
      }
    ],
    "links": [
      {
        "href": "/supply-shock/",
        "label": "공급망·유가 충격 위험"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표 전체"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 공탐지수"
      }
    ]
  }
};
export const RISK_INVESTOR_SEARCH:Record<string,InvestorSearchCopy>={
  "inflation": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "인플레이션·디스인플레이션·물가 재상승은 어떻게 구분하나요?",
        "answer": "인플레이션은 물가 상승, 디스인플레이션은 상승 속도의 둔화를 뜻합니다. 근원 CPI·근원 PCE의 재가속과 기대인플레이션을 함께 보며, 물가 둔화를 물가 수준 하락과 혼동하지 않습니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "recession": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "리세션·샴의 법칙·장단기 금리차 역전은 어떤 신호인가요?",
        "answer": "리세션(recession)은 경기침체를 뜻합니다. 샴의 법칙(Sahm Rule)은 실업률 흐름을, 장단기 금리차는 국채 만기별 금리 차이를 살펴보는 신호입니다. 고용·GDP·소비·생산을 함께 확인하며 하나의 경고 신호를 공식 침체 판정과 동일시하지 않습니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "stagflation-risk": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "스태그플레이션이면 주식시장에는 어떤 부담이 생기나요?",
        "answer": "스태그플레이션은 고물가와 경기 부진이 겹치는 상황입니다. 기업 비용과 가계 구매력, 성장·고용 둔화를 함께 읽는 위험 진단이며, 물가 위험이나 경기침체 위험 한 가지만으로 대신 판단하지 않습니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "credit-risk": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "신용경색·하이일드·회사채 스프레드는 같은 지표인가요?",
        "answer": "신용경색은 자금조달 여건이 경직되는 상황을 가리킵니다. 이 페이지는 HY·IG·Total CMDI 등으로 회사채 시장의 신용 스트레스를 확인하며, 별도의 하이일드 스프레드 시세나 기업 부도 확률과 구분합니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "earnings-recession": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "미국 기업의 실적 둔화와 실적 침체는 무엇을 보나요?",
        "answer": "EPS 성장·매출 성장·영업이익률·이익 개선 기업 비율을 함께 살펴봅니다. 기업 이익의 위축 여부를 읽는 위험 진단이며, 12대 기업 실적 종합 점수와 별도로 해석합니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "asset-bubble": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "주식 고평가·자산 거품·버블 붕괴는 어떻게 구분하나요?",
        "answer": "밸류에이션 부담, 가격 상승 가속, 투기성 자금과 시장 폭을 함께 살펴 과열 압력을 읽습니다. 주식시장이 고평가됐다는 평가와 버블 붕괴가 발생할 날짜·확률은 다른 주장입니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "debt-risk": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "미국 가계·기업 부채와 국가부채 한도는 다른가요?",
        "answer": "이 페이지는 가계·기업 부채의 규모와 DSR 등 원리금 상환 부담을 살펴봅니다. 미국 연방정부 국가부채 총액이나 부채한도 협상, 국가부도 확률을 대신 보여주는 점수는 아닙니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  },
  "supply-shock": {
    "heading": "주식 투자자가 함께 확인할 위험 신호",
    "items": [
      {
        "question": "공급망 차질·유가 급등·원자재 쇼크는 어떻게 연결되나요?",
        "answer": "공급 충격은 에너지·원자재 비용과 공급망 압력을 통해 기업 비용과 소비자물가에 영향을 줄 수 있습니다. 국제유가 상승의 원인이 수요 확대인지 공급 제약인지 구분하고 물가 위험과 함께 확인합니다."
      }
    ],
    "links": [
      {
        "href": "/risk-indicators/",
        "label": "미국 경제 위험 지표 비교"
      },
      {
        "href": "/economic-indicators/",
        "label": "미국 경제지표·시장 환경"
      },
      {
        "href": "/fear-greed/usa/",
        "label": "미국 증시 공포탐욕지수"
      }
    ]
  }
};
export const SECTOR_INVESTOR_SEARCH:InvestorSearchCopy={
  heading:"미국 섹터별 공포·탐욕 투자 가이드",
  items:[
    {
      question:"미국 주식에서 지금 강한 섹터는 어떻게 찾나요?",
      answer:"기술·금융·에너지·헬스케어 등 11개 GICS 섹터의 ETF 기반 투자심리 순위와 기간별 점수 변화를 함께 비교하세요. 공탐 점수가 높아도 ETF 수익률 1위나 앞으로의 상승을 보장하지는 않습니다."
    },
    {
      question:"미국 섹터 ETF 수익률과 공포탐욕 점수는 어떻게 다른가요?",
      answer:"ETF 수익률은 일정 기간의 가격 변화를, ZGMINI 섹터 공탐은 ETF 데이터를 활용해 계산한 투자심리 점수를 나타냅니다. 업종별 가격 강세와 투자심리가 항상 같은 방향으로 움직이지는 않습니다."
    },
    {
      question:"섹터 로테이션과 경기방어주·경기민감주는 어떻게 비교하나요?",
      answer:"필수소비재·유틸리티·헬스케어와 경기소비재·산업재 등 여러 섹터를 같은 기간의 차트에 선택해 비교하세요. 섹터 로테이션을 확정하는 신호는 아니지만 업종별 심리 변화의 차이를 살펴볼 수 있습니다."
    },
    {
      question:"금리 인하 전망이나 미국 경기침체와 함께 봐야 하나요?",
      answer:"연준 금리 전망과 미국 경기침체 위험은 업종별 투자심리와 다른 지표입니다. 섹터 공탐 점수 하나로 금리 인하 수혜 업종이나 다음 주도주를 단정하지 말고 관련 거시경제 지표를 함께 확인하세요."
    },
    {
      question:"공포탐욕 지수의 25·45·55·75점은 무엇을 뜻하나요?",
      answer:"0~100점의 다섯 구간으로 구분합니다. 25점 미만은 극단적 공포, 25점 이상 45점 미만은 공포, 45점 이상 55점 미만은 중립, 55점 이상 75점 미만은 탐욕, 75점 이상은 극단적 탐욕입니다."
    }
  ],
  links:[
    {href:"/fear-greed/usa/",label:"미국 증시 공포탐욕 지수"},
    {href:"/theme-fear-greed/",label:"AI·반도체 테마 ETF 공탐"},
    {href:"/recession/",label:"미국 경기침체 위험 지표"},
    {href:"/asset-bubble/",label:"미국 자산 버블 위험 지표"}
  ]
};
export const THEME_INVESTOR_SEARCH:InvestorSearchCopy={
  "heading": "테마 ETF와 공포탐욕 점수 읽기",
  "items": [
    {
      "question": "AI·반도체·로봇·바이오 테마 ETF는 어디에서 비교하나요?",
      "answer": "공개된 테마 선택에서 AI·반도체, 로봇·자동화, 클라우드·SaaS, 사이버보안, 핀테크, 자율주행, 원전·SMR, 방산, 바이오·신약의 ETF 기반 투자심리를 비교할 수 있습니다. 제공 여부와 관측일은 공개 데이터 상태에 따라 달라집니다."
    },
    {
      "question": "테마주 순위·ETF 수익률과 공탐 순위는 같은 뜻인가요?",
      "answer": "이 순위는 공개된 테마의 심리 점수 비교입니다. 개별 테마주 급등 순위나 ETF 수익률 순위가 아니며, 준비 중인 테마는 공개 점수와 구분합니다. 잠정 점수와 지연된 자료의 날짜도 확인하세요."
    }
  ],
  "links": [
    {
      "href": "/sector-fear-greed/",
      "label": "미국 섹터·업종별 공탐"
    },
    {
      "href": "/asset-bubble/",
      "label": "주식 과열·자산 버블 위험"
    }
  ]
};
export const ECONOMICHUB_INVESTOR_SEARCH:InvestorSearchCopy={
  "heading": "주식 투자자가 경제지표를 확인하는 순서",
  "items": [
    {
      "question": "미국 증시를 볼 때 물가·고용·금리 중 무엇부터 보나요?",
      "answer": "CPI·PCE 물가와 비농업고용·실업률, 연준 금리·미국 국채금리를 먼저 구분하고, 소비·기업 실적·유동성·시장 폭으로 약화나 개선이 넓게 확산되는지 살펴봅니다. 경제지표 원값과 ZGmini의 0~100 평가점수를 나누어 읽습니다."
    }
  ],
  "links": [
    {
      "href": "/guides/cpi-pce-release/",
      "label": "미국 CPI·PCE 발표일·한국시간"
    },
    {
      "href": "/guides/fomc/",
      "label": "연준 금리 발표일·FOMC 일정"
    },
    {
      "href": "/recession/",
      "label": "미국 리세션·경기침체 위험"
    }
  ]
};
export const RISKHUB_INVESTOR_SEARCH:InvestorSearchCopy={
  "heading": "미국 증시 위험을 함께 살펴보기",
  "items": [
    {
      "question": "주식시장 급락 위험은 경기침체 하나로 판단하나요?",
      "answer": "경기침체·인플레이션·스태그플레이션·신용 위험·실적 침체·자산 버블·부채 위험·공급 충격은 서로 다른 위험 영역입니다. 각 점수의 흐름과 관측일을 비교하고, 주식시장 투자심리와 경제지표를 함께 확인합니다."
    }
  ],
  "links": [
    {
      "href": "/fear-greed/usa/",
      "label": "미국 공포지수·공탐"
    },
    {
      "href": "/economic-indicators/",
      "label": "미국 경제지표 12가지"
    },
    {
      "href": "/guides/fear-greed-buying/",
      "label": "주식 매수 판단과 공탐 해석"
    }
  ]
};
