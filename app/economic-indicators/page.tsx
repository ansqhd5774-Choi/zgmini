import InvestorSearchGuide from '../../components/investor-search-guide';
import {ECONOMICHUB_INVESTOR_SEARCH} from '../../lib/investor-search-content';
import type {Metadata} from 'next';
import MarketExplorerShell from '../../components/market-explorer-shell';
import EconomicTerrain from '../../components/economic-terrain';
import {WebPageJsonLd} from '../seo-jsonld';
const title='미국 경제지표 12가지 | 물가·고용·금리·유동성·증시 수급 - ZGmini';
const description='미국 주식 투자에 참고하는 물가·고용·금리·채권신용·경기·소비·기업실적·유동성·자금흐름·수급·달러·원자재의 12개 시장 평가 점수와 저장 추이를 비교하세요. CPI·PCE·비농업고용·실업률·국채금리의 구성 지표와 관측일을 확인합니다.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/economic-indicators/'},openGraph:{title,description,url:'https://zgmini.kr/economic-indicators/'},twitter:{card:'summary_large_image',title,description,images:['https://zgmini.kr/zgmini-search-share.png']}};
export default function EconomicIndicatorsPage(){return <MarketExplorerShell variant="economic-terrain" eyebrow="ECONOMIC TERRAIN" title="미국 경제, 어디가 가장 약할까?" titleAccent="약할까?" description="12개 경제 지표의 안정 점수를 한눈에 비교합니다." count="12" label="경제·시장 영역" countDescription="거시경제의 흐름부터 시장의 움직임까지, 한 장의 지형도로 확인하세요."><WebPageJsonLd name={title} description={description} path="/economic-indicators/"/><EconomicTerrain/><InvestorSearchGuide id="investor-search-economic-hub" copy={ECONOMICHUB_INVESTOR_SEARCH}/></MarketExplorerShell>}
