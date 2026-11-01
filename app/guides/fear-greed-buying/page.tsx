import {ArrowRight,ArrowUpRight,ChartNoAxesColumnIncreasing,ClipboardCheck,ExternalLink,FileText,Info,Landmark,ShieldAlert} from 'lucide-react';
import SiteHeader from '@/components/site-header';
import GuidePage,{guideMetadata} from '../guide-page';

const title="공탐지수·공포탐욕지수 매수 기준 | 주식 매수 타이밍";
const answer='공포·탐욕 지수(공탐 지수)는 매수 신호가 아닌 시장 심리를 보여줍니다. 지수의 흐름과 하락 원인, 그리고 내 투자 계획을 함께 확인하세요.';
const path='/guides/fear-greed-buying/';

export const metadata=guideMetadata(title,"공포탐욕지수로 주식 매수 타이밍을 판단하기 전에 확인할 3가지와 공탐지수·극단적 공포·탐욕의 해석을 안내합니다. 미국·한국 지수의 차이, 주가 저점과 분할매수 판단에서 살펴볼 한계를 확인하세요.",path);

const bands=[
  {label:'극도의 공포',description:'매우 부정적',color:'#9f2233'},
  {label:'공포',description:'부정적',color:'#f2555a'},
  {label:'중립',description:'관망적',color:'#9aa8b6'},
  {label:'탐욕',description:'긍정적',color:'#58c88a'},
  {label:'극도의 탐욕',description:'매우 긍정적',color:'#15865e'},
];

const steps=[
  {number:'01',title:'흐름 확인',description:'지수가 단기적으로 하락 중인지, 바닥을 형성하고 있는지 흐름을 확인하세요.',color:'#30d9e4',icon:ChartNoAxesColumnIncreasing},
  {number:'02',title:'원인 확인',description:'공포가 커진 원인이 일시적인지, 구조적인지 확인하세요.',color:'#37bfff',icon:FileText},
  {number:'03',title:'투자 계획',description:'지금이 내 투자 원칙과 계획에 맞는 구간인지 점검하세요.',color:'#10dcb3',icon:ClipboardCheck},
];

const scenarios=[
  {label:'공포 확대',check:'신용 위험 · 하락 원인',detail:'하락의 원인이 신용 문제, 유동성 이슈 등 구조적인지 확인하세요.',color:'#9f2233'},
  {label:'공포 완화',check:'시장 흐름 · 경제 지표',detail:'지수가 바닥을 형성하는지, 주요 경제 지표가 안정되는지 살펴보세요.',color:'#9aa8b6'},
  {label:'탐욕 확대',check:'가격 부담 · 투자 비중',detail:'가격이 과열 구간에 있는지, 기존 투자 비중을 점검하세요.',color:'#15865e'},
];

const focusClass='focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#49e2df]';

