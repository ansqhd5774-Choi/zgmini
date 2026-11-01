type Topic="credit-risk"|"liquidity-crisis"|"stagflation-risk"|"debt-risk"|"inflation"|"recession"|"earnings-recession"|"asset-bubble"|"supply-shock";

const copy:Record<Topic,string>={
  "stagflation-risk":"미국의 고물가와 성장·고용 둔화가 겹치는 위험을 확인하세요. 물가 압력, 실물·고용 둔화와 최근 1년 월별 재구성 흐름을 함께 봅니다. 스태그플레이션(stagflation)은 물가 상승과 경기 부진이 겹치는 상황을 뜻합니다.",
  "credit-risk":"미국 회사채 시장의 신용 위험과 기업 자금조달 환경을 확인하세요. HY·IG·Total CMDI, 금융여건과 국채 변동성을 종합해 현재 신용시장 스트레스와 기간별 변화를 분석합니다. 하이일드(HY)와 투자등급(IG) 회사채의 시장 기능을 CMDI로 살펴보며, 채무불이행 확률과 구분합니다.",
  "liquidity-crisis":"미국 금융시장의 현금 부족과 유동성 위기 위험을 분석합니다. 단기자금시장, Repo, 은행 준비금, TGA, ON RRP, M2와 국채 변동성을 함께 확인하세요.",
  "debt-risk":"미국 가계와 기업의 부채 부담을 DSR, 부채/GDP, 금리 부담, 신용 스트레스와 상환능력으로 분석합니다. 부채가 경기와 금융시장에 주는 위험을 현재 점수, 구성지표와 관측일로 확인하세요. DSR은 부채 원리금 상환 부담을 나타내며, 국가부채 총액이나 미국 국가부도 확률이 아닙니다.",
  "inflation":"기조 물가의 재가속·지속 압력을 7개 위험 평가 축과 최근 1년 저장 추이로 살펴봅니다. 12대 경제지표 물가와는 별도 산식입니다. CPI는 소비자물가지수, PCE는 개인소비지출 물가지수이며, 근원 물가와 기대인플레이션을 구분합니다.",
  "recession":"경기 방어점수와 최근 1년 추세 · 경기침체 확률 아님. 미국 경기침체(recession) 신호를 고용·소비·생산·금리차와 함께 읽습니다.",
  "earnings-recession":"8대 위험 지표의 실적 침체 방어 진단입니다. 12대 기업 실적 점수·차트와 구분해 확인하세요. 실적 침체(earnings recession)는 기업 이익의 위축을 뜻하며, 주당순이익(EPS)·매출·이익률을 함께 살펴봅니다.",
  "asset-bubble":"미국 자산시장의 버블 위험을 밸류에이션 압력, 가격가속, 위험자산 비중, 투기성 자금흐름, 시장폭 괴리와 과잉유동성으로 살펴봅니다. 현재 안전점수와 기간별 흐름을 함께 확인하세요. 자산 버블(asset bubble)은 자산 가격의 과열·거품 위험을 뜻하며, 버블 붕괴 시점을 예측하지 않습니다.",
  "supply-shock":"미국 공급 충격 위험을 공급망 압력과 유가·원자재 변화로 살펴봅니다. 현재 안전점수와 기간별 차트를 함께 확인해 공급 측 비용 압력의 변화를 점검하세요. 공급 충격(supply shock)은 공급망 차질과 에너지·원자재 비용 압력으로 나타날 수 있습니다.",
};

export default function SearchIntentIntro({topic}:{topic:Topic}){
  if(topic==="stagflation-risk"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 경제, <span className="text-sky-300">스태그플레이션 위험은?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="inflation"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 인플레이션, <span className="text-sky-300">압력이 커지고 있을까?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="credit-risk"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 회사채, <span className="text-sky-300">신용 위험은?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="liquidity-crisis"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 금융시장, <span className="text-sky-300">유동성 위기는?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="earnings-recession"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 기업 실적, <span className="text-sky-300">침체 신호는?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="recession"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 경기, <span className="text-sky-300">침체 신호는?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="asset-bubble"||topic==="debt-risk"||topic==="supply-shock"){
    const heading=topic==="asset-bubble"?["미국 자산시장,","버블 위험은?"]:topic==="debt-risk"?["미국 가계·기업,","부채 위험은?"]:["미국 공급망,","충격 위험은?"];
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">{heading[0]} <span className="text-sky-300">{heading[1]}</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  return <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base" data-testid={`search-intent-intro-${topic}`}>{copy[topic]}</p>;
}
