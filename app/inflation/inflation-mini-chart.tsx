"use client";
import "./inflation-mini-chart-r1.css";
import {cleanInflationMiniTrend,inflationMiniChartPath} from "../../lib/inflation-mini-chart-geometry.mjs";

export type InflationMiniTrendPoint={date:string;value:number;breakBefore?:boolean};

const WIDTH=112;
const HEIGHT=32;

export function InflationMiniChart({label,points,periodLabel="최근 1년"}:{label:string;points?:InflationMiniTrendPoint[];periodLabel?:string}){
 const data=cleanInflationMiniTrend(points);
 if(data.length<2)return <span className="inflation-mini-chart-empty" aria-label={`${label} ${periodLabel} 추이 자료 부족`}>—</span>;
 return <svg className="inflation-mini-chart" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`${label} ${periodLabel} 추이: ${data[0].date} ~ ${data.at(-1)?.date}`}>
  <path className="inflation-mini-chart-line" d={inflationMiniChartPath(data)}/>
 </svg>;
}
