type Topic="credit-risk"|"liquidity-crisis"|"debt-risk"|"inflation"|"recession"|"earnings-recession"|"asset-bubble"|"supply-shock";

const copy:Record<Topic,string>={
  "credit-risk":"미국 회사채 시장의 신용 위험과 기업 자금조달 환경을 확인하세요. HY·IG·Total CMDI, 금융여건과 국채 변동성을 종합해 현재 신용시장 스트레스와 기간별 변화를 분석합니다.",
  "liquidity-crisis":"미국 금융시장의 현금 부족과 유동성 위기 위험을 분석합니다. 단기자금시장, Repo, 은행 준비금, TGA, ON RRP, M2와 국채 변동성을 함께 확인하세요.",
  "debt-risk":"미국 가계와 기업의 부채 부담을 DSR, 부채/GDP, 금리 부담, 신용 스트레스와 상환능력으로 분석합니다. 부채가 경기와 금융시장에 주는 위험을 현재 점수와 추이로 확인하세요.",
  "inflation":"물가 안정 점수와 최근 1년 추세, 한눈에.",
  "recession":"경기 방어점수와 최근 1년 추세 · 경기침체 확률 아님.",
  "earnings-recession":"미국 기업 실적의 둔화와 침체 위험을 EPS 성장, 매출 성장, 영업이익률, 이익 성장 기업 비율로 확인하세요. 저장된 실적 데이터와 기간별 흐름을 통해 기업 이익 환경의 변화를 살펴봅니다.",
  "asset-bubble":"미국 자산시장의 버블 위험을 밸류에이션 압력, 가격가속, 위험자산 비중, 투기성 자금흐름, 시장폭 괴리와 과잉유동성으로 살펴봅니다. 현재 안전점수와 기간별 흐름을 함께 확인하세요.",
  "supply-shock":"미국 공급 충격 위험을 공급망 압력과 유가·원자재 변화로 살펴봅니다. 현재 안전점수와 기간별 차트를 함께 확인해 공급 측 비용 압력의 변화를 점검하세요.",
};

export default function SearchIntentIntro({topic}:{topic:Topic}){
  if(topic==="inflation"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 물가, <span className="text-sky-300">안정되고 있을까?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  if(topic==="recession"){
    return <div className="mb-4 max-w-4xl border-l-[3px] border-sky-400/80 pl-3 sm:mb-5 sm:pl-4" data-testid={`search-intent-intro-${topic}`}>
      <p className="text-[18px] font-extrabold leading-[1.3] tracking-[-0.025em] text-slate-50 sm:text-[22px]">미국 경기, <span className="text-sky-300">침체 신호는?</span></p>
      <p className="mt-1 text-[12px] leading-[1.45] text-slate-300 sm:text-[13px]">{copy[topic]}</p>
    </div>;
  }
  return <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300 sm:text-base" data-testid={`search-intent-intro-${topic}`}>{copy[topic]}</p>;
}
