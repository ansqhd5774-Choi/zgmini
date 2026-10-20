import type {Metadata} from 'next';
import SiteHeader from '@/components/site-header';
import StagflationPanel from './stagflation-panel';
const title='미국 스태그플레이션 위험 | 물가·성장·고용 분석 - ZGmini';
const description='물가 상승과 성장·고용 둔화의 동시 위험을 확인하세요. 독립 원자료 8종과 10개 신호를 활용한 안전 점수 및 최근 1년 월별 흐름입니다.';
export const metadata:Metadata={title,description,alternates:{canonical:'https://zgmini.kr/stagflation-risk/'},openGraph:{title,description,url:'https://zgmini.kr/stagflation-risk/'}};
export default function StagflationPage(){return <><SiteHeader/><main className="min-h-screen bg-[#03121d] px-4 py-8 text-slate-100 sm:px-8 sm:py-12"><div className="mx-auto max-w-6xl"><StagflationPanel/></div></main></>}
