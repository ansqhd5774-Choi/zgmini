import DetailReadingGuide from "./detail-reading-guide";
import {WebPageJsonLd} from "./seo-jsonld";

type Topic = "usa" | "korea" | "inflation" | "recession" | "liquidity-crisis" | "credit-risk" | "earnings-recession" | "asset-bubble" | "debt-risk" | "supply-shock";
type Guide = {title:string; sections:{title:string;text:string;bold?:string;highlight?:string}[]; related:Topic[]};
const paths:Record<Topic,string> = {
  usa:"/fear-greed/usa/", korea:"/fear-greed/korea/", inflation:"/inflation/", recession:"/recession/",
  "liquidity-crisis":"/liquidity-crisis/", "credit-risk":"/credit-risk/", "earnings-recession":"/earnings-recession/",
  "asset-bubble":"/asset-bubble/", "debt-risk":"/debt-risk/", "supply-shock":"/supply-shock/",
};
const labels:Record<Topic,string> = {
  usa:"미국 CNN 공포탐욕지수", korea:"한국 공포탐욕지수", inflation:"미국 CPI·PCE와 물가 지표", recession:"미국 경기침체 지표",
  "liquidity-crisis":"유동성 위기 지표", "credit-risk":"회사채·신용 위험 지표", "earnings-recession":"기업 실적 지표",
  "asset-bubble":"자산 버블 지표", "debt-risk":"부채 위험 지표", "supply-shock":"공급 충격 지표",
};
const guides:Record<Topic,Guide> = {
  usa:{title:"공포탐욕지수를 상황별로 읽는 방법",sections:[
    {title:"공포가 이어지는 경우",text:"해석 예시: 공포 구간이 여러 날 이어지면 위험 회피가 지속되고 있다는 뜻으로 읽습니다. 낮은 점수 자체가 저점을 확정하지는 않습니다. 가격 추세, 변동성, 구성요소가 함께 안정되는지 확인하세요."},
    {title:"탐욕과 경기 신호가 엇갈리는 경우",text:"해석 예시: 투자심리는 강하지만 고용·소비가 약해질 수 있습니다. 시장 심리와 경제활동은 서로 다른 대상을 측정하므로 점수 하나로 다른 지표의 의미를 덮어쓰지 않습니다."},
    {title:"나스닥·비트코인 지수와 구별하세요",text:"이 페이지는 CNN의 미국 주식시장 공포탐욕지수입니다. 나스닥만을 대상으로 산출한 전용 지수나 비트코인 공포탐욕지수가 아닙니다. 위 사례는 읽는 방법을 설명하며 검증된 매매 규칙이나 수익률 사례가 아닙니다."},
  ],related:["korea","inflation","recession"]},
  korea:{title:"한국 시장심리와 다른 지표를 함께 읽기",sections:[
    {title:"심리와 가격이 엇갈릴 때",text:"해석 예시: 점수가 개선돼도 주가가 바로 반등하지 않을 수 있습니다. 해당 관측일의 가격 흐름·수급·변동성을 함께 확인하고 하루의 변화보다 여러 거래일의 흐름을 살펴보세요."},
    {title:"같은 50점도 같은 시장 상황은 아닙니다",text:"한국 자체 지표와 CNN 미국 지수는 대상 시장과 입력 자료가 다릅니다. 한 시장의 점수가 더 높다는 이유만으로 수익률이 더 좋거나 위험이 더 낮다고 판단할 수 없습니다."},
  ],related:["usa","recession","inflation"]},
  inflation:{title:"CPI·PCE 현재값과 물가 점수를 구분하기",sections:[
    {title:"CPI와 PCE는 어떤 숫자인가요?",text:"둘 다 미국의 물가 변화를 보여주는 통계예요. CPI는 사람들이 사는 물건과 서비스 가격을, PCE는 가계의 소비를 더 넓게 살펴봐요. 조사하는 범위와 계산 방법이 달라 숫자도 다를 수 있어요.",highlight:"둘 다 미국의 물가 변화를 보여주는 통계",bold:"CPI"},
    {title:"전체 물가와 근원 물가는 뭐가 다른가요?",text:"전체(Headline) 물가는 식품과 에너지 가격까지 포함해요. 근원(Core) 물가는 가격이 크게 오르내리는 식품·에너지를 빼고 물가의 기본 흐름을 살펴봐요. 둘 다 중요한 숫자예요.",highlight:"물가의 기본 흐름",bold:"근원(Core) 물가"},
    {title:"전년 대비와 3개월 연율은 어떻게 읽나요?",text:"전년 대비(YoY)는 1년 전과 비교해 얼마나 변했는지예요. '3개월 연율'은 최근 3개월의 상승 속도가 1년 내내 이어진다고 가정한 숫자예요. 예를 들어 3개월 동안 1% 올랐다면 연율로는 약 4%예요. 서로 다른 기간의 숫자를 그대로 비교하면 안 돼요.",highlight:"전년 대비(YoY)는 1년 전",bold:"3개월 연율"},
    {title:"긍정·중립·부정 색은 어떻게 보나요?",text:"긍정·중립·부정은 각 항목이 물가 안정에 얼마나 유리한 방향인지 알려줘요. '과거 중앙값'은 예전 수치들을 크기순으로 놓았을 때 가운데 값이에요. 목표치나 과거 값은 이해를 돕는 기준이고, 색은 저장된 평가 점수로 결정돼요. 긍정이라고 주가 상승이 보장되는 건 아니에요.",highlight:"색은 저장된 평가 점수로 결정돼요",bold:"긍정·중립·부정"},
    {title:"발표일과 '—'는 무엇을 뜻하나요?",text:"물가 통계는 정해진 날짜에 새로 발표돼요. 발표 일정은 아래 공식 사이트에서 확인하세요. '—'는 0이 아니라 표시할 자료가 없다는 뜻이에요. '개발중'은 아직 점수 계산에 쓰지 않는 항목이에요.",highlight:"발표 일정은 아래 공식 사이트에서 확인하세요",bold:"표시할 자료가 없다는 뜻"},
    {title:"홈페이지에도 물가 점수가 있는데 같은 건가요?",text:"홈페이지 12개 주요 지표의 '물가'는 이 페이지의 점수를 소수점 없이 보여주는 값이에요. 하지만 별도 위험 진단의 '인플레이션'은 평가하려는 내용이 달라요. 이름이 비슷해도 같은 점수라고 생각하지 마세요.",highlight:"이 페이지의 점수를 소수점 없이 보여주는 값",bold:"별도 위험 진단의 '인플레이션'"},
  ],related:["recession","supply-shock","usa"]},
  recession:{title:"경기침체 점수와 고용·소비 신호 읽기",sections:[
    {title:"경기 점수와 침체 방어점수는 구별합니다",text:"홈페이지의 12대 지표 중 경기는 성장 관련 지표입니다. 8개 위험 진단의 경기 침체와 이 상세는 경기침체 방어를 살펴보는 별도 진단입니다. 비슷한 이름이어도 입력과 목적이 같다는 뜻은 아닙니다."},
    {title:"확률·공식 침체 판정이 아닙니다",text:"방어점수는 높을수록 경기 방어가 양호한 방향입니다. 점수나 100에서 점수를 뺀 값을 침체 발생 확률로 해석하지 마세요. 이 페이지의 주의 상태도 공식 경기침체 선언이나 매도 신호가 아닙니다."},
    {title:"지표가 엇갈리는 경우",text:"해석 예시: 고용은 약해져도 소비는 유지될 수 있습니다. 각 행의 관측 기간과 변화 방향을 확인한 뒤 약화가 여러 영역으로 확대되는지 살펴봅니다. 월별·분기별 수치를 같은 날짜의 사건처럼 비교하지 마세요."},
  ],related:["inflation","credit-risk","earnings-recession"]},
  "liquidity-crisis":{title:"시장 유동성과 유동성 위기 점수 읽기",sections:[
    {title:"유동성과 위기 진단은 다른 질문에 답합니다",text:"홈페이지의 유동성 지표와 이 상세의 유동성 위기 진단은 같은 숫자를 서로 다른 이름으로 보여주는 것이 아닙니다. 자금 여건과 위기 방어를 구분하고 각 지표의 입력·관측일을 확인하세요."},
    {title:"은행·시장 신호를 함께 확인하세요",text:"은행과 단기자금 시장의 일부 신호가 약해졌다고 금융위기를 확정할 수 없습니다. 표의 현재값·저장 점수·판단을 함께 읽고 신용 위험과 경기 흐름도 확인합니다."},
  ],related:["credit-risk","debt-risk","recession"]},
  "credit-risk":{title:"회사채와 신용 위험 지표 읽기",sections:[
    {title:"고위험·우량 회사채를 구별하세요",text:"HY는 고위험 회사채, IG는 투자등급 회사채를 가리킵니다. 신용 관련 원자료와 0~100 평가점수는 다른 척도입니다. 현재값의 단위와 해당 행의 판단 근거를 함께 확인하세요."},
    {title:"신용 악화와 주가 하락은 같은 사건이 아닙니다",text:"해석 예시: 주가가 오르는 동안 신용 여건은 약해질 수 있습니다. 회사채·금융여건·채권 변동성의 관측일과 흐름을 함께 읽어 한 지표만으로 시장 방향을 단정하지 않습니다."},
  ],related:["liquidity-crisis","debt-risk","recession"]},
  "earnings-recession":{title:"기업 실적 점수와 개별 종목 실적 구별하기",sections:[
    {title:"시장 전체의 실적과 한 기업의 실적은 다릅니다",text:"이 페이지의 실적 지표는 개별 종목의 목표주가나 실적 발표 일정이 아닙니다. 화면의 대상 기업 범위와 회계 기간을 확인하고 종목을 판단할 때는 해당 기업의 공시를 별도로 살펴보세요."},
    {title:"분기 실적과 현재 시장을 연결할 때",text:"분기 회계 기간과 실제 공시 시점은 다릅니다. 과거 실적이 양호해도 현재 주가가 상승한다는 뜻은 아니므로 가격 수준·물가·신용 여건을 함께 확인하세요."},
  ],related:["recession","asset-bubble","credit-risk"]},
  "asset-bubble":{title:"자산 버블 안전점수를 읽는 방법",sections:[
    {title:"가격 부담과 붕괴 시점을 구별하세요",text:"밸류에이션·가격가속·투기성 자금 등은 과열을 살펴보는 자료입니다. 안전점수는 버블 붕괴 날짜나 발생 확률을 예측하는 값이 아닙니다. 원자료와 판단을 함께 확인하세요."},
    {title:"가격과 실적이 함께 움직이는지 확인하세요",text:"해석 예시: 가격이 빠르게 올라도 실적이 함께 개선될 수 있습니다. 반대로 실적 없이 가격만 오를 수도 있으므로 실적·신용 지표를 함께 읽습니다. 이는 매매 규칙을 검증한 사례가 아닙니다."},
  ],related:["earnings-recession","credit-risk","usa"]},
  "debt-risk":{title:"부채 위험과 이자 부담 읽기",sections:[
    {title:"부채 규모와 상환 부담은 다릅니다",text:"부채의 크기만으로 위험을 확정하지 않습니다. 화면에 제공된 이자 부담·소득·신용 관련 항목의 단위와 관측 기간을 함께 확인하세요. 방어점수는 실제 부채 비율이나 부도 확률이 아닙니다."},
    {title:"금리와 신용 여건을 함께 보세요",text:"해석 예시: 부채 규모가 같아도 금리와 소득 여건에 따라 부담이 달라질 수 있습니다. 어떤 지표가 달라졌는지 확인하고 신용 위험·경기 흐름과 함께 읽습니다."},
  ],related:["credit-risk","liquidity-crisis","recession"]},
  "supply-shock":{title:"유가·공급 충격과 물가를 함께 읽기",sections:[
    {title:"유가 수준과 변화율을 구별하세요",text:"원유 가격, 일정 기간의 가격 변화율, 공급 충격 평가점수는 서로 다릅니다. 표의 단위와 계산 기간을 먼저 확인하세요. 이 페이지는 원유 선물 실시간 시세나 유가 예측 서비스가 아닙니다."},
    {title:"공급 충격과 물가가 엇갈릴 때",text:"해석 예시: 에너지 가격이 움직여도 전체 소비물가에 반영되는 시점은 다를 수 있습니다. 유가·생산비용·소비물가의 관측 기간을 나누어 읽고 한 지표만으로 물가 방향을 확정하지 않습니다."},
  ],related:["inflation","recession","debt-risk"]},
};

