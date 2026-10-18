import type {Metadata} from 'next';
import MarketExplorerShell from '../../components/market-explorer-shell';
import MarketExplorer from '../../components/market-explorer';
import {WebPageJsonLd} from '../seo-jsonld';
const title='8대 위험 지표 | 인플레이션·경기침체·신용·부채 위험 - ZGmini';
const description='인플레이션, 경기 침체, 유동성 위기, 신용 위험, 실적 침체, 자산 버블, 부채 위험, 공급 충격의 저장 점수를 비교하고 상세 분석을 확인하세요.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/risk-indicators/'},openGraph:{title,description,url:'https://zgmini.kr/risk-indicators/'}};
export default function RiskIndicatorsPage(){return <MarketExplorerShell eyebrow="RISK MONITOR" title="위험 지표" description="시장의 약한 고리를 먼저 살펴보세요. 8개 위험 영역의 안정 점수와 상세 분석을 한곳에 모았습니다." count="08" label="위험 영역"><WebPageJsonLd name={title} description={description} path="/risk-indicators/"/><MarketExplorer kind="risk"/></MarketExplorerShell>}
