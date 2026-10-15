import type { Metadata } from 'next';

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
  return <main style={{width:'min(760px, calc(100% - 32px))',margin:'48px auto',lineHeight:1.85,color:'#dce7f1'}}>
    <a href="/"><img src="/zgmini-name.png" alt="ZGMINI 대시보드" width={128}/></a>
    <h1 style={{fontSize:'clamp(26px, 5vw, 38px)',lineHeight:1.3}}>시장 심리와 경제 흐름을 한곳에서</h1>
    <p>ZGMINI는 미국·한국 시장의 공포·탐욕 지수와 주요 경제지표를 점수와 차트로 살펴보는 한국어 대시보드입니다. 현재 값뿐 아니라 과거 흐름을 함께 비교할 수 있습니다.</p>
    <h2>어떤 정보를 볼 수 있나요?</h2>
    <ul><li>미국·한국 시장의 공포·탐욕과 기간별 변화</li><li>물가·고용·금리·유동성 등 경제·시장 영역의 점수와 추이</li><li>아웃브레이크 관련 참고 지표의 최근 흐름</li></ul>
    <p>지표마다 사용 자료와 계산 방식이 다릅니다. 점수의 방향과 자료 관측일은 각 도움말과 상세 화면에서 확인하세요. 공개 대시보드는 무료로 볼 수 있습니다.</p>
    <h2>점수는 이렇게 활용하세요</h2>
    <p>점수는 시장 환경과 흐름을 비교하는 참고 정보입니다. 주가 상승이나 종전의 확률, 수익 보장을 뜻하지 않습니다. 자료가 아직 발표되지 않았거나 준비 중이면 해당 상태를 구분해 표시합니다.</p>
    <h2>사이트 등록 정보</h2>
    <p>ZGMINI를 소개하는 외부 디렉터리입니다. 디렉터리 등록은 지표의 정확성이나 투자 성과에 대한 인증을 의미하지 않습니다.</p>
    <div style={{display:'flex',flexWrap:'wrap',gap:16,alignItems:'center'}}>
      <a href="https://shareyourstartup.com/s/zgmini">Share Your Startup</a>
      <a href="https://www.sitelike.org/similar/zgmini.kr/">Sitelike</a>
      <a href="https://twelve.tools/zgmini-kr">Twelve Tools</a>
      <a href="https://thesaasdir.com/product/zgmini?ref=badge" rel="dofollow"><img src="https://thesaasdir.com/badge/zgmini.svg" alt="TheSaaSDir 등록 배지" width={160} height={44}/></a>
    </div>
    <p style={{fontSize:13,color:'#a8bdcc'}}>TheSaaSDir는 무료 등록을 준비 중이며, 접수·심사 및 공개 여부는 디렉터리의 실제 결과에 따라 달라집니다.</p>
    <p><a href="/">ZGMINI로 돌아가기 →</a></p>
  </main>;
}
