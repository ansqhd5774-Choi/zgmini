"use client";

import {useEffect, useId, useMemo, useState, type PointerEvent as ReactPointerEvent, type KeyboardEvent as ReactKeyboardEvent} from "react";
import type {MarketPeriod} from "./market-card-shared";
import {getMarketPeriodDays} from "./market-card-shared";
import styles from "./market-breadth-strip.module.css";

/**
 * Whole-US MarketParquet PAID confirmed breadth. This component only consumes
 * percent-only verified public GETs. It must never synthesize stock counts or
 * fall back to retired free/IEX R1/R2 snapshots.
 */
type Period = MarketPeriod | "1D";
type Point = {date:string; risingPct:number; unchangedPct:number; fallingPct:number};
type PaidCurrent = {
  status:"READY"; market:"usa"; phase:"CONFIRMED";
  source:"MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY";
  observationDate:string; current:Point;
};
type PaidHistory = PaidCurrent & {
  points:Point[]; firstDate:string; lastDate:string; historyComplete:boolean;
};
const day=(x:unknown):x is string=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x)
  &&Number.isFinite(Date.parse(x+"T00:00:00Z"))
  &&new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const percent=(x:unknown):x is number=>typeof x==="number"
  &&Number.isFinite(x)&&x>=0&&x<=100;
const checkedPoint=(x:unknown):x is Point=>{
  if(!x||typeof x!=="object")return false;
  const p=x as Point;
  return day(p.date)&&percent(p.risingPct)&&percent(p.unchangedPct)
    &&percent(p.fallingPct)&&Math.abs(p.risingPct+p.unchangedPct+p.fallingPct-100)<1e-7;
};
const checkedCurrent=(x:unknown):x is PaidCurrent=>{
  if(!x||typeof x!=="object")return false;
  const v=x as PaidCurrent;
  return v.market==="usa"&&v.status==="READY"&&v.phase==="CONFIRMED"
    &&v.source==="MARKETPARQUET_PAID_SPLIT_ADJUSTED_DAILY"
    &&day(v.observationDate)&&checkedPoint(v.current)
    &&v.current.date===v.observationDate;
};
const checkedHistory=(x:unknown):x is PaidHistory=>{
  if(!checkedCurrent(x))return false;
  const h=x as PaidHistory;
  return Array.isArray(h.points)&&h.points.length>0&&h.points.length<=250
    &&day(h.firstDate)&&day(h.lastDate)&&h.firstDate===h.points[0].date
    &&h.lastDate===h.points.at(-1)?.date
    &&h.lastDate===h.observationDate
    &&h.historyComplete===(h.points.length===250)
    &&h.points.every((p,i)=>checkedPoint(p)
      &&(i===0||p.date>h.points[i-1].date))
    &&JSON.stringify(h.points.at(-1))===JSON.stringify(h.current);
};

const percentLabel=(n:number)=>n.toFixed(1)+"%";
const dateLabel=(n:string)=>n.replaceAll("-",".");
const plot={left:8,right:592,top:12,bottom:145};
const y=(v:number)=>plot.bottom-v/100*(plot.bottom-plot.top);
const x=(index:number,count:number)=>count===1?(plot.left+plot.right)/2
  :plot.left+index/(count-1)*(plot.right-plot.left);
function pathFor(points:Point[],field:"risingPct"|"unchangedPct"|"fallingPct"){
  return points.map((p,i)=>(i?"L":"M")+x(i,points.length).toFixed(2)+","+y(p[field]).toFixed(2)).join(" ");
}

