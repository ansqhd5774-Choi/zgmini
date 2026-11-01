type Market="usa"|"korea";
type Question={title:string;answer:string};
const topics:Record<Market,{heading:string;lead:string;items:Question[];links:{href:string;label:string}[]}>={
 usa:{
  heading:"미국 주식 투자자가 함께 보는 공포탐욕 신호",
  lead:"미국 주식(미장)의 공포지수·공탐으로 부르는 CNN Fear & Greed Index와 S&P500·나스닥·VIX(빅스) 지수를 함께 살펴볼 때 필요한 해석입니다.",
   items:[
    {title:"공탐 지수는 공포와 탐욕 지수와 같은 뜻인가요?",answer:"공탐은 공포와 탐욕의 줄임말이며 공탐지수라고 붙여 쓰기도 합니다. 이 페이지의 미국 주식 공탐 지수는 CNN 지수입니다. 비트코인 등 가상자산 공탐 지수는 입력 시장과 산출 방식이 달라 같은 값으로 해석하면 안 됩니다."},
   {title:"S&P500·나스닥과 CNN 공포탐욕지수는 어떻게 다른가요?",answer:"S&P500과 나스닥 지수는 주가 흐름을 보여주고, CNN 공포탐욕지수는 미국 주식시장 투자심리를 7개 구성요소로 표시합니다. 나스닥만을 대상으로 산출한 별도 지수는 아니므로 개별 기술주의 매수·매도 신호로 동일하게 읽지 않습니다."},
   {title:"미국 증시 급락 때 VIX 지수·풋콜비율은 무엇을 알려주나요?",answer:"VIX는 옵션시장에 반영된 예상 변동성이고, 풋콜비율은 옵션의 방어 수요를 보여줍니다. CNN은 VIX의 50일 평균 대비 수준을 포함한 여러 신호를 반영하므로 VIX 숫자 하나만으로 종합점수를 단정하지 않습니다."},
   {title:"주가 모멘텀·시장 폭·주가 강도를 왜 함께 보나요?",answer:"S&P500의 125거래일 이동평균 대비 흐름, 시장의 상승 참여 폭, 52주 신고가와 신저가의 상대적 강도는 서로 다른 시장 신호입니다. 지수가 상승하더라도 일부 종목만 강하면 구성요소의 결과는 달라질 수 있습니다."},
   {title:"극단적 공포 구간은 미국 주식 매수 타이밍인가요?",answer:"극단적 공포는 위험 회피가 크다는 뜻일 뿐 주가 저점이 확정됐다는 뜻은 아닙니다. 기간별 차트와 신용위험·경기 흐름을 함께 확인하고 데이터 관측일이 언제인지 살펴보세요."},
  ],
  links:[{href:"/sector-fear-greed/",label:"미국 섹터별 공포탐욕"},{href:"/credit-risk/",label:"미국 신용위험"},{href:"/guides/fear-greed-buying/",label:"공포탐욕지수와 매수 판단"}],
 },
 korea:{
  heading:"코스피 투자자가 함께 보는 공포탐욕 신호",
  lead:"한국 주식(국장)의 공포지수·한국 공탐지수와 코스피 변동성·시장 수급을 함께 해석할 때 필요한 기준입니다.",
   items:[
    {title:"한국 공탐 지수와 미국 공탐 지수는 같은 지수인가요?",answer:"공탐은 공포와 탐욕의 줄임말입니다. 한국 공탐지수는 ZGmini가 국내 시장 자료로 산출하고, 미국 지수는 CNN이 제공합니다. 입력 시장과 산출 방식이 다르므로 같은 점수라도 동일한 투자 상황을 의미하지 않습니다."},
   {title:"한국 공포탐욕지수는 코스피·코스닥 투자심리를 모두 보여주나요?",answer:"이 지수는 코스피 관련 국내 시장 자료 등을 사용하는 ZGmini 자체 Revision 7 모델입니다. 코스닥만을 대상으로 별도 계산한 공포탐욕지수가 아니며, 미국 CNN 지수와도 입력 시장과 산출 방식이 다릅니다."},
   {title:"코스피 하락 때 VKOSPI200·풋콜비율은 어떤 신호인가요?",answer:"VKOSPI200은 국내 옵션시장에 반영된 예상 변동성을 나타냅니다. 한국 모델은 변동성의 50일 평균 대비 수준과 최근 풋콜비율 등 7개 신호를 사용하며, 두 숫자만으로 종합점수를 역산하지 않습니다."},
   {title:"외국인·기관 수급과 국내 증시 투자심리는 같은 지표인가요?",answer:"외국인·기관 순매수는 시장 상황을 이해할 때 함께 참고할 수 있지만, 화면의 7개 구성 신호와 동일한 항목은 아닙니다. 수급은 별도 시장 자료로 확인하고 공포탐욕 점수와 구분해 해석해야 합니다."},
   {title:"한국 주식 저점 판단에 공포탐욕지수를 활용할 수 있나요?",answer:"위험 회피의 강도를 참고할 수 있지만 낮은 점수가 주가 바닥이나 반등을 보장하지는 않습니다. 관측일과 기간별 변화도 확인하세요. 과거 점수는 현재 확보한 원자료로 재구성한 연구용 베타이며 당시 point-in-time 빈티지는 검증되지 않았습니다."},
  ],
  links:[{href:"/fear-greed/usa/",label:"미국 CNN 공포탐욕지수"},{href:"/guides/fear-greed-buying/",label:"공포탐욕지수와 매수 판단"},{href:"/sector-fear-greed/",label:"미국 섹터 투자심리"}],
 },
};
export default function InvestorIntentGuide({market}:{market:Market}){
 const data=topics[market];
 return <section className="mt-8 text-slate-200" aria-label={data.heading}>
  <h2 className="text-lg font-extrabold leading-7 text-white sm:text-xl">{data.heading}</h2>
  <p className="mt-2 text-xs leading-6 text-slate-400 sm:text-sm">{data.lead}</p>
  <div className="mt-4 grid gap-3 md:grid-cols-2">
   {data.items.map(item=><article key={item.title} className="min-w-0 bg-[#0c2535] p-4 sm:p-5">
    <h3 className="text-sm font-bold leading-6 text-white">{item.title}</h3>
    <p className="mt-2 text-xs leading-6 text-slate-300 sm:text-sm">{item.answer}</p>
   </article>)}
  </div>
  <nav className="mt-4 flex flex-wrap gap-2" aria-label="함께 볼 주식시장 지표">
   {data.links.map(link=><a key={link.href} href={link.href} className="inline-flex min-h-9 items-center bg-[#153446] px-3 py-2 text-xs font-semibold text-cyan-100 hover:bg-[#1c475c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300">{link.label} →</a>)}
  </nav>
 </section>;
}
