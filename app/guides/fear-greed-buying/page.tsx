import {ArrowUpRight,BookOpen,CheckCircle2,ExternalLink} from 'lucide-react';
import SiteHeader from '@/components/site-header';
import GuidePage,{guideMetadata} from '../guide-page';

const title='공포탐욕지수 매수 기준: 지금 주식 사도 될까?';
const answer='공포·탐욕 지수는 시장의 투자심리를 보여줍니다. 공포가 크다고 주가 바닥이 확정되는 것도, 탐욕이 크다고 곧 하락한다는 뜻도 아닙니다.';
const path='/guides/fear-greed-buying/';

export const metadata=guideMetadata(title,'공포탐욕지수로 주식 매수 타이밍을 판단하기 전에 확인할 3가지, 미국·한국 지수의 차이와 상황별 해석을 쉽게 안내합니다.',path);

const checks=[
  {number:'01',title:'지수가 가리키는 시장',detail:'미국 CNN 지수인지, 한국 ZGmini 자체 지수인지 확인하고 관측일과 1개월·3개월 흐름을 함께 보세요.',color:'border-cyan-400'},
  {number:'02',title:'공포가 생긴 이유',detail:'신용 위험, 경기, 물가가 함께 악화되는지 확인하세요. 공포가 높아도 가격 하락이 계속될 수 있습니다.',color:'border-amber-400'},
  {number:'03',title:'나의 투자 조건',detail:'투자 기간, 필요한 자금의 시점, 감당 가능한 손실을 먼저 정하세요. 점수만으로 매수 비중을 결정하지 않습니다.',color:'border-emerald-400'},
];

const scenarios=[
  {tag:'공포가 심할 때',title:'점수 하락 + 신용 악화',description:'저점이라고 단정하기 어렵습니다. 하락 원인과 변동성이 진정되는지 함께 확인하세요.'},
  {tag:'공포가 줄어들 때',title:'점수 반등 + 물가 불확실',description:'투자심리가 회복되어도 경제 여건은 다를 수 있습니다. 다른 지표와 관측일을 대조하세요.'},
  {tag:'탐욕이 강할 때',title:'점수 상승 + 가격 부담',description:'높은 점수가 즉시 매도 신호는 아닙니다. 가격과 투자 비중을 따로 점검하세요.'},
];

export default function Page(){
  return <>
    <SiteHeader/>
    <GuidePage title={title} answer={answer} path={path} dateModified="2026-10-23">
      <section className="mt-8" aria-labelledby="fg-buying-steps">
        <div className="flex items-center gap-2 text-amber-300">
          <CheckCircle2 size={17} aria-hidden="true"/>
          <span className="text-xs font-bold tracking-[.12em]">매수 전 체크</span>
        </div>
        <h2 id="fg-buying-steps" className="mt-2 text-xl font-bold text-white sm:text-2xl">점수보다 먼저 확인할 3가지</h2>
        <p className="mt-2 text-sm leading-7 text-slate-300">지수에 정해진 매수 점수는 없습니다. 아래 순서대로 확인하면 숫자를 더 정확하게 해석할 수 있습니다.</p>
        <ol className="mt-5 grid gap-3 md:grid-cols-3">
          {checks.map(item=><li key={item.number} className={`min-w-0 border-l-[3px] ${item.color} bg-[#0c2535] px-4 py-5`}>
            <span className="text-sm font-bold tabular-nums text-amber-300">{item.number}</span>
            <h3 className="mt-2 text-base font-bold leading-6 text-white">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-200">{item.detail}</p>
          </li>)}
        </ol>
      </section>

      <nav aria-label="현재 공포탐욕지수 확인" className="mt-7 grid gap-3 sm:grid-cols-2">
        <a href="/fear-greed/usa/" className="group flex min-h-16 items-center justify-between gap-3 bg-[#153446] px-5 py-4 transition-colors hover:bg-[#1d4960] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          <span><strong className="block text-base text-white">미국 공포·탐욕지수</strong><small className="mt-1 block text-xs text-slate-300">CNN · 미국 주식시장</small></span>
          <ArrowUpRight aria-hidden="true" size={20} className="shrink-0 text-amber-300 group-hover:text-white"/>
        </a>
        <a href="/fear-greed/korea/" className="group flex min-h-16 items-center justify-between gap-3 bg-[#153446] px-5 py-4 transition-colors hover:bg-[#1d4960] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          <span><strong className="block text-base text-white">한국 공포·탐욕지수</strong><small className="mt-1 block text-xs text-slate-300">ZGmini 자체 지표 · 한국 시장</small></span>
          <ArrowUpRight aria-hidden="true" size={20} className="shrink-0 text-amber-300 group-hover:text-white"/>
        </a>
      </nav>

      <section className="mt-10" aria-labelledby="fg-buying-scenarios">
        <h2 id="fg-buying-scenarios" className="flex items-center gap-2 text-xl font-bold text-white"><BookOpen size={20} aria-hidden="true" className="text-amber-300"/>상황별로 읽어보기</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">이해를 돕기 위한 가상 사례이며, 과거 수익률로 검증된 매매 규칙은 아닙니다.</p>
        <div className="mt-5 grid gap-3">
          {scenarios.map(item=><article key={item.tag} className="grid gap-2 bg-[#0c2535] px-5 py-4 sm:grid-cols-[190px_1fr] sm:gap-5">
            <div><span className="text-xs font-semibold text-amber-300">{item.tag}</span><h3 className="mt-1 text-sm font-bold text-white">{item.title}</h3></div>
            <p className="text-sm leading-6 text-slate-200">{item.description}</p>
          </article>)}
        </div>
      </section>

      <section className="mt-10 bg-[#0c2535] px-5 py-5" aria-labelledby="fg-buying-difference">
        <h2 id="fg-buying-difference" className="text-lg font-bold text-white">미국과 한국, 같은 20점일까요?</h2>
        <p className="mt-2 text-sm leading-7 text-slate-200">아닙니다. 미국은 CNN이 제공하는 지수를 표시하고, 한국은 ZGmini가 국내 시장 자료로 계산한 별도 지표입니다. 대상 시장과 산출 방식이 달라 <strong className="text-white">같은 점수를 같은 매수 조건으로 비교할 수 없습니다.</strong> 비트코인이나 나스닥 전용 지수와도 구분해서 보세요.</p>
      </section>

      <section className="mt-9" aria-label="출처와 함께 볼 지표">
        <h2 className="text-base font-bold text-white">출처와 함께 볼 지표</h2>
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <a href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-cyan-200 underline underline-offset-4">CNN 원문 <ExternalLink size={14} aria-hidden="true"/></a>
          <a href="https://www.investor.gov/additional-resources/spotlight/formerdirectorlorischock-directors-take/dont-panic-plan-it" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1 text-cyan-200 underline underline-offset-4">SEC 투자 위험·계획 안내 <ExternalLink size={14} aria-hidden="true"/></a>
          <a href="/credit-risk/" className="inline-flex min-h-10 items-center gap-1 text-cyan-200 underline underline-offset-4">신용 위험 지표 <ArrowUpRight size={14} aria-hidden="true"/></a>
        </div>
      </section>
    </GuidePage>
  </>;
}
