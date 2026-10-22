import './site-footer.css';

export default function SiteFooter(){
 return <footer className="zg-footer zg-site-footer">
  <nav className="zg-footer-links" aria-label="사이트 안내">
   <a href="/about/">ZGMINI 소개</a>
   <a href="/about/#usage">이용안내</a>
   <a href="/about/#data-sources">지표·데이터 출처</a>
   <a href="/about/#investment-notice">투자 유의사항</a>
   <a href="mailto:ansqhd5774@gmail.com">문의</a>
  </nav>
  <p className="zg-footer-notice">ZGMINI의 지표는 참고용 정보이며 투자 권유가 아닙니다. 잠정치는 추가 자료에 따라 변경될 수 있으며, 데이터가 지연되거나 오류가 발생할 수 있습니다.</p>
  <p className="zg-footer-copyright">© ZGMINI</p>
  <div className="zg-footer-badges" aria-label="외부 디렉터리 등록 배지">
   <a href="https://twelve.tools" target="_blank" rel="noopener"><img src="https://twelve.tools/badge0-white.svg" alt="Twelve Tools 등록 배지" width={148} height={40}/></a>
   <a href="https://thesaasdir.com/product/zgmini?ref=badge" rel="dofollow"><img src="https://thesaasdir.com/badge/zgmini.svg" alt="Featured on TheSaaSDir" width={182} height={46}/></a>
  </div>
 </footer>;
}
