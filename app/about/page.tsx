import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';
import {WebPageJsonLd} from '../seo-jsonld';
import styles from './about.module.css';

const title='ZGMINI 소개 | 시장 심리와 경제지표';
const description='미국·한국 시장 심리와 경제지표의 점수 및 과거 흐름을 함께 살펴보는 ZGMINI를 소개합니다.';
const url='https://zgmini.kr/about/';
const image='https://zgmini.kr/zgmini-share.png';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, type: 'website', siteName: 'ZGmini', images: [{url:image,width:1200,height:630,alt:'ZGMINI 소개 · 시장 심리와 경제지표'}] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

export default function AboutPage() {
  return (
    <main className={styles.page}>
      <WebPageJsonLd name={title} description={description} path="/about/"/>
      <div className={styles.content}>
        <header className={styles.header}>
          <a href="/" className={styles.brand} aria-label="ZGMINI 대시보드 홈"><img src="/zgmini-name.png" width={128} height={35} alt="ZGMINI" /></a>
          <span className={styles.eyebrow}>ABOUT <span aria-hidden="true">/</span> 개발자 소개</span>
        </header>

        <section className={styles.hero} aria-labelledby="about-headline">
          <img className={styles.heroArtwork} src="/about-market-ambient.png" width={887} height={444} alt="" aria-hidden="true" />
          <div className={styles.heroCopy}>
            <p className={styles.hello}>안녕하세요, ZGMINI 개발자입니다.</p>
            <h1 id="about-headline">제가 편하자고<br />만든 사이트입니다. <span role="img" aria-label="웃는 얼굴">😄</span></h1>
            <p className={styles.lead}>복잡한 경제 이슈와 시장의 흐름을 매일 따라가다 보면,<br className={styles.desktopBreak}/> 필요한 정보를 찾고 정리하는 데 많은 시간과 노력이 듭니다.<br className={styles.desktopBreak}/> 그래서 저처럼 고민하는 분들에게 작은 도움이 되고 싶어 ZGMINI를 만들었습니다.</p>
          </div>
        </section>

        <section className={styles.questions} aria-label="개발자 이야기" id="usage">
          <div className={styles.qaRow}>
            <h2 className={styles.question}><span className={styles.qmark} aria-hidden="true">Q.</span> 언제부터 투자하셨나요?</h2>
            <div className={styles.answer}>
              <p>2016년부터 주식 투자를 시작했습니다. 공부할수록 확인하고 기억해야 할 정보가 많다는 것을 알게 됐고, 같은 뉴스와 경제지표도 사람마다 해석하는 방법이 달랐습니다.</p>
              <p>주식을 깊게 이해하려 할수록 분석하고 해석하는 시간이 늘어나 하루가 부족할 정도였습니다.</p>
            </div>
          </div>
          <div className={styles.qaRow}>
            <h2 className={styles.question}><span className={styles.qmark} aria-hidden="true">Q.</span> 왜 ZGMINI를 만들었나요?</h2>
            <div className={styles.answer}>
              <p>여러 시장 정보와 경제지표를 경제학적 산식에 반영하고 점수로 환산하면 조금 더 쉽게 해석할 수 있을 거라 생각했습니다.</p>
              <p>어려운 용어를 이해하는 것도 쉽지 않은데, 지표 사이의 상관관계까지 분석하는 건 초보 투자자에게 특히 어렵습니다. 물론 저에게도 여전히 어려운 일입니다.</p>
            </div>
          </div>
          <div className={styles.qaRow}>
            <h2 className={styles.question}><span className={styles.qmark} aria-hidden="true">Q.</span> 어떻게 더 좋아질 수 있나요?</h2>
            <div className={styles.answer}>
              <p>저처럼 필요하신 분들은 편하게 사용해 주세요. 원하는 기능이 있거나 점수가 실제 시장 상황과 다르거나 왜곡되었다고 느끼는 부분이 있다면 언제든지 채팅창에 의견을 남겨주세요.</p>
              <p>여러분의 의견을 참고해 조금씩 더 고도화하겠습니다.</p>
            </div>
          </div>
        </section>

        <footer className={styles.footer}>
          <h2>여러분 모두 부자 되세요! <span role="img" aria-label="돈주머니">💰</span></h2>
          <p>ZGMINI 개발자 드림</p>
          <a className={styles.dashboardLink} href="/">시장 대시보드 보기 <ArrowRight size={21} strokeWidth={1.8} aria-hidden="true" /></a>
        </footer>

        <details className={styles.details}>
          <summary>데이터 이용 및 사이트 안내</summary>
          <div className={styles.detailsContent}>
            <h2 id="data-sources"><a href="/data-sources/">지표·데이터 출처 자세히 보기</a></h2>
            <p>지표마다 사용 자료와 계산 방식이 다릅니다. 점수의 방향과 자료 관측일은 각 도움말과 상세 화면에서 확인하세요. 공개 대시보드는 무료로 볼 수 있습니다.</p>
            <p>각 상세페이지의 입력지표·방법론·출처 안내에서 해당 지표의 기준을 확인하세요. 관측일과 발표일은 다를 수 있으며, 잠정치는 추가 자료가 반영되면 달라질 수 있습니다.</p>
            <h2 id="investment-notice"><a href="/investment-notice/">투자 유의사항 자세히 보기</a></h2>
            <p>점수는 시장 환경과 흐름을 비교하는 참고 정보입니다. 주가 상승이나 종전의 확률, 수익 보장을 뜻하지 않습니다. 자료가 아직 발표되지 않았거나 준비 중이면 해당 상태를 구분해 표시합니다.</p>
            <h2>사이트 등록 정보</h2>
            <p>ZGMINI를 소개하는 외부 디렉터리입니다. 디렉터리 등록은 지표의 정확성이나 투자 성과에 대한 인증을 의미하지 않습니다.</p>
            <div className={styles.externalLinks}>
              <a href="https://shareyourstartup.com/s/zgmini">Share Your Startup</a>
              <a href="https://www.sitelike.org/similar/zgmini.kr/">Sitelike</a>
              <a href="https://twelve.tools/zgmini-kr">Twelve Tools</a>
            </div>
          </div>
        </details>
      </div>
    </main>
  );
}
