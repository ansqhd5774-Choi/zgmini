import type {Metadata} from 'next';
import MarketExplorerShell from '../../components/market-explorer-shell';
import MarketExplorer from '../../components/market-explorer';
import {WebPageJsonLd} from '../seo-jsonld';
const title='12대 경제 지표 | 물가·고용·금리·유동성·시장 수급 - ZGmini';
const description='물가·고용·금리·채권신용·경기·소비·기업실적·유동성·자금흐름·수급·달러·원자재의 12개 시장 평가 점수와 저장 추이, 구성 지표를 비교하세요.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/economic-indicators/'},openGraph:{title,description,url:'https://zgmini.kr/economic-indicators/'}};
export default function EconomicIndicatorsPage(){return <MarketExplorerShell eyebrow="ECONOMIC PULSE" title="경제 지표" description="경제의 흐름부터 시장의 움직임까지. 12개 영역을 비교하고 각 점수를 만든 구성 지표를 펼쳐 보세요." count="12" label="경제·시장 영역"><WebPageJsonLd name={title} description={description} path="/economic-indicators/"/><MarketExplorer kind="economic"/></MarketExplorerShell>}
