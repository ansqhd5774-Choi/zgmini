import type {Metadata} from 'next';
import SectorSentimentChart from '../../components/sector-sentiment-chart';
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
   <SectorSentimentChart linkToDetail={false}/>
   <section className="zg-sector-detail-guide" aria-labelledby="sector-reading-title">
    <h2 id="sector-reading-title">차트 읽는 방법</h2>
    <p>0~100점으로 표시하며, 높은 점수는 탐욕 방향, 낮은 점수는 공포 방향입니다. 기간 버튼으로 비교 범위를 바꾸고, 아래 섹터 이름을 눌러 표시할 선을 선택할 수 있습니다.</p>
    <p>대시보드와 동일한 저장 데이터를 사용합니다. 결측값은 0으로 채우지 않으며, 점수는 수익률이나 미래 예측 확률이 아닙니다.</p>
   </section>
  </div>
 </main>;
}
