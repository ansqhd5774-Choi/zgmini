import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, Check, CircleHelp, Clock3, FileSearch, ShieldAlert } from 'lucide-react';
import { WebPageJsonLd } from '../seo-jsonld';
import styles from './page.module.css';

const title = '투자 유의사항 | ZGMINI';
const description = 'ZGMINI 점수의 해석 한계, 잠정치와 데이터 지연, 과거 차트 수정 가능성 및 투자 판단 시 확인할 사항을 안내합니다.';
const url = 'https://zgmini.kr/investment-notice/';
const image = 'https://zgmini.kr/zgmini-share.png';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, type: 'website', siteName: 'ZGmini', images: [{ url: image, width: 1200, height: 630, alt: 'ZGMINI 투자 유의사항' }] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

const misconceptions = [
  { number: '01', label: '높은 점수', headline: '매수 신호가 아닙니다.', detail: '시장 분위기가 긍정적이어도 주가가 반드시 오르는 것은 아닙니다. 점수는 향후 수익률을 예측하거나 보장하지 않습니다.' },
  { number: '02', label: '위험 점수', headline: '사건 발생 확률이 아닙니다.', detail: '경기침체·신용 위험·전쟁 관련 점수는 해당 페이지가 정의한 신호를 요약합니다. 실제 사건의 확률과는 다릅니다.' },
  { number: '03', label: '과거 차트', headline: '미래를 약속하지 않습니다.', detail: '과거 패턴이 비슷해도 시장 환경은 달라질 수 있습니다. 역사적 흐름과 계산 결과만으로 미래 성과를 확정할 수 없습니다.' },
];

const checklist = [
  { number: '01', title: '점수의 뜻부터 확인', detail: '공포·탐욕, 경제지표, 위험지표의 점수 방향과 산식은 서로 다릅니다. 해당 지표의 설명을 먼저 읽어보세요.' },
  { number: '02', title: '정보가 언제의 것인지 확인', detail: '관측일·발표일·갱신 시각과 잠정 여부를 함께 확인하세요. 방금 갱신된 화면도 과거 발표 자료를 담을 수 있습니다.' },
  { number: '03', title: '다른 근거와 교차 확인', detail: '기업의 공식 공시, 실적, 가격·거래 상황과 최신 뉴스 등 독립적인 자료를 함께 살펴보세요.' },
  { number: '04', title: '나의 투자 조건을 적용', detail: '투자 기간, 자금 여력, 손실 감내 범위, 분산 정도, 거래 비용을 고려해 직접 판단하세요.' },
];

