import type { Metadata } from 'next';
import SiteInformation,{InformationSection as Section} from '../../components/site-information';
import {WebPageJsonLd} from '../seo-jsonld';
const title='지표·데이터 출처 | ZGMINI';
const description='ZGMINI의 원자료와 자체 점수의 차이, 지표별 출처 확인 방법, 관측일·발표일·갱신 및 잠정치 기준을 안내합니다.';
const url='https://zgmini.kr/data-sources/';
export const metadata:Metadata={title,description,alternates:{canonical:url},openGraph:{title,description,url,type:'website'},twitter:{card:'summary',title,description}};
export default function DataSourcesPage(){return <><WebPageJsonLd name={title} description={description} path="/data-sources/"/><SiteInformation title="지표·데이터 출처" label="DATA & METHODOLOGY" lead="자료의 출처와 ZGMINI가 계산한 점수를 구분하고, 날짜와 갱신 상태를 함께 확인하세요.">
 <Section title="원자료와 자체 점수"><p>경제 통계·시장 가격 등은 외부 기관과 공급자의 자료입니다. ZGMINI 자체 지표는 각 상세페이지의 입력자료와 방법론으로 계산한 결과이며, 원자료 제공기관의 공식 평가나 인증을 뜻하지 않습니다.</p><p>외부 지수를 참고해 표시하는 화면은 해당 화면의 출처 안내를 확인하세요. 모든 화면이 같은 산식이나 공급자를 사용하는 것은 아닙니다.</p></Section>
 <Section title="지표별 출처 확인"><ul><li><a href="/risk-indicators/">위험 지표</a>: 상세페이지의 입력지표·평가 축·방법론에서 계산 근거를 확인하세요.</li><li><a href="/economic-indicators/">경제 지표</a>: 원자료의 단위, 관측 기간, 발표 주기와 출처를 확인하세요.</li><li><a href="/fear-greed/usa/">미국 시장</a> · <a href="/fear-greed/korea/">한국 시장</a>: 각 시장 화면의 출처와 구성요소를 확인하세요.</li><li><a href="/sector-fear-greed/">섹터</a> · <a href="/theme-fear-greed/">테마 공포·탐욕</a>: 대상 자산과 해당 화면의 방법론·자료 기준을 확인하세요.</li></ul><p>출처와 방법론은 지표별로 다르며 변경될 수 있습니다. 개별 지표의 현재 상세 안내를 우선합니다.</p></Section>
 <Section title="관측일·발표일·갱신 시각"><ul><li><strong>관측일·기준월</strong>: 자료가 설명하는 실제 시점이나 기간입니다.</li><li><strong>발표일</strong>: 기관이 자료를 공개한 날짜로, 관측 기간과 다를 수 있습니다.</li><li><strong>수집·갱신 시각</strong>: 시스템이 자료를 받아 반영한 시각입니다. 최신 관측일과 같다는 뜻은 아닙니다.</li><li><strong>시장 거래일</strong>: 해당 시장 기준입니다. 한국 날짜와 미국 거래일은 다를 수 있습니다.</li></ul></Section>
 <Section title="잠정치와 갱신 지연"><p>잠정치는 당시 확보된 입력자료와 해당 지표의 계산 기준으로 산출한 값입니다. 후속 발표나 원자료 수정에 따라 달라질 수 있으므로 확정된 값과 구분해 보세요.</p><p>공급자 점검, 발표 지연, 수집 실패 또는 이력 부족으로 일부 정보가 늦거나 표시되지 않을 수 있습니다. 이전 정상 자료가 유지되더라도 최신 자료라는 뜻은 아닙니다. 관측일과 상태 표시를 확인하세요. 결측은 숫자 0과 다릅니다.</p></Section>
 <Section title="자료 이용과 오류 제보"><p>사이트에서 자료를 볼 수 있다는 사실이 원자료의 재배포·판매·자동 수집 권리를 부여하지는 않습니다. 외부 자료의 이용 조건은 각 제공기관과 공급자의 약관을 따릅니다. 출처 표기만으로 모든 상업적 재이용이 허용되는 것은 아닙니다.</p><p>계산 방식이나 출처가 궁금하거나 오류가 의심되면 페이지 주소, 지표 이름, 관측일을 문의 메일로 알려주세요.</p></Section>
 </SiteInformation></>;}
