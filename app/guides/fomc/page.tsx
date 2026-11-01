import GuidePage,{guideMetadata} from '../guide-page';
import ReleaseCalendar from '../release-calendar';
import DetailReadingGuide from '../../detail-reading-guide';
const title="연준 금리 발표일·발표시간 | FOMC 일정·한국시간";
const answer='연준 금리 발표일·발표시간은 연방공개시장위원회(FOMC) 공식 일정과 한국시간을 기준으로 확인합니다. FOMC에서는 미국 연방기금금리 목표 범위와 통화정책 방향을 확인합니다. 금리 결정, 성명서, 기자회견을 구분해서 읽어야 합니다. 금리 인하 자체만으로 주가 상승을 확정할 수 없으며, 인하 확률은 실제 결정이나 ZGmini 평가점수와 다른 자료입니다.';
const path='/guides/fomc/';
export const metadata=guideMetadata(title,"FOMC 공식 일정과 한국시간 발표 시각, 미국 기준금리 발표일과 연준 금리 결정·성명서·기자회견을 확인하세요. 서머타임에 따른 한국 발표 날짜와 시간 차이도 안내합니다.",path);
export default function Page(){return <GuidePage title={title} answer={answer} path={path} dateModified="2026-10-25">
  <ReleaseCalendar kind="fomc"/>
  <DetailReadingGuide title="발표를 읽는 순서와 흔한 혼동" sections={[
    {title:'금리 결정과 목표 범위를 먼저 확인하세요',text:'목표 범위의 상단·하단, 직전 결정 대비 변화폭을 함께 읽습니다. 0.25%포인트는 25bp이며, 변화율 0.25%와 같은 표현이 아닙니다. 정책금리 목표 범위와 시장에서 거래되는 채권 금리도 구별합니다.'},
    {title:'성명서와 기자회견은 별도로 읽으세요',text:'같은 금리 결정이라도 경제·물가·고용 평가와 향후 정책 설명이 달라질 수 있습니다. 발표 직후 금리 숫자만 확인하기보다 공식 성명과 기자회견 자료를 함께 확인합니다.'},
    {title:'한국시간은 날짜가 넘어갈 수 있습니다',text:'미국 동부시간 오후 2시의 금리 결정은 서머타임 때 한국시간 다음 날 오전 3시, 표준시 때 오전 4시입니다. 오후 2시 30분 기자회견도 다음 날입니다. 미국 회의 날짜와 한국 발표 날짜를 구분하세요.'},
    {title:'점도표는 모든 회의에 나오나요?',text:'경제전망 요약이 함께 제공되는 회의는 연준 공식 달력에 별표로 표시됩니다. 점도표는 참가자의 정책 전망이며 향후 결정을 확정한 일정표나 시장의 인하 확률이 아닙니다.'},
    {title:'금리 인하 확률은 현재 제공하나요?',text:'이 페이지는 검증된 확률 제공원을 연결하지 않아 금리 인하 확률을 제공하지 않습니다. 실제 금리 결정, 시장 예상, ZGmini의 금리·경기 평가점수는 각각 다른 정보이며 대신 표시하지 않습니다.'},
  ]} sources={[{href:'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',label:'연준 회의·성명·전망 공식 자료'}]} related={[{href:'/inflation/',label:'미국 물가 상세'},{href:'/recession/',label:'미국 경기침체 지표'},{href:'/guides/cpi-pce-release/',label:'CPI·PCE 발표 해석'}]}/>
</GuidePage>;}
