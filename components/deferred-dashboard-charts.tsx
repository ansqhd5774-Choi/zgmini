'use client';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {useDashboardChartStartup} from '../hooks/use-dashboard-chart-startup';
const SectorSentimentChart=lazy(()=>import('./sector-sentiment-chart'));
const ThemeSentimentDashboardChart=lazy(()=>import('./theme-sentiment-dashboard-chart'));

export default function DeferredDashboardCharts(){
 const chartReady=useDashboardChartStartup();
 const ref=useRef<HTMLDivElement>(null),[ready,setReady]=useState(false);
 useEffect(()=>{
  if(!chartReady||!ref.current)return;
  if(!('IntersectionObserver' in window)){setReady(true);return;}
  const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'200px'});
  observer.observe(ref.current);return()=>observer.disconnect();
 },[chartReady]);
 const placeholder=<><div style={{height:232}} aria-label="섹터별 공포·탐욕 차트 준비 중"/><div style={{height:232}} aria-label="테마별 공포·탐욕 차트 준비 중"/></>;
 return <div ref={ref} id="strength" className="zg-strength-grid">{ready?<Suspense fallback={placeholder}><SectorSentimentChart showProvisionalNotice={false}/><ThemeSentimentDashboardChart/></Suspense>:placeholder}</div>;
}