export default function Page(){
  return <>
    <SiteHeader/>
    <GuidePage title={title} answer={answer} path={path} dateModified="2026-10-25" variant="market">
      <div className="relative isolate overflow-hidden bg-[linear-gradient(140deg,#062333_0%,#061a29_60%,#03121d_100%)] px-4 pb-8 pt-7 sm:px-6 md:px-9 md:pb-10 md:pt-9 lg:px-12">
        <div aria-hidden="true" className="pointer-events-none absolute left-[43%] top-3 hidden h-[260px] w-[225px] opacity-25 lg:block" style={{backgroundImage:'radial-gradient(#2382a0 1px, transparent 1px)',backgroundSize:'13px 13px',maskImage:'linear-gradient(to bottom,black,transparent)'}}/>
        <section className="relative grid items-start gap-7 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-11" aria-labelledby="fg-buying-title">
          <div className="min-w-0">
            <p className="text-[12px] font-bold tracking-[.08em] text-[#37dfeb] sm:text-sm">투자 지표 활용 안내</p>
            <h1 id="fg-buying-title" className="mt-3 text-[28px] font-extrabold leading-[1.22] tracking-[-.055em] text-[#f6f9ff] sm:text-[39px] lg:text-[40px] xl:text-[45px]">
              공포·탐욕지수,<span className="block sm:inline"> 지금 사도 될까?</span>
              <span className="mt-2 block text-[#7deaf2]">점수만으로 매수하지 않습니다.</span>
            </h1>
            <div aria-hidden="true" className="mt-3 h-[2px] w-48 bg-[#37dbe1] sm:w-64"/>
            <p className="mt-7 max-w-[660px] border-l-[4px] border-[#36dae2] py-1 pl-4 text-[15px] leading-[1.8] text-[#e0eaf2] sm:pl-5 sm:text-[17px]">
              공포·탐욕 점수는 매수 신호가 아닌 시장 심리입니다.<br className="hidden sm:block"/>
              지수의 흐름과 하락 원인, 그리고 내 투자 계획을 함께 확인하세요.
            </p>
          </div>
          <aside className="border border-[#27506b] bg-[#052033]/80 p-4 sm:p-5 lg:p-6" aria-labelledby="fg-buying-bands">
            <div className="flex items-center justify-between gap-2">
              <h2 id="fg-buying-bands" className="text-[16px] font-extrabold text-[#f4f7fc] sm:text-[18px]">시장 심리 구간 읽기</h2>
              <p className="flex items-center gap-1.5 text-[11px] text-[#c9d7e2] sm:text-xs">낮을수록 공포, 높을수록 탐욕 <Info size={15} aria-hidden="true"/></p>
            </div>
            <div className="mt-4 grid grid-cols-5 gap-[2px]" aria-label="공포에서 탐욕까지의 5단계 시장 심리">
              {bands.map(band=><div key={band.label} className="min-w-0">
                <div className="h-9 sm:h-11" style={{backgroundColor:band.color}}/>
                <p className="mt-3 text-center text-[11px] font-extrabold leading-5 text-[#f1f6fc] sm:text-[13px]">{band.label}</p>
                <p className="mt-1 text-center text-[11px] leading-5 text-[#bbcdda] sm:text-xs">{band.description}<br/>심리 구간</p>
              </div>)}
            </div>
            <div className="mt-4 flex items-center gap-2 border border-[#1b4b64] px-3 py-2.5 text-[12px] leading-5 text-[#d0dfeb] sm:mt-5">
              <Info size={16} className="shrink-0" aria-hidden="true"/>
              구간은 심리의 단계이며 매수 신호가 아닙니다.
            </div>
          </aside>
        </section>

        <section className="relative mt-9" aria-labelledby="fg-buying-steps">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-b border-[#205069] pb-3 sm:border-0 sm:pb-0">
            <h2 id="fg-buying-steps" className="text-[23px] font-extrabold leading-snug tracking-tight text-white sm:text-[25px]">매수 전 판단 3단계</h2>
            <p className="text-[12px] leading-6 text-[#b9cbd9] sm:text-sm">점수만 보지 말고, 시장 흐름 · 하락 원인 · 내 투자 계획을 함께 점검하세요.</p>
            <div className="hidden h-px min-w-8 flex-1 bg-[#206079] sm:block"/>
          </div>
          <ol className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_20px_minmax(0,1fr)_20px_minmax(0,1fr)] lg:items-center lg:gap-3">
            {steps.map((step,index)=>{
              const Icon=step.icon;
              return <li key={step.number} className={`relative min-w-0 ${index===0?'lg:col-start-1':index===1?'lg:col-start-3':'lg:col-start-5'}`}>
                <div className="border-t-[3px] bg-[#0a2a3d] px-4 pb-4 pt-3.5" style={{borderTopColor:step.color}}>
                  <div className="flex items-center gap-3">
                    <span className="text-[27px] font-bold tabular-nums leading-none sm:text-[29px]" style={{color:step.color}}>{step.number}</span>
                    <span aria-hidden="true" className="h-8 w-px bg-[#365e73]"/>
                    <Icon size={25} strokeWidth={1.6} className="shrink-0 text-[#e8f3fa]"/>
                    <span aria-hidden="true" className="h-8 w-px bg-[#365e73]"/>
                    <h3 className="text-[17px] font-extrabold text-[#f5f9ff]">{step.title}</h3>
                  </div>
                  <p className="mt-2 pl-[69px] text-[12px] leading-[1.65] text-[#cbdce8] sm:text-[13px] lg:min-h-[43px]">{step.description}</p>
                </div>
                {index<2?<ArrowRight size={18} aria-hidden="true" className="absolute -right-[26px] top-1/2 hidden -translate-y-1/2 text-[#e1eff6] lg:block"/>:null}
              </li>;
            })}
          </ol>
        </section>

        <section className="mt-7" aria-labelledby="fg-buying-scenarios">
          <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <h2 id="fg-buying-scenarios" className="text-[23px] font-extrabold leading-snug tracking-tight text-white sm:text-[25px]">상황별 확인 포인트</h2>
            <p className="text-[12px] leading-6 text-[#b9cbd9] sm:text-sm">시장 상황에 따라, 추가로 확인해야 할 핵심 포인트를 정리했습니다.</p>
            <div className="hidden h-px min-w-8 flex-1 bg-[#206079] sm:block"/>
          </div>
          <div className="mt-4 border border-[#1e4c64]">
            <table className="w-full border-collapse text-left text-[12px] sm:text-[13px]">
              <thead className="bg-[#0c3044] text-[#e2edf7]">
                <tr>
                  <th scope="col" className="w-[27%] px-3 py-2 font-extrabold sm:w-[22%] sm:px-6">시장 심리</th>
                  <th scope="col" className="w-[40%] border-l border-[#1e4c64] px-3 py-2 font-extrabold sm:w-[28%] sm:px-6">추가로 확인할 것</th>
                  <th scope="col" className="hidden border-l border-[#1e4c64] px-6 py-2 font-extrabold sm:table-cell">판단할 때 살펴볼 내용</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map(item=><tr key={item.label} className="border-t border-[#1e4c64] bg-[#072537] text-[#cfdeeb]">
                  <th scope="row" className="px-3 py-2 font-extrabold text-[#f1f6fc] sm:px-6">
                    <span className="flex items-center gap-3"><span className="h-5 w-[5px] shrink-0 rounded-[1px]" style={{backgroundColor:item.color}}/>{item.label}</span>
                  </th>
                  <td className="border-l border-[#1e4c64] px-3 py-2 font-bold text-[#dcecf6] sm:px-6">{item.check}</td>
                  <td className="hidden border-l border-[#1e4c64] px-6 py-2 sm:table-cell">{item.detail}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <div className="mt-2 grid gap-1.5 sm:hidden">
            {scenarios.map(item=><p key={item.label} className="border-l-2 border-[#265469] pl-3 text-[12px] leading-5 text-[#adcadb]"><strong className="mr-1 text-[#e8f2f9]">{item.label}:</strong>{item.detail}</p>)}
          </div>
        </section>

        <section className="mt-7 grid items-center gap-4 lg:grid-cols-[minmax(200px,0.95fr)_minmax(0,1.5fr)_minmax(0,1.08fr)] lg:gap-7" aria-labelledby="fg-buying-links">
          <div className="min-w-0">
            <h2 id="fg-buying-links" className="flex items-center gap-4 text-[22px] font-extrabold text-white sm:text-[24px]">지수 확인하기 <span className="h-px min-w-7 flex-1 bg-[#38718a]"/></h2>
            <p className="mt-2 text-[12px] leading-6 text-[#c0d2df] sm:text-[13px]">주요 시장의 공포·탐욕 지수(공탐 지수)를 확인하고,<br className="hidden sm:block"/> 나의 투자 판단에 활용해보세요.</p>
          </div>
          <nav className="grid gap-3 sm:grid-cols-2" aria-label="실제 미국·한국 공포탐욕지수로 이동">
            <a href="/fear-greed/usa/" className={`group flex min-h-[60px] items-center justify-center gap-3 rounded-[3px] bg-[#18d9ca] px-4 text-[14px] font-extrabold text-[#042332] transition-colors hover:bg-[#65f4e8] ${focusClass}`}>
              미국 공포·탐욕 확인 <ArrowUpRight size={19} strokeWidth={1.9} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
            </a>
            <a href="/fear-greed/korea/" className={`group flex min-h-[60px] items-center justify-center gap-3 rounded-[3px] border border-[#25cfd2] bg-[#061d2d] px-4 text-[14px] font-extrabold text-[#f1f7fc] transition-colors hover:bg-[#0b3b4c] ${focusClass}`}>
              한국 지수 확인 <ArrowUpRight size={19} strokeWidth={1.9} aria-hidden="true" className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"/>
            </a>
          </nav>
          <nav aria-label="원문 및 추가 참고 자료" className="flex flex-wrap items-center justify-start gap-x-3 gap-y-2 border-t border-[#27566b] pt-3 text-[11px] text-[#b8cbda] sm:gap-x-4 lg:justify-end lg:border-l lg:border-t-0 lg:py-2 lg:pl-5">
            <a href="https://www.cnn.com/markets/fear-and-greed" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-8 items-center gap-1 hover:text-white ${focusClass}`}><FileText size={15} aria-hidden="true"/> CNN 원문 <ExternalLink size={12} aria-hidden="true"/></a>
            <a href="https://www.investor.gov/additional-resources/spotlight/formerdirectorlorischock-directors-take/dont-panic-plan-it" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-8 items-center gap-1 hover:text-white ${focusClass}`}><Landmark size={15} aria-hidden="true"/> SEC 투자 참고 <ExternalLink size={12} aria-hidden="true"/></a>
            <a href="/credit-risk/" className={`inline-flex min-h-8 items-center gap-1 hover:text-white ${focusClass}`}><ShieldAlert size={15} aria-hidden="true"/> 신용 위험 <ArrowUpRight size={12} aria-hidden="true"/></a>
          </nav>
        </section>

        <p className="mt-5 text-[12px] leading-6 text-[#c0d2df]">분할매수 여부를 판단할 때도 공포탐욕지수는 참고자료입니다. 이 가이드는 매수 비중이나 횟수를 정하지 않으며, 시장 흐름·하락 원인·내 투자 계획을 함께 확인하는 순서를 안내합니다.</p>
        <p className="mt-3 text-[11px] leading-5 text-[#a8bccb]">※ 본 콘텐츠는 투자 판단을 위한 교육 자료이며, 특정 종목의 매수를 권유하는 것이 아닙니다.</p>
        <p className="mt-1 text-[11px] leading-5 text-[#91aebe]">미국 CNN 지수와 한국 ZGmini 자체 지수는 산출 방식과 대상 시장이 달라 같은 점수를 동일한 매수 조건으로 해석할 수 없습니다. · 내용 확인일 2026-10-25</p>
      </div>
    </GuidePage>
  </>;
}
