import type { Metadata } from 'next';
import { ArrowRight, ArrowUpRight, Check, Clock3, Database, Layers3 } from 'lucide-react';
import { WebPageJsonLd } from '../seo-jsonld';
import styles from './page.module.css';

const title = '지표·데이터 출처 | ZGMINI';
const description = 'ZGMINI가 참고하는 주요 데이터 출처와 원자료·자체 점수의 차이, 관측일·발표일·갱신 시각 및 잠정치 기준을 안내합니다.';
const url = 'https://zgmini.kr/data-sources/';
const image = 'https://zgmini.kr/zgmini-share.png';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, type: 'website', siteName: 'ZGmini', images: [{ url: image, width: 1200, height: 630, alt: 'ZGMINI 지표·데이터 출처' }] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

const steps = [
  { number: '01', title: '원자료 발표', detail: '정부·공공기관 또는 자료 제공처에서 통계와 시장 자료를 공개합니다.' },
  { number: '02', title: '수집·확인', detail: '관측 기간·단위·발표 시점 등을 확인하고 이용 가능한 자료를 정리합니다.' },
  { number: '03', title: '자체 산출', detail: '각 지표의 계산 기준에 따라 데이터를 가공해 점수와 변화를 계산합니다.' },
  { number: '04', title: '화면에 표시', detail: '최신 점수와 과거 흐름을 보여주고 잠정·지연·결측 상태를 구분합니다.' },
];

const sources = [
  { acronym: 'BLS', name: '미국 노동통계국', english: 'Bureau of Labor Statistics', tag: '미국 · 공식 통계', detail: '소비자물가(CPI), 생산자물가(PPI), 고용·임금 등', url: 'https://www.bls.gov/' },
  { acronym: 'BEA', name: '미국 경제분석국', english: 'Bureau of Economic Analysis', tag: '미국 · 공식 통계', detail: '개인소비지출(PCE), 국내총생산(GDP), 소비·소득 등', url: 'https://www.bea.gov/data' },
  { acronym: 'FRED', name: '세인트루이스 연은 데이터', english: 'FRED / ALFRED', tag: '시계열 · 제공 경로', detail: '여러 기관의 경제 시계열과 과거 발표본. 원발표기관은 계열마다 다릅니다.', url: 'https://fred.stlouisfed.org/' },
  { acronym: 'EIA', name: '미국 에너지정보청', english: 'Energy Information Administration', tag: '미국 · 공식 통계', detail: '원유·휘발유·에너지 가격과 수급 자료 등', url: 'https://www.eia.gov/' },
  { acronym: 'SEC', name: '미국 증권거래위원회', english: 'EDGAR', tag: '기업 · 공시', detail: '상장기업 공시와 재무 보고서, 기업 실적 관련 자료 등', url: 'https://www.sec.gov/edgar/search/' },
  { acronym: 'ECOS', name: '한국은행 경제통계시스템', english: 'Bank of Korea ECOS', tag: '한국 · 공식 통계', detail: '국내 통화·금리·경제 통계 시계열 등', url: 'https://ecos.bok.or.kr/' },
  { acronym: 'CENSUS', name: '미국 인구조사국', english: 'U.S. Census Bureau', tag: '미국 · 공식 통계', detail: '소매판매·주택·경제활동 관련 발표 자료 등', url: 'https://www.census.gov/economic-indicators/' },
  { acronym: 'GDELT', name: '세계 사건·뉴스 데이터', english: 'GDELT Project', tag: '사건 · 보도 데이터', detail: '국제 뉴스와 사건 관측 자료. 기사 보도량은 사건 자체의 확정 사실과 다릅니다.', url: 'https://www.gdeltproject.org/' },
];

