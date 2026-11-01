import type { ReactNode } from 'react';
import styles from './site-information.module.css';
export default function SiteInformation({title,label,lead,children}:{title:string;label:string;lead:string;children:ReactNode}){
 return <main className={styles.page}><div className={styles.content}>
  <a className={styles.brand} href="/" aria-label="ZGMINI 대시보드 홈"><img src="/zgmini-name.png" alt="ZGMINI" width={128} height={35}/></a>
  <nav className={styles.nav} aria-label="사이트 안내"><a href="/about/">ZGMINI 소개</a><a href="/usage/">이용안내</a><a href="/data-sources/">지표·데이터 출처</a><a href="/investment-notice/">투자 유의사항</a></nav>
  <p className={styles.label}>{label}</p><h1>{title}</h1><p className={styles.lead}>{lead}</p>{children}
  <p>오류 제보 및 문의: <a href="mailto:ansqhd5774@gmail.com">ansqhd5774@gmail.com</a></p><a href="/">대시보드로 돌아가기</a>
 </div></main>;
}
export function InformationSection({title,children}:{title:string;children:ReactNode}){return <section className={styles.section}><h2>{title}</h2>{children}</section>;}
