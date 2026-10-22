import type { Metadata } from 'next';
import SiteInformation,{InformationSection as Section} from '../../components/site-information';
import {WebPageJsonLd} from '../seo-jsonld';
const title='투자 유의사항 | ZGMINI';
const description='ZGMINI 점수의 해석 한계, 잠정치와 데이터 지연, 과거 차트 수정 가능성 및 투자 판단 시 확인할 사항을 안내합니다.';
const url='https://zgmini.kr/investment-notice/';
export const metadata:Metadata={title,description,alternates:{canonical:url},openGraph:{title,description,url,type:'website'},twitter:{card:'summary',title,description}};
export default function InvestmentNoticePage(){return <><WebPageJsonLd name={title} description={description} path="/investment-notice/"/><SiteInformation title="투자 유의사항" label="INVESTMENT NOTICE" lead="ZGMINI는 시장 환경을 이해하기 위한 참고 정보를 제공합니다. 점수 하나만으로 투자 결정을 내리지 마세요.">
 <Section title="투자 권유나 수익 보장이 아닙니다"><p>점수·차트·설명은 일반적인 정보 제공을 위한 것으로, 특정 금융상품의 매수·매도 추천이나 개인의 재무상황을 고려한 맞춤 투자 자문이 아닙니다. 투자에는 원금 손실이 발생할 수 있습니다.</p><p>높은 점수가 향후 수익이나 가격 상승을 보장하지 않으며, 낮은 점수가 곧 매도 시점이라는 뜻도 아닙니다. 투자 결정과 그 결과는 이용자 본인이 판단해야 합니다.</p></Section>
 <Section title="점수의 방향과 의미"><p>공포·탐욕, 경제 상황, 위험 신호는 서로 다른 개념입니다. 같은 숫자라도 지표별 의미와 평가 방향이 다를 수 있으므로 상세페이지의 설명과 방법론을 확인하세요.</p><p>공포·탐욕 점수는 상승 확률이 아니며, 위험 점수도 사건 발생 확률을 직접 뜻하지 않습니다. 여러 지표가 비슷한 원자료를 사용할 수 있어 완전히 독립적인 근거로 볼 수 없습니다.</p></Section>
 <Section title="잠정치는 바뀔 수 있습니다"><p>새 자료가 일부 반영된 잠정치는 이후 발표, 추가 수집, 원자료 개정에 따라 달라질 수 있습니다. 확정 여부와 입력자료의 관측 시점을 함께 확인하세요.</p><p>아직 발표되지 않은 통계나 실시간으로 제공되지 않는 자료가 포함될 수 있습니다. 현재 시장의 모든 변화를 즉시 반영한다고 가정하지 마세요.</p></Section>
 <Section title="데이터 지연과 과거 이력의 한계"><p>공급자 장애, 수집·계산 오류, 휴장일, 발표 일정 변경 등으로 정보가 지연되거나 누락될 수 있습니다. 마지막 정상 값이 남아 있는 경우 기준일을 확인하고 공식 원문과 대조하세요.</p><p>원자료 개정이나 방법론 변경으로 과거 점수와 차트가 수정될 수 있습니다. 과거 흐름과 검증 결과는 미래 성과를 보장하지 않으며 거래 비용·세금·체결 가능성을 모두 반영하는 것도 아닙니다.</p></Section>
 <Section title="투자 전 확인할 사항"><ul><li>지표의 기준일, 잠정치 여부와 갱신 상태</li><li>공식 발표·공시와 실제 거래 조건</li><li>본인의 투자 기간, 손실 감내 수준과 자산 집중도</li><li>지표와 실제 시장 움직임이 다를 때 다른 자료와 원인</li></ul><p>사용 방법은 <a href="/usage/">이용안내</a>, 자료 기준은 <a href="/data-sources/">지표·데이터 출처</a>에서 확인하세요.</p></Section>
 </SiteInformation></>;}