export default function DetailInvestorNotes({topic}:{topic:Topic}) {
  const guide=guides[topic];
  return <>
    <WebPageJsonLd name={labels[topic]} description={`${guide.title}. 현재값·관측일·관련 지표를 함께 확인하세요.`} path={paths[topic]}/>
    <DetailReadingGuide title={guide.title}
      variant={topic==="asset-bubble"||topic==="debt-risk"||topic==="supply-shock"?"beginner":topic==="inflation"||topic==="recession"||topic==="liquidity-crisis"||topic==="credit-risk"||topic==="earnings-recession"?"beginner":"default"}
      displayTitle={topic==="inflation"?"물가 표에 나오는 말, 쉽게 알아보기":topic==="recession"?"경기침체 표에 나오는 말, 쉽게 알아보기":topic==="liquidity-crisis"?"유동성 위기 표, 쉽게 알아보기":topic==="credit-risk"?"신용 위험 표, 쉽게 알아보기":topic==="earnings-recession"?"기업 실적 지표, 쉽게 알아보기":topic==="asset-bubble"?"자산 버블 표, 쉽게 알아보기":topic==="debt-risk"?"부채 위험 표, 쉽게 알아보기":topic==="supply-shock"?"공급 충격 표, 쉽게 알아보기":undefined}
      intro={topic==="inflation"?"CPI·PCE부터 기간·판단 색깔까지 하나씩 알려드릴게요.":topic==="recession"?"고용·GDP·경기 신호를 이해하기 쉽게 풀어볼게요.":topic==="liquidity-crisis"?"유동성 점수와 단기자금·은행 지표를 구분해 읽어보세요.":topic==="credit-risk"?"회사채 신용 스트레스와 국채 변동성을 구분해 읽어보세요.":topic==="earnings-recession"?"미국 기업 전체 실적과 개별 종목 실적, 평가일과 공식 발표일을 구분해 확인하세요.":topic==="asset-bubble"?"밸류에이션과 주가 흐름을 구분하고 평가 분기·출처 상태를 확인하세요.":topic==="debt-risk"?"부채 크기와 상환 부담, 관측 기간을 구분해 읽어보세요.":topic==="supply-shock"?"에너지 가격과 공급 제약, 물가 충격을 구분해 읽어보세요.":undefined}
      sections={[...guide.sections,
        ...((topic==="inflation")?[]:[{title:"날짜와 현재 제공 범위 확인",text:topic==="earnings-recession"?"E1-R5 표의 평가 기준일은 저장된 실적 자료를 종합 평가한 날짜입니다. 기업 공시·BEA·BLS·CFO 자료 각각의 관측 기간이나 공식 발표일이 아닙니다. 서로 다른 주기의 자료를 결합하므로 같은 날짜에 발표된 수치로 해석하지 마세요. ‘—’는 실제 값 0이 아닙니다.":"관측일은 데이터가 설명하는 기간이며 화면 갱신일이나 공식 발표 시각과 다를 수 있습니다. 월별·분기별 자료의 월·분기 시작일 표기는 매일 갱신되는 시세가 아닙니다. ‘—’, ‘확인 필요’, ‘개발중’은 실제 값 0이 아니며, 개발중 항목은 현재 이용 가능한 관측값으로 해석하지 마세요."}]),
        ...(!["usa","korea","inflation","recession"].includes(topic)?[
          {title:"과거 차트와 판정의 의미",text:"현재 개정 자료(Current Vintage)는 나중에 수정된 통계를 포함할 수 있습니다. 과거 차트를 당시 투자자가 알던 자료만으로 검증한 예측 성과로 해석하지 마세요. 긍정·중립·부정은 각 지표의 평가 방향이며 투자 수익률을 보장하지 않습니다."},
        ]:[]),
      ]}
      sources={topic==="inflation"?[
        {href:"https://www.bls.gov/schedule/news_release/cpi.htm",label:"CPI 공식 발표 일정",description:"미국 소비자물가 발표 날짜 확인"},
        {href:"https://www.bea.gov/news/schedule",label:"PCE 공식 발표 일정",description:"미국 경제분석국 발표 날짜 확인"},
      ]:[]}
      related={[...guide.related.map(id=>({href:paths[id],label:labels[id]})),
        ...((topic==="usa"||topic==="korea")?[{href:"/guides/fear-greed-buying/",label:"공포탐욕지수 매수 기준과 한계"}]:[]),
        ...(topic==="inflation"?[{href:"/guides/cpi-pce-release/",label:"CPI·PCE 발표시간과 결과 해석"}]:[]),
        ...((topic==="inflation"||topic==="recession")?[{href:"/guides/fomc/",label:"FOMC 일정과 금리 결정 읽기"}]:[]),
      ]}/>
    {(topic==="usa"||topic==="korea")&&<section className="mt-8 space-y-3 text-sm leading-7 text-slate-300" aria-label="한국·미국 공포탐욕지수 비교">
      <h2 className="text-xl font-bold text-white">한국·미국 공포탐욕지수 비교</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <caption className="mb-3 text-left">점수 크기보다 각 시장의 과거 흐름과 비교하세요.</caption>
          <thead><tr className="border-b border-slate-700"><th scope="col" className="p-3">구분</th><th scope="col" className="p-3">미국</th><th scope="col" className="p-3">한국</th></tr></thead>
          <tbody>{[
            ["제공 지수","CNN Fear & Greed","ZGmini 자체 지표"],
            ["대상","미국 주식시장","국내 시장 투자심리"],
            ["자료","CNN 제공 종합값·7개 구성요소","화면에 명시된 KRX·ECOS 등 국내 자료"],
            ["비교 기준","해당 지수의 과거 흐름·관측일","해당 지수의 과거 흐름·관측일"],
          ].map(([label,us,kr])=><tr key={label} className="border-b border-slate-800"><th scope="row" className="p-3 font-semibold text-white">{label}</th><td className="p-3">{us}</td><td className="p-3">{kr}</td></tr>)}</tbody>
        </table>
      </div>
    </section>}
  </>;
}
