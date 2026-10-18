import type {Metadata} from 'next';
import MarketExplorerShell from '../../components/market-explorer-shell';
import ThemeExplorer from './theme-explorer';
import {WebPageJsonLd} from '../seo-jsonld';
const title='테마별 공포·탐욕 | AI·로봇·에너지·바이오 투자 테마 - ZGmini';
const description='AI 반도체·로봇·우주·에너지·바이오 등 30개 투자 테마를 탐색하세요. 테마 공포·탐욕 점수는 검증된 저장 데이터 연결을 준비 중입니다.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/theme-fear-greed/'},openGraph:{title,description,url:'https://zgmini.kr/theme-fear-greed/'},twitter:{card:'summary_large_image',title,description,images:['https://zgmini.kr/zgmini-search-share.png']}};
export default function ThemeFearGreedPage(){return <MarketExplorerShell eyebrow="THEME SENTIMENT" title="테마 공포·탐욕" description="산업을 가로지르는 투자 이야기. AI·모빌리티·에너지·헬스케어의 30개 테마를 탐색하세요." count="30" label="탐색 테마"><WebPageJsonLd name={title} description={description} path="/theme-fear-greed/"/><ThemeExplorer/></MarketExplorerShell>}
