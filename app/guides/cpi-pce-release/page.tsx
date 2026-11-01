import GuidePage,{guideMetadata} from '../guide-page';
import ReleaseCalendar from '../release-calendar';

const title='미국 CPI·PCE 발표 일정·한국시간 | 물가지수 발표일·발표시간';
const answer='미국 CPI와 PCE는 모두 물가 상승을 측정하지만 조사 범위와 계산 방식이 다릅니다. 이 글에서는 한국시간 발표 일정, 전체·근원 물가의 차이, 전월 대비·전년 대비 읽는 법, 발표값과 시장 예상치를 비교할 때의 주의점을 한 번에 정리합니다.';
const path='/guides/cpi-pce-release/';

export const metadata=guideMetadata(
  title,
  'CPI·PCE 공식 발표 일정의 한국시간과 최신 공식 발표값을 확인하세요. 소비자물가지수와 PCE 물가지수의 차이, 근원 물가·예상치 비교 방법을 쉽게 설명합니다.',
  path,
);

const sectionTitle='text-[21px] font-extrabold leading-snug tracking-tight text-white sm:text-[24px]';
const bodyText='mt-3 text-[14px] leading-7 text-[#cbd9e5] sm:text-[15px]';
const linkClass='inline-flex min-h-10 items-center font-semibold text-[#85e7ed] underline underline-offset-4 hover:text-white';