const dateTerms = [
  { title: '관측일', english: 'OBSERVED', text: '해당 데이터가 설명하는 실제 날짜·월·분기입니다.' },
  { title: '발표일', english: 'RELEASED', text: '원발표기관이 결과를 공개한 날짜입니다. 관측일보다 늦을 수 있습니다.' },
  { title: '갱신 시각', english: 'UPDATED', text: 'ZGMINI가 자료를 반영한 시점입니다. 최신 관측일과 같다는 뜻은 아닙니다.' },
  { title: '거래일', english: 'TRADING DAY', text: '시장별 거래 기준일입니다. 한국 날짜와 미국 시장 거래일은 다를 수 있습니다.' },
];

const routes = [
  { name: '8대 위험 지표', path: '/risk-indicators/', detail: '위험 평가와 구성요소' },
  { name: '12대 경제 지표', path: '/economic-indicators/', detail: '경제 원자료와 발표 주기' },
  { name: '시장 공포·탐욕', path: '/fear-greed/usa/', detail: '시장별 심리 지표' },
  { name: '섹터·테마', path: '/theme-fear-greed/', detail: 'ETF 기반 구성과 데이터 기준' },
];

export default function DataSourcesPage() {
  return (
    <main className={styles.page}>
      <WebPageJsonLd name={title} description={description} path="/data-sources/" />
      <div className={styles.content}>
        <header className={styles.header}>
          <a href="/" className={styles.brand} aria-label="ZGMINI 대시보드 홈"><img src="/zgmini-name.png" width={128} height={35} alt="ZGMINI" /></a>
          <span className={styles.eyebrow}>DATA <span aria-hidden="true">/</span> 지표·데이터 출처</span>
        </header>

        <section className={styles.hero} aria-labelledby="sources-headline">
          <p className={styles.kicker}><span className={styles.kickerLine} aria-hidden="true" /> THE DATA BEHIND THE SCORE</p>
          <h1 id="sources-headline">숫자에는 출처가 있고,<br /><span>점수에는 계산 기준이 있습니다.</span></h1>
          <p className={styles.heroLead}>ZGMINI는 여러 기관이 발표한 자료를 모아 시장의 흐름을 살펴봅니다.<br className={styles.desktopBreak} /> 원자료와 자체 계산 점수의 차이부터, 날짜와 갱신 상태까지 확인할 수 있도록 안내합니다.</p>
          <div className={styles.heroFacts} aria-label="데이터 확인 원칙">
            <span><Check size={16} strokeWidth={2.1} aria-hidden="true" /> 원자료와 자체 점수 구분</span>
            <span><Check size={16} strokeWidth={2.1} aria-hidden="true" /> 관측일·발표일 확인</span>
            <span><Check size={16} strokeWidth={2.1} aria-hidden="true" /> 지연·잠정치 표시</span>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="process-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>01 / PROCESS</p><h2 id="process-title">데이터는 이렇게 점수가 됩니다.</h2></div>
            <p>원자료를 그대로 옮긴 값과 ZGMINI가 계산한 결과는 서로 다릅니다.</p>
          </div>
          <ol className={styles.processList}>
            {steps.map((step) => <li key={step.number}>
              <span className={styles.stepNumber}>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </li>)}
          </ol>
          <p className={styles.processNote}><Layers3 size={17} aria-hidden="true" /> 자체 점수는 해당 기관의 공식 판단이나 인증이 아닙니다. 산식과 구성요소는 각 지표 상세페이지의 기준을 따릅니다.</p>
        </section>

        <section className={styles.section} aria-labelledby="providers-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>02 / SOURCES</p><h2 id="providers-title">어디에서 자료를 가져오나요?</h2></div>
            <p>ZGMINI의 지표와 수집 과정에서 참고하는 대표적인 기관·제공 경로입니다.</p>
          </div>
          <div className={styles.sourceGrid}>
            {sources.map((source) => <article key={source.acronym} className={styles.sourceItem}>
              <div className={styles.sourceTop}><span className={styles.sourceAcronym}>{source.acronym}</span><span className={styles.sourceTag}>{source.tag}</span></div>
              <h3>{source.name}</h3>
              <p className={styles.english}>{source.english}</p>
              <p className={styles.sourceDetail}>{source.detail}</p>
              <a className={styles.sourceLink} href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.name} 공식 사이트 새 창에서 열기`}>기관 사이트 <ArrowUpRight size={16} strokeWidth={1.9} aria-hidden="true" /></a>
            </article>)}
          </div>
          <p className={styles.sourceFootnote}>* 출처는 지표별로 다릅니다. 이 목록이 모든 지표의 실시간 연결이나 모든 자료의 이용 권한을 뜻하지는 않습니다. FRED는 여러 원발표기관의 자료를 제공하는 경로이므로 원출처를 별도로 확인해야 합니다.</p>
        </section>

        <section className={styles.section} aria-labelledby="dates-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>03 / DATA TIMING</p><h2 id="dates-title">같은 데이터도 날짜가 다릅니다.</h2></div>
            <p>“방금 갱신”되었다고 해서 오늘의 경제 상황을 관측한 것은 아닙니다.</p>
          </div>
          <dl className={styles.dateGrid}>
            {dateTerms.map((term) => <div className={styles.dateItem} key={term.english}>
              <dt><span>{term.english}</span><strong>{term.title}</strong></dt>
              <dd>{term.text}</dd>
            </div>)}
          </dl>
          <div className={styles.states}>
            <div><Clock3 size={23} strokeWidth={1.65} aria-hidden="true" /><h3>잠정 데이터</h3><p>아직 확정되지 않은 자료를 반영한 점수입니다. 추가 발표나 수정에 따라 바뀔 수 있으며, 차트에서는 점선 등으로 구분할 수 있습니다.</p></div>
            <div><Database size={23} strokeWidth={1.65} aria-hidden="true" /><h3>지연·결측 데이터</h3><p>발표 지연, 수집 실패 또는 이력 부족으로 값이 비어 있을 수 있습니다. 결측은 0이 아니며, 이전 정상 값이 최신 값이라는 뜻도 아닙니다.</p></div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="details-title">
          <div className={styles.sectionHeading}>
            <div><p className={styles.sectionNumber}>04 / EXPLORE</p><h2 id="details-title">실제 지표에서 확인하세요.</h2></div>
            <p>각 화면의 설명에서 입력 자료, 구성요소, 기간과 점수 기준을 확인할 수 있습니다.</p>
          </div>
          <div className={styles.routeGrid}>{routes.map((route) => <a href={route.path} className={styles.route} key={route.path}>
            <span><strong>{route.name}</strong><small>{route.detail}</small></span><ArrowUpRight size={20} strokeWidth={1.7} aria-hidden="true" />
          </a>)}</div>
          <aside className={styles.rightsNote} aria-label="원자료 이용 안내">
            <h3>자료 이용에 관한 안내</h3>
            <p>데이터 공개와 재배포 허용은 별개입니다. 외부 자료의 저작권·상업적 이용·자동 수집 조건은 원제공처마다 다르며, 출처만 표기했다고 재이용이 허용되는 것은 아닙니다. 오류가 의심된다면 페이지 주소·지표 이름·관측일을 <a href="mailto:ansqhd5774@gmail.com">이메일</a>로 알려주세요.</p>
          </aside>
        </section>

        <footer className={styles.footer}>
          <div><p>데이터를 이해했다면, 시장을 살펴볼 차례입니다.</p><h2>이제 숫자 뒤의 흐름을 보세요.</h2></div>
          <div className={styles.footerActions}>
            <a className={styles.secondaryAction} href="/usage/">이용안내 보기 <ArrowUpRight size={18} aria-hidden="true" /></a>
            <a className={styles.primaryAction} href="/">대시보드로 이동 <ArrowRight size={20} aria-hidden="true" /></a>
          </div>
        </footer>
      </div>
    </main>
  );
}