export default function InvestmentNoticePage() {
  return (
    <main className={styles.page}>
      <WebPageJsonLd name={title} description={description} path="/investment-notice/" />
      <div className={styles.content}>
        <header className={styles.header}>
          <a className={styles.brand} href="/" aria-label="ZGMINI 대시보드 홈"><img src="/zgmini-name.png" width={128} height={35} alt="ZGMINI" /></a>
          <span className={styles.eyebrow}>NOTICE <span aria-hidden="true">/</span> 투자 유의사항</span>
        </header>

        <section className={styles.hero} aria-labelledby="notice-headline">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}>INVEST WITH CONTEXT <span aria-hidden="true" /> 01</p>
            <h1 id="notice-headline">점수는 판단을 돕지만,<br /><span>결정을 대신하지 않습니다.</span></h1>
            <p className={styles.heroLead}>ZGMINI는 복잡한 시장과 경제 정보를 쉽게 살펴보기 위한 도구입니다.<br className={styles.desktopBreak} /> 좋은 투자 판단을 위해서는 숫자의 의미만큼 그 한계도 알아두는 것이 중요합니다.</p>
          </div>
          <aside className={styles.heroPanel} aria-label="ZGMINI 투자 정보의 성격">
            <div className={styles.panelTop}><span>ZGMINI / READ THIS FIRST</span><CircleHelp size={17} strokeWidth={1.6} aria-hidden="true" /></div>
            <p className={styles.panelMark}>정보 <span>≠</span> 투자 권유</p>
            <p className={styles.panelText}>점수·차트·설명은 참고 자료입니다.<br />특정 종목의 매수·매도 추천이나 개인별 맞춤 투자 자문이 아닙니다.</p>
            <div className={styles.panelBottom}><Check size={16} strokeWidth={2} aria-hidden="true" /> 최종 판단은 투자자 본인이 합니다.</div>
          </aside>
        </section>

        <section className={styles.section} aria-labelledby="meaning-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>01 / UNDERSTAND</p><h2 id="meaning-title">이 세 가지는 꼭 구분해 주세요.</h2></div>
            <p>같은 점수도 지표마다 뜻이 다릅니다. 하나의 숫자를 매매 신호로 해석하지 마세요.</p>
          </div>
          <div className={styles.misconceptions}>
            {misconceptions.map((item) => <article key={item.number} className={styles.misconception}>
              <span className={styles.cardNumber}>{item.number} / {item.label}</span>
              <h3>{item.headline}</h3>
              <p>{item.detail}</p>
            </article>)}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="checklist-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>02 / CHECK BEFORE INVESTING</p><h2 id="checklist-title">매매를 결정하기 전, 4가지를 확인하세요.</h2></div>
            <p>점수는 출발점일 뿐입니다. 실제 투자 결정에는 더 많은 정보가 필요합니다.</p>
          </div>
          <ol className={styles.checklist}>
            {checklist.map((item) => <li key={item.number}>
              <span className={styles.checkNumber}>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.detail}</p>
            </li>)}
          </ol>
          <a className={styles.inlineLink} href="/usage/">ZGMINI 이용 방법 알아보기 <ArrowUpRight size={17} strokeWidth={1.8} aria-hidden="true" /></a>
        </section>

        <section className={styles.section} aria-labelledby="data-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>03 / DATA LIMITATIONS</p><h2 id="data-title">자료와 차트에도 한계가 있습니다.</h2></div>
            <p>시장 정보는 갱신 시점과 자료 확보 상황에 따라 달라질 수 있습니다.</p>
          </div>
          <div className={styles.limits}>
            <div className={styles.limit}><Clock3 size={24} strokeWidth={1.65} aria-hidden="true" /><h3>잠정치·데이터 지연</h3><p>일부 자료가 아직 발표되지 않았거나 수집이 늦을 수 있습니다. 잠정 점수는 추가 발표에 따라 바뀌며, 결측은 0이 아닙니다.</p></div>
            <div className={styles.limit}><FileSearch size={24} strokeWidth={1.65} aria-hidden="true" /><h3>원자료·과거 기록 수정</h3><p>통계 개정, 자료 정정, 계산 기준 변경으로 과거 점수와 차트가 바뀔 수 있습니다. 이전에 표시된 값과 현재 조회 값이 항상 같지는 않습니다.</p></div>
            <div className={styles.limit}><ShieldAlert size={24} strokeWidth={1.65} aria-hidden="true" /><h3>예상과 실제 결과의 차이</h3><p>시장의 갑작스러운 사건, 거래 조건과 개인별 위험은 점수 하나에 모두 담기지 않습니다. 원금 손실 가능성과 비용을 따로 고려해야 합니다.</p></div>
          </div>
          <div className={styles.dataGuide}><span>자료가 궁금하다면</span><p>기관의 원문, 관측일과 ZGMINI의 계산 결과는 <a href="/data-sources/">지표·데이터 출처</a>에서 구분해 확인할 수 있습니다.</p></div>
        </section>

        <section className={styles.conclusion} aria-labelledby="conclusion-title">
          <p className={styles.sectionNumber}>04 / YOUR DECISION</p>
          <h2 id="conclusion-title">시장을 이해하는 데 활용하고,<br /><span>투자 판단은 충분한 검증 뒤에 하세요.</span></h2>
          <p>ZGMINI는 정보 제공을 목적으로 하며 투자 수익을 보장하지 않습니다. 투자에는 원금 손실 위험이 있습니다. 제공된 자료가 본인의 투자 목적이나 재무상황에 적합한지는 직접 판단해야 합니다.</p>
          <a className={styles.educationLink} href="https://www.investor.gov/research-you-invest" target="_blank" rel="noopener noreferrer">투자자 교육 자료 참고 · Investor.gov <ArrowUpRight size={16} strokeWidth={1.8} aria-hidden="true" /></a>
        </section>

        <footer className={styles.footer}>
          <div><p>시장 정보는 도구, 최종 결정은 나의 몫.</p><h2>차분하게 확인하고 투자하세요.</h2></div>
          <a href="/" className={styles.dashboardLink}>대시보드로 돌아가기 <ArrowRight size={20} strokeWidth={1.8} aria-hidden="true" /></a>
        </footer>
      </div>
    </main>
  );
}