export default function Page(){
 return <GuidePage title={title} answer={answer} path={path} dateModified="2026-10-26">
  <nav aria-label="이 글의 목차" className="mt-8 border-y border-[#234557] py-4">
   <p className="mb-3 text-[12px] font-extrabold tracking-wide text-[#86b8c9]">이 글에서 확인할 내용</p>
   <ol className="grid gap-x-4 gap-y-2 text-[13px] font-semibold sm:grid-cols-2 sm:text-[14px]">
    <li><a href="#cpi-pce-difference" className="text-[#dceaf3] hover:text-[#65e2eb]">01 · CPI와 PCE, 무엇이 다를까?</a></li>
    <li><a href="#cpi-pce-schedule" className="text-[#dceaf3] hover:text-[#65e2eb]">02 · 발표 일정과 한국시간</a></li>
    <li><a href="#cpi-pce-how-to-read" className="text-[#dceaf3] hover:text-[#65e2eb]">03 · 발표 숫자 비교하는 방법</a></li>
    <li><a href="#cpi-pce-investment" className="text-[#dceaf3] hover:text-[#65e2eb]">04 · 주식시장에 미치는 영향</a></li>
   </ol>
  </nav>

  <section id="cpi-pce-difference" className="scroll-mt-20 pt-9" aria-labelledby="cpi-pce-difference-title">
   <p className="text-[12px] font-bold tracking-wider text-[#3bdce7]">01 · 먼저 개념부터</p>
   <h2 id="cpi-pce-difference-title" className={`${sectionTitle} mt-1`}>CPI와 PCE, 무엇이 다를까?</h2>
   <p className={bodyText}>마트 물건값, 외식비, 월세처럼 생활 속 가격이 얼마나 변했는지 알아보는 대표적인 미국 물가 통계가 <strong className="text-white">소비자물가지수(CPI)</strong>와 <strong className="text-white">개인소비지출 물가지수(PCE)</strong>입니다. 두 지표가 같은 달에 다르게 움직여도 둘 중 하나가 잘못된 것은 아닙니다.</p>
   <div className="mt-5 grid gap-3 md:grid-cols-2">
    <article className="bg-[#0a293a] px-4 py-5 sm:px-5">
     <div className="mb-3 flex items-baseline justify-between gap-2"><h3 className="text-[19px] font-extrabold text-white">CPI</h3><span className="text-[11px] text-[#a2bacb]">미국 노동통계국 · BLS</span></div>
     <p className="text-[14px] leading-7 text-[#d1e0eb]">도시 소비자가 실제로 구매하는 상품과 서비스의 가격 변화를 살펴봅니다. 소비자가 체감하는 생활물가의 방향을 이해할 때 유용합니다.</p>
     <p className="mt-3 border-t border-[#294c5e] pt-3 text-[12px] leading-6 text-[#b4cbd9]">대표 확인 항목: 주거비, 식품, 에너지, 서비스 가격</p>
    </article>
    <article className="bg-[#0a293a] px-4 py-5 sm:px-5">
     <div className="mb-3 flex items-baseline justify-between gap-2"><h3 className="text-[19px] font-extrabold text-white">PCE</h3><span className="text-[11px] text-[#a2bacb]">미국 경제분석국 · BEA</span></div>
     <p className="text-[14px] leading-7 text-[#d1e0eb]">가계가 직접 지출하거나 가계를 대신해 지급되는 소비 지출까지 더 넓게 반영합니다. 소비 패턴이 바뀌면 지출 비중도 반영하는 방식입니다.</p>
     <p className="mt-3 border-t border-[#294c5e] pt-3 text-[12px] leading-6 text-[#b4cbd9]">연준의 장기 물가 목표 2%는 PCE 물가지수의 전년 대비 상승률을 기준으로 합니다.</p>
    </article>
   </div>
   <p className={bodyText}>두 지표의 차이는 단순히 발표 기관만의 문제가 아닙니다. <strong className="text-white">포함하는 지출의 범위, 항목별 비중, 계산 방식</strong>이 다르기 때문에 CPI가 높고 PCE가 낮게 나오는 달도 있습니다. 따라서 두 숫자를 서로의 예상치나 직전 값처럼 비교하지 않습니다.</p>
   <aside className="mt-4 border-l-[3px] border-[#3dd9dc] bg-[#092536] px-4 py-3 text-[13px] leading-6 text-[#dceaf3]">
    <strong className="text-white">전체 물가와 근원 물가도 구분하세요.</strong> 전체 물가에는 식품과 에너지가 포함되고, 근원 물가는 가격 변동이 큰 식품과 에너지를 제외해 기초적인 물가 흐름을 살펴봅니다. 두 값 중 하나만 보면 변화를 놓칠 수 있습니다.
   </aside>
  </section>

  <section id="cpi-pce-schedule" className="scroll-mt-20 pt-10" aria-labelledby="cpi-pce-schedule-title">
   <p className="text-[12px] font-bold tracking-wider text-[#3bdce7]">02 · 발표 전에 확인할 것</p>
   <h2 id="cpi-pce-schedule-title" className={`${sectionTitle} mt-1`}>미국 CPI·PCE 발표일과 한국시간</h2>
   <p className={bodyText}>CPI는 BLS에서, PCE는 BEA의 개인소득·지출 보고서에서 발표합니다. 통상 미국 동부시간 오전 8시 30분에 발표하며, <strong className="text-white">서머타임에는 한국시간 오후 9시 30분, 표준시에는 오후 10시 30분</strong>입니다. 미국 발표 일정이 바뀌면 날짜와 한국시간을 다시 확인해야 합니다.</p>
   <div className="mt-4 grid gap-2 sm:grid-cols-2">
    <div className="bg-[#0d2d40] px-4 py-3"><p className="text-[12px] text-[#b7ccda]">미국 동부 서머타임 · EDT</p><strong className="mt-1 block text-[20px] text-white">한국시간 21:30</strong></div>
    <div className="bg-[#0d2d40] px-4 py-3"><p className="text-[12px] text-[#b7ccda]">미국 동부 표준시 · EST</p><strong className="mt-1 block text-[20px] text-white">한국시간 22:30</strong></div>
   </div>
   <p className="mt-3 text-[12px] leading-6 text-[#aebfcd]">예를 들어 ‘10월 CPI 발표’는 10월에 발표하는 자료를 뜻할 수 있고, 실제 통계의 기준월은 9월일 수 있습니다. 발표일과 기준월을 구분하세요.</p>
   <ReleaseCalendar kind="inflation"/>
  </section>

  <section id="cpi-pce-how-to-read" className="scroll-mt-20 pt-11" aria-labelledby="cpi-pce-read-title">
   <p className="text-[12px] font-bold tracking-wider text-[#3bdce7]">03 · 발표 직후 읽는 순서</p>
   <h2 id="cpi-pce-read-title" className={`${sectionTitle} mt-1`}>발표값을 봤다면 이렇게 비교하세요</h2>
   <p className={bodyText}>숫자가 높아졌다고 해서 곧바로 ‘예상보다 높다’는 뜻은 아닙니다. 실제 수치, 직전 수치, 시장 예상치는 서로 다른 정보입니다.</p>
   <ol className="mt-5 space-y-3">
    <li className="flex gap-4 bg-[#0a293a] px-4 py-4"><span className="shrink-0 text-[22px] font-extrabold text-[#54e1e8]">01</span><div><h3 className="font-extrabold text-white">먼저 같은 지표인지 확인</h3><p className="mt-1 text-[13px] leading-6 text-[#c6d8e5]">전체 CPI와 근원 CPI, CPI와 PCE는 다른 지표입니다. 비교표에 적힌 정확한 이름부터 봅니다.</p></div></li>
    <li className="flex gap-4 bg-[#0a293a] px-4 py-4"><span className="shrink-0 text-[22px] font-extrabold text-[#54e1e8]">02</span><div><h3 className="font-extrabold text-white">전월 대비·전년 대비와 기준월 구분</h3><p className="mt-1 text-[13px] leading-6 text-[#c6d8e5]">전월 대비 0.3%와 전년 대비 3.0%는 비교 기간이 달라 직접 빼면 안 됩니다. 계절조정 여부도 맞춰야 합니다.</p></div></li>
    <li className="flex gap-4 bg-[#0a293a] px-4 py-4"><span className="shrink-0 text-[22px] font-extrabold text-[#54e1e8]">03</span><div><h3 className="font-extrabold text-white">직전 값과 시장 예상치 구분</h3><p className="mt-1 text-[13px] leading-6 text-[#c6d8e5]">직전 값은 이전 달에 관측한 통계입니다. 시장 예상치는 발표 전에 민간 조사기관 등이 집계한 전망치이므로 별도 출처와 집계 시점이 필요합니다.</p></div></li>
    <li className="flex gap-4 bg-[#0a293a] px-4 py-4"><span className="shrink-0 text-[22px] font-extrabold text-[#54e1e8]">04</span><div><h3 className="font-extrabold text-white">전체·근원과 구성 항목을 함께 확인</h3><p className="mt-1 text-[13px] leading-6 text-[#c6d8e5]">에너지 가격 때문에 전체 물가만 뛰었는지, 주거·서비스 등에서 상승세가 이어지는지 살펴보면 숫자의 배경을 이해하기 쉽습니다.</p></div></li>
   </ol>
   <div className="mt-5 border border-[#2d5b6c] bg-[#092b3d] p-4 sm:p-5">
    <h3 className="text-[16px] font-extrabold text-white">가상 예시 · 발표 0.3%, 예상 0.2%</h3>
    <p className="mt-2 text-[14px] leading-7 text-[#dae6ee]">같은 지표, 같은 기준월, 같은 전월 대비 단위라면 예상 대비 차이는 <strong className="text-[#65ebea]">+0.1%포인트</strong>입니다. 이는 0.1% 상승률이 아니라 두 상승률 사이의 차이입니다.</p>
    <p className="mt-2 text-[12px] leading-6 text-[#a8bfce]">※ 계산을 보여주기 위한 임의의 숫자이며 실제 발표값이나 현재 시장 예상치가 아닙니다. 위의 공식 결과 표에서도 검증되지 않은 예상치는 제공하지 않습니다.</p>
   </div>
  </section>

  <section id="cpi-pce-investment" className="scroll-mt-20 pt-11" aria-labelledby="cpi-pce-investment-title">
   <p className="text-[12px] font-bold tracking-wider text-[#3bdce7]">04 · 투자자가 기억할 점</p>
   <h2 id="cpi-pce-investment-title" className={`${sectionTitle} mt-1`}>물가가 예상보다 높으면 주식은 반드시 떨어질까?</h2>
   <p className={bodyText}>반드시 그렇지는 않습니다. 높은 물가는 금리 인하 기대를 낮추거나 채권금리에 영향을 줄 수 있지만, 실제 주가 반응에는 이미 반영된 기대, 물가의 세부 구성, 경기·고용 상황, 연준의 정책 해석이 함께 작용합니다. 한 번의 물가 발표만으로 매수·매도를 결정하기보다 흐름을 비교하는 것이 중요합니다.</p>
   <div className="mt-5 bg-[#0a293a] px-4 py-5 sm:px-5">
    <h3 className="text-[16px] font-extrabold text-white">발표 후 확인할 세 가지</h3>
    <ul className="mt-3 space-y-3 text-[13px] leading-6 text-[#cbdce8]">
     <li><strong className="text-[#e8f5f9]">물가의 방향:</strong> 한 달 반등인지, 수개월 이어지는 상승세인지 구분합니다.</li>
     <li><strong className="text-[#e8f5f9]">연준의 반응:</strong> PCE와 고용, 금리 결정 및 성명서를 함께 살펴봅니다.</li>
     <li><strong className="text-[#e8f5f9]">주가와 금리 움직임:</strong> 물가 숫자뿐 아니라 발표 이후 국채금리와 주요 지수의 반응도 확인합니다.</li>
    </ul>
   </div>
   <p className={bodyText}>ZGmini의 <a href="/inflation/" className={linkClass}>미국 인플레이션 지표</a>에서는 CPI와 PCE를 포함한 여러 물가 신호를 함께 살펴볼 수 있습니다. 금리 발표 일정과 정책 해석은 <a href="/guides/fomc/" className={linkClass}>FOMC 안내</a>에서 이어서 확인하세요. CPI·PCE 발표값 자체와 ZGmini의 종합 평가 점수는 서로 다른 자료입니다.</p>
  </section>

  <section className="pt-10" aria-labelledby="cpi-pce-faq-title">
   <h2 id="cpi-pce-faq-title" className={sectionTitle}>자주 묻는 질문</h2>
   <div className="mt-4 space-y-4">
    <div><h3 className="font-extrabold text-white">CPI와 PCE는 매달 같은 날 발표하나요?</h3><p className={bodyText}>아니요. 발표 기관과 일정이 달라 기준월이 같아도 발표 날짜는 다를 수 있습니다. 위 공식 일정에서 각각 확인하세요.</p></div>
    <div><h3 className="font-extrabold text-white">근원 CPI와 근원 PCE는 동일한 물가인가요?</h3><p className={bodyText}>둘 다 식품과 에너지를 제외하지만, 포함 범위와 지출 가중치 등 산출 방식이 달라 숫자가 같을 필요는 없습니다.</p></div>
    <div><h3 className="font-extrabold text-white">시장 예상치가 없으면 발표 결과를 어떻게 읽나요?</h3><p className={bodyText}>같은 지표의 이전 값과 수개월 추세, 세부 항목은 확인할 수 있습니다. 다만 신뢰할 만한 예상치 자료가 없으면 ‘예상 상회·하회’를 판단할 수 없습니다.</p></div>
   </div>
  </section>

  <section className="mt-10 border-t border-[#284c60] pt-5" aria-labelledby="cpi-pce-sources-title">
   <h2 id="cpi-pce-sources-title" className="text-[17px] font-extrabold text-white">공식 자료·출처</h2>
   <p className="mt-2 text-[12px] leading-6 text-[#aebfcc]">발표값·일정은 해당 기관이 제공하는 원문을 우선합니다. 이 페이지의 일정 표는 실시간 자동 갱신이 아닌 확인 시점의 자료입니다.</p>
   <ul className="mt-3 grid gap-x-4 gap-y-2 text-[13px] sm:grid-cols-2">
    <li><a href="https://www.bls.gov/schedule/news_release/cpi.htm" className={linkClass} target="_blank" rel="noopener noreferrer">BLS · CPI 공식 발표 일정 ↗</a></li>
    <li><a href="https://www.bls.gov/cpi/questions-and-answers.htm" className={linkClass} target="_blank" rel="noopener noreferrer">BLS · CPI 설명과 FAQ ↗</a></li>
    <li><a href="https://www.bea.gov/news/schedule" className={linkClass} target="_blank" rel="noopener noreferrer">BEA · PCE 공식 발표 일정 ↗</a></li>
    <li><a href="https://www.bea.gov/help/faq/555" className={linkClass} target="_blank" rel="noopener noreferrer">BEA · CPI와 PCE의 차이 ↗</a></li>
    <li><a href="https://www.federalreserve.gov/economy-at-a-glance-inflation-pce.htm" className={linkClass} target="_blank" rel="noopener noreferrer">연준 · PCE와 물가 목표 ↗</a></li>
   </ul>
  </section>
 </GuidePage>;
}