export function PaidUsBreadthR2Panel({period="1Y"}:{period?:Period}){
  const [current,setCurrent]=useState<PaidCurrent|null>(null);
  const [history,setHistory]=useState<PaidHistory|null>(null);
  const [expanded,setExpanded]=useState(false);
  const [selected,setSelected]=useState<number|null>(null);
  const id=useId();

  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const load=async(url:string)=>{
      try{
        const response=await fetch(url,{cache:"no-store",signal:controller.signal});
        return response.ok?await response.json() as unknown:null;
      }catch{return null;}
    };
    void Promise.all([
      load("/api/market-breadth?market=usa&phase=confirmed-r2"),
      load("/api/market-breadth-r2-history?market=usa"),
    ]).then(([latest,past])=>{
      if(!active)return;
      setCurrent(checkedCurrent(latest)?latest:null);
      setHistory(checkedHistory(past)?past:null);
    });
    return ()=>{active=false;controller.abort();};
  },[]);

  const points=useMemo(()=>{
    if(!history)return [];
    if(period==="1Y")return history.points;
    const n=period==="1D"?1:getMarketPeriodDays(period);
    const last=Date.parse(history.lastDate+"T00:00:00Z");
    return history.points.filter(p=>Date.parse(p.date+"T00:00:00Z")>=last-(n-1)*86400000);
  },[history,period]);
  const available=current?.current??null;
  const focused=points[Math.min(selected??points.length-1,points.length-1)]??null;
  const choosePointer=(event:ReactPointerEvent<SVGSVGElement>)=>{
    if(points.length<1)return;
    const bounds=event.currentTarget.getBoundingClientRect();
    if(bounds.width===0)return;
    const pos=Math.max(0,Math.min(1,(event.clientX-bounds.left)/bounds.width));
    setSelected(Math.round(pos*(points.length-1)));
  };
  const chooseKeyboard=(event:ReactKeyboardEvent<SVGSVGElement>)=>{
    if(!points.length)return;
    const now=selected??points.length-1;
    const next=event.key==="ArrowLeft"?Math.max(0,now-1)
      :event.key==="ArrowRight"?Math.min(points.length-1,now+1)
      :event.key==="Home"?0:event.key==="End"?points.length-1:null;
    if(next!==null){event.preventDefault();setSelected(next);}
  };

  return <section className={styles.root} data-market="usa"
    data-expanded={expanded} aria-label="미국 전체 주식 등락 지수">
    <button type="button" className={styles.summaryButton}
      aria-expanded={expanded} aria-controls={id}
      onClick={()=>{setExpanded(v=>!v);setSelected(null);}}>
      <div className={styles.stats}>
        <div className={styles.heading}><strong>미국 등락 지수</strong>
          {!available&&<small className={styles.pending}>연결 예정</small>}
        </div>
        {([
          ["up","상승","▲",available?.risingPct],
          ["flat","보합","―",available?.unchangedPct],
          ["down","하락","▼",available?.fallingPct],
        ] as const).map(([key,label,symbol,value])=>
          <div className={styles.stat} key={key}
            aria-label={label+": "+(value===undefined?"미제공":percentLabel(value))}>
            <span className={styles.symbol} aria-hidden="true">{symbol}</span>
            <span className={styles.percent}>{value===undefined?"—":percentLabel(value)}</span>
          </div>)}
      </div>
      <div className={styles.track} role="img"
        aria-label={available
          ?`상승 ${percentLabel(available.risingPct)}, 보합 ${percentLabel(available.unchangedPct)}, 하락 ${percentLabel(available.fallingPct)}, 확정일 ${current?.observationDate}`
          :"유료 원자료로 검증된 현재 등락 비율이 없습니다"}>
        {available&&<>
          <span className={styles.rising} style={{width:available.risingPct+"%"}}/>
          <span className={styles.unchanged} style={{width:available.unchangedPct+"%"}}/>
          <span className={styles.falling} style={{width:available.fallingPct+"%"}}/>
        </>}
      </div>
    </button>
    <div id={id} className={styles.details} role="region"
      aria-label="미국 전체 시장 확정 등락 비율 이력" hidden={!expanded}>
      {!history?<p className={styles.historyEmpty}>검증된 유료 확정 이력이 아직 게시되지 않았습니다.</p>
        :points.length<2?<p className={styles.historyEmpty}>
          선택 기간에는 선으로 연결할 실제 확정 관측일이 2개 이상 필요합니다.
        </p>:<div className={styles.historyChart}>
          <div className={styles.historyNetHeading}>
            <strong>미국 전체 시장 확정 등락 비율</strong>
            <span>기준일 {dateLabel(history.lastDate)}</span>
          </div>
          <div className={styles.historyPlot}>
            <div className={styles.historyPercentAxis} aria-hidden="true">
              <span>100%</span><span>50%</span><span>0%</span>
            </div>
            <div className={styles.historySvgWrap}>
              <svg viewBox="0 0 600 160" preserveAspectRatio="none"
                role="img" tabIndex={0}
                aria-label={`실제 저장된 ${points.length}거래일의 상승, 보합, 하락 비율을 선으로 연결. 마우스, 터치, 키보드로 관측일 선택`}
                onPointerMove={choosePointer} onPointerDown={choosePointer}
                onKeyDown={chooseKeyboard}>
                {[0,50,100].map(n=><line key={n} x1={plot.left}
                  x2={plot.right} y1={y(n)} y2={y(n)}
                  className={styles.historyGridline}/>)}
                <path d={pathFor(points,"risingPct")} className={styles.historyRisingLine} fill="none"/>
                <path d={pathFor(points,"unchangedPct")} className={styles.historyUnchangedLine} fill="none"/>
                <path d={pathFor(points,"fallingPct")} className={styles.historyFallingLine} fill="none"/>
              </svg>
            </div>
            <div className={styles.historyDates}>
              <time dateTime={points[0].date}>{dateLabel(points[0].date)}</time>
              <time dateTime={points.at(-1)?.date}>{dateLabel(points.at(-1)!.date)}</time>
            </div>
          </div>
          {focused&&<p role="status" style={{fontSize:11,marginTop:6}}>
            {dateLabel(focused.date)} · 상승 {percentLabel(focused.risingPct)} ·
            보합 {percentLabel(focused.unchangedPct)} · 하락 {percentLabel(focused.fallingPct)}
          </p>}
          <p style={{fontSize:10,marginTop:3,opacity:.75}}>
            실관측 {points.length}개 · {history.historyComplete?"250개 비교 거래일":"부분 이력"} · 전일 종목 가격 결손은 승인된 보합 분류 정책 적용
          </p>
        </div>}
    </div>
  </section>;
}
