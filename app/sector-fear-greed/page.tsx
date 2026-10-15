import type {Metadata} from 'next';
import SectorDetailCharts from './sector-detail-charts';
import './sector-detail.css';

export const metadata:Metadata={
 title:'섹터별 공포·탐욕 | 11개 섹터 비교 - ZGmini',
 description:'11개 섹터의 저장된 공포·탐욕 점수와 기간별 추이를 비교합니다.',
 alternates:{canonical:'https://zgmini.kr/sector-fear-greed/'},
};

export default function SectorFearGreedPage(){
 return <main className="zg-sector-detail">
  <div className="zg-sector-detail-inner">
   <a className="zg-sector-detail-back" href="/#strength">← 대시보드로 돌아가기</a>
   <header><h1>섹터별 공포·탐욕</h1><p>11개 섹터의 점수와 흐름을 비교하세요. 차트를 가리키거나 터치하면 같은 날짜의 점수를 함께 볼 수 있습니다.</p></header>
   <SectorDetailCharts/>
  </div>
 </main>;
}
