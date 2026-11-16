/** V11 display-only projection, distinct from the pinned V9 public artifact. */
import {projectV9PublicDomain,V9_METHOD,overlayV9PublicScore} from './breadth-v9-public-view.mjs';
export const V11_PUBLIC_KEY='public:breadth-v11:v1';
export const V11_METHOD='BREADTH_V11_FIXED_5F_OBSERVED_EMA3_CONTINUITY';
const SOURCE='PC_LOCAL_B1_R3_STORED_TIME_LABELED_NOT_OFFICIAL_PIT_ATTESTED';
const FACTORS=Object.freeze([
 ['F1','상승·보합 종목의 비중을 나타냅니다.','종목 상승·보합 비율'],
 ['F2','상승·보합 종목의 거래대금 비중을 나타냅니다.','상승 거래대금 비율'],
 ['F3','유효 관측 자료에서 계산한 단기 수급 흐름입니다.','단기 수급 평가'],
 ['F4','유효 관측 자료에서 계산한 중기 수급 흐름입니다.','중기 수급 평가'],
 ['F5','현재와 20회 이전 적격 관측의 종가를 비교한 비중입니다.','20회 적격 관측 비교'],
]);
const validScore=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<=100;
export function projectV11PublicDomain(){return null;}
export function overlayV11PublicScore(snapshot){return snapshot;}
