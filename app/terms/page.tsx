import type {Metadata} from "next";
import {WebPageJsonLd} from "../seo-jsonld";
import styles from "../data-sources/page.module.css";

const title="FRED API 이용조건 | ZGMINI";
const description="ZGMINI가 FRED API를 이용하는 기능에서 적용되는 출처와 이용조건, 비후원 고지를 안내합니다.";
export const metadata:Metadata={
 title,description,alternates:{canonical:"https://zgmini.kr/terms/"},
};

export default function TermsPage(){
 return <main className={styles.page}>
  <WebPageJsonLd name={title} description={description} path="/terms/"/>
  <div className={styles.content}>
   <header className={styles.header}><a href="/" className={styles.brand}>ZGMINI</a><span className={styles.eyebrow}>FRED API 이용조건</span></header>
   <section className={styles.section} aria-labelledby="terms-heading">
    <div className={styles.sectionHeading}><div><p className={styles.sectionNumber}>SOURCE TERMS</p><h1 id="terms-heading">FRED API 이용조건</h1></div></div>
    <p className={styles.processNote}>This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis.</p>
    <aside className={styles.rightsNote}>
     <h2>FRED API 이용자 동의</h2>
     <p>ZGMINI 서비스를 이용하면 이용자는 <a href="https://fred.stlouisfed.org/docs/api/terms_of_use.html" target="_blank" rel="noopener noreferrer">FRED® API Terms of Use</a>의 적용을 받으며 해당 약관을 준수하는 데 동의합니다.</p>
     <p>FRED는 여러 원발표기관의 자료를 제공하는 경로입니다. 개별 시계열의 이용 권한·상업적 재사용 조건은 원자료 소유자의 정책에 따라 별도로 적용됩니다. ZGMINI가 계산한 파생 점수는 해당 기관의 공식 점수나 승인·추천을 뜻하지 않습니다.</p>
    </aside>
   </section>
   <footer className={styles.footer}><div><p>원자료 출처와 이용 조건을 확인하세요.</p></div><a className={styles.primaryAction} href="/data-sources/">지표·데이터 출처</a></footer>
  </div>
 </main>;
}
