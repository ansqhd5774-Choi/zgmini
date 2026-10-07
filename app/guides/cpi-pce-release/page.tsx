import GuidePage,{guideMetadata} from '../guide-page';
import ReleaseCalendar from '../release-calendar';
import DetailReadingGuide from '../../detail-reading-guide';
const title='미국 CPI·PCE 발표시간과 예상치 대비 결과 읽는 법';
const answer='발표값과 예상치를 비교할 때는 같은 지표·기간·단위를 맞춰야 합니다. 전월 대비와 전년 대비, 전체와 근원 물가는 다른 값입니다. 공식 일정의 미국 현지 시각은 서머타임을 반영해 한국시간으로 확인하세요.';
export const metadata=guideMetadata(title,'CPI·PCE 공식 발표 일정의 한국시간, 확인된 발표값과 이전 값, 예상치 비교 방법과 단위 차이를 확인하세요.','/guides/cpi-pce-release/');
export default function Page(){return <GuidePage title={title} answer={answer}>
  <ReleaseCalendar kind="inflation"/>
  <DetailReadingGuide title="예상치 대비 결과를 비교하는 순서" sections={[
    {title:'전체·근원, 전월·전년을 먼저 맞추세요',text:'전체 CPI 전년 대비 값과 근원 CPI 전월 대비 예상치를 비교하면 의미가 없습니다. CPI와 PCE도 조사 범위와 산출 방법이 다르므로 같은 통계처럼 숫자만 비교하지 않습니다.'},
    {title:'가상 계산 예시: 발표 0.3%, 예상 0.2%',text:'동일한 지표와 기간이라면 차이는 +0.1%포인트입니다. 이 수치는 계산 설명용 가상 예시이며 실제 이번 발표값이나 시장 예상치가 아닙니다. 직전 값과 발표 전 예상치도 구분해야 합니다.'},
    {title:'예상치를 웃돌면 주식은 반드시 하락하나요?',text:'단정할 수 없습니다. 가격에 반영된 기대, 근원 물가와 구성 항목, 다른 경제 자료와 정책 해석이 함께 작용할 수 있습니다. 한 발표만으로 매수·매도 방향을 확정하지 않습니다.'},
    {title:'미국 발표시간을 한국시간으로 읽기',text:'미국 동부시간 오전 8시 30분은 서머타임 때 한국시간 같은 날 오후 9시 30분, 표준시 때 오후 10시 30분입니다. 위 일정은 각 발표 날짜의 시차를 반영했습니다. 발표 일정과 통계가 설명하는 대상 월은 서로 다릅니다.'},
    {title:'공식 발표값과 시장 예상치는 출처가 다릅니다',text:'BLS와 BEA는 공식 통계와 발표 일정을 제공합니다. 시장 예상치는 별도 조사 제공원의 집계입니다. 예상치의 출처와 조사 시점이 없으면 발표값과의 차이나 예상 상회 여부를 계산하지 않습니다.'},
  ]} sources={[{href:'https://www.bls.gov/cpi/',label:'BLS CPI 설명'},{href:'https://www.bea.gov/data/personal-consumption-expenditures-price-index',label:'BEA PCE 설명'}]} related={[{href:'/inflation/',label:'미국 물가 상세 지표'},{href:'/guides/fomc/',label:'FOMC 금리 결정 읽기'}]}/>
</GuidePage>;}
