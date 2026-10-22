import type { Metadata } from 'next';
import { WebPageJsonLd } from '../seo-jsonld';
import UsageGuide from './usage-guide';
import styles from './page.module.css';

const title = 'ZGMINI 이용안내 | 5단계 사용 가이드';
const description = 'ZGMINI의 시장 흐름, 종합 점수, 구성 지표, 기간 비교, 이용 시 주의사항을 5단계로 알아보세요.';
const url = 'https://zgmini.kr/usage/';
const image = 'https://zgmini.kr/zgmini-share.png';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: url },
  robots: { index: true, follow: true },
  openGraph: { title, description, url, type: 'website', siteName: 'ZGmini', images: [{ url: image, width: 1200, height: 630, alt: 'ZGMINI 이용안내' }] },
  twitter: { card: 'summary_large_image', title, description, images: [image] },
};

export default function UsagePage() {
  return (
    <main className={styles.page}>
      <WebPageJsonLd name={title} description={description} path="/usage/" />
      <div className={styles.content}>
        <header className={styles.header}>
          <a href="/" className={styles.brand} aria-label="ZGMINI 대시보드 홈">
            <img src="/zgmini-name.png" width={128} height={35} alt="ZGMINI" />
          </a>
          <span className={styles.eyebrow}>GUIDE <span aria-hidden="true">/</span> 이용안내</span>
        </header>
        <UsageGuide />
      </div>
    </main>
  );
}
