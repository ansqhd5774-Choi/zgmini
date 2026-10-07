import GuidePage,{guideMetadata} from '../guide-page';
import DetailReadingGuide from '../../detail-reading-guide';
const title='공포탐욕지수 매수 기준: 지금 주식 사도 될까?';
const answer='공포탐욕지수가 낮다는 이유만으로 매수를 결정할 수 없습니다. 지수는 시장 심리를 설명하며, 바닥 가격이나 이후 수익률을 보장하지 않습니다. 대상 시장·관측일·점수 흐름을 확인하고 투자 기간과 손실 감내 범위를 함께 판단해야 합니다.';
export const metadata=guideMetadata(title,'공포탐욕지수를 매수 신호로 사용할 때의 한계, 가상 상황별 해석, 한국과 미국 지수의 차이를 확인하세요.','/guides/fear-greed-buying/');
export default function Page(){return <GuidePage title={title} answer={answer}>
  <DetailReadingGuide title="점수 하나보다 먼저 확인할 세 가지" sections={[
    {title:'1. 어떤 시장을 설명하는 지수인가요?',text:'미국 상세는 CNN 제공 지수, 한국 상세는 ZGmini 자체 지표입니다. 서로 다른 시장과 자료를 사용하므로 같은 점수를 같은 매수 조건으로 해석하지 않습니다. 비트코인이나 나스닥 전용 공포탐욕지수로 대신 사용하지 마세요.'},
    {title:'2. 낮은 점수가 계속 낮아질 수 있나요?',text:'가능합니다. 심리가 위축돼도 원인이 해소되지 않으면 가격 하락이나 변동성이 이어질 수 있습니다. 하루 점수만 보지 말고 여러 관측일의 흐름과 물가·경기·신용 자료를 함께 확인합니다.'},
    {title:'3. 내 투자 조건과 맞나요?',text:'투자 기간, 자금 사용 시점, 손실 감내 범위는 지수와 별개의 조건입니다. 이 사이트는 특정 점수에서의 매수 수익률을 검증한 전략이나 개인별 매매 지시를 제공하지 않습니다.'},
  ]} sources={[{href:'https://www.cnn.com/markets/fear-and-greed',label:'CNN 공포탐욕지수 원문'}]} related={[{href:'/fear-greed/usa/',label:'미국 공포탐욕지수 현재값'},{href:'/fear-greed/korea/',label:'한국 공포탐욕지수 현재값'},{href:'/credit-risk/',label:'신용 위험 상세'}]}/>
  <section className="mt-10 space-y-4"><h2 className="text-xl font-bold text-white">상황별 해석 예시</h2>
    <p>아래는 이해를 위한 가상 상황이며 실제 과거 수익률 검증 결과가 아닙니다.</p>
    <div className="space-y-3">
      <p><strong>점수가 낮고 신용 여건도 악화되는 경우:</strong> 공포가 크다는 사실만으로 위험이 해소됐다고 판단하지 않습니다. 두 자료의 관측일과 악화 원인을 확인합니다.</p>
      <p><strong>점수가 회복되지만 물가 불확실성이 남은 경우:</strong> 투자심리 회복과 경제 여건의 개선을 구별합니다. 점수 상승만으로 금리 인하나 주가 상승을 확정하지 않습니다.</p>
      <p><strong>점수가 높은 경우:</strong> 곧 하락한다는 뜻은 아닙니다. 기존 투자 비중과 가격 부담을 따로 점검할 수 있지만 점수 하나로 전량 매도 규칙을 만들 수는 없습니다.</p>
    </div>
  </section>
</GuidePage>;}
