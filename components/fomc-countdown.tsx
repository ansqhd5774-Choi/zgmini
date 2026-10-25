"use client";

import {useEffect,useRef,useState,type KeyboardEvent} from 'react';
import {FOMC_CHECKED_AT,FOMC_SOURCE,fomcState,fomcKst} from '../lib/fomc-countdown.mjs';
import {upcomingSchedule,remainingParts,kstDisplayParts} from '../lib/fomc-schedule.mjs';
import './fomc-countdown.css';

function FlipDigit({value}:{value:string}) {
  const [previous,setPrevious]=useState(value);
  useEffect(()=>{const timer=setTimeout(()=>setPrevious(value),460);return()=>clearTimeout(timer)},[value]);
  const changing=previous!==value;
  return <span className="zg-fomc-digit"><span>{value}</span>{changing&&<span key={value} className="zg-fomc-flip" aria-hidden="true"><span className="zg-fomc-old">{previous}</span><span className="zg-fomc-new">{value}</span></span>}</span>;
}
function Pair({value}:{value:string}){return <span className="zg-fomc-pair">{[...value].map((v,i)=><FlipDigit key={i} value={v}/>)}</span>}

function CompanyLogo({logo,ticker,domain}:{logo?:string;ticker?:string;domain?:string|null}){
 const [imageFailed,setImageFailed]=useState(false);
 if(logo==='alphabet')return <svg className="zg-schedule-company-logo" viewBox="0 0 48 48" role="img" aria-label="구글 로고"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.27 5.48-4.8 7.18l7.73 6C44.38 38.03 46.98 31.86 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.44 14.44 0 0 1 9.75 24c0-1.59.27-3.13.77-4.59l-7.98-6.2A23.93 23.93 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.8l-7.73-6c-2.15 1.44-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;
 if(logo==='microsoft')return <svg className="zg-schedule-company-logo" role="img" aria-label="마이크로소프트 로고" viewBox="0 0 24 24"><path fill="#F25022" d="M0 0h11.3v11.3H0z"/><path fill="#7FBA00" d="M12.7 0H24v11.3H12.7z"/><path fill="#00A4EF" d="M0 12.7h11.3V24H0z"/><path fill="#FFB900" d="M12.7 12.7H24V24H12.7z"/></svg>;
 if(logo==='amazon')return <svg className="zg-schedule-company-logo" role="img" aria-label="아마존 로고 예시" viewBox="0 0 24 24"><text x="6" y="16" fontFamily="Arial,sans-serif" fontSize="18" fontWeight="900" fill="#fff">a</text><path d="M3.5 19c5.4 2.9 10.7 2.9 17-.2" fill="none" stroke="#FF9900" strokeWidth="2.25" strokeLinecap="round"/><path d="m17.5 18 3.2-.7-.6 3" fill="none" stroke="#FF9900" strokeWidth="1.5" strokeLinecap="round"/></svg>;
 if(domain&&!imageFailed)return <img className="zg-schedule-company-logo" src={'https://www.google.com/s2/favicons?domain='+encodeURIComponent(domain)+'&sz=64'} alt={(ticker??'기업')+' 로고'} width={14} height={14} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setImageFailed(true)}/>;
 if(ticker)return <span className="zg-schedule-ticker-fallback" role="img" aria-label={ticker+' 종목코드'} title="로고 이미지 불러오기 실패">{ticker.slice(0,2)}</span>;
 return null;
}

function ScheduleDate({at,estimated,session}:{at:string;estimated:boolean;session?:string}){
 const {date,weekday,time}=kstDisplayParts(at);
 const title=estimated
  ?(session==='beforeOpen'?'美 정규장 개장 09:30 ET 기준 예상 시각 · 실제 실적 공개 시각 미확정':'美 정규장 마감 16:00 ET 기준 예상 시각 · 실제 실적 공개 시각 미확정')
  :'공식 발표 예정 시각';
 return <time className="zg-schedule-date" dateTime={at} title={title}>{estimated?'≈':''}{date}<span className="zg-schedule-weekday" data-day={weekday}>({weekday})</span>{' '}{time}</time>;
}

function dayUrgencyClass(days:number){return days<=0?' zg-fomc-day-0':days===1?' zg-fomc-day-1':days===2?' zg-fomc-day-2':'';}

function ScheduleTimer({at,now,estimated}:{at:string;now:number;estimated:boolean}){
 const parts=remainingParts(at,now),pad=(n:number)=>String(n).padStart(2,'0');
 const expired=estimated&&now>=Date.parse(at);
 const label=expired?'예상 기준 시각 경과, 실적 공개 확인 필요':(estimated?'예상 기준까지 ':'발표까지 ')+parts.days+'일 '+parts.hours+'시간 '+parts.minutes+'분 '+parts.seconds+'초';
 return <span className="zg-schedule-remaining" role="timer" aria-live="off" aria-label={label}>
  {expired?'예상시각 경과':<><span className={'zg-schedule-number'+dayUrgencyClass(parts.days)}>{parts.days}</span><span className="zg-schedule-separator">일</span>{' '}<span className="zg-schedule-number">{pad(parts.hours)}</span><span className="zg-schedule-separator">:</span><span className="zg-schedule-number">{pad(parts.minutes)}</span><span className="zg-schedule-separator">:</span><span className="zg-schedule-number">{pad(parts.seconds)}</span></>}
 </span>;
}

export default function FomcCountdown(){
  const [now,setNow]=useState<number|null>(null);
  const [expanded,setExpanded]=useState(false);
  const [calendar,setCalendar]=useState<any>(null);
  const fetchedAt=useRef(0);
  useEffect(()=>{
    const tick=()=>setNow(Date.now());tick();
    const timer=setInterval(tick,1000);
    document.addEventListener('visibilitychange',tick);
    return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',tick)};
  },[]);
  useEffect(()=>{
    if(!expanded||Date.now()-fetchedAt.current<10*60000)return;
    fetchedAt.current=Date.now();
    const ac=new AbortController();
    fetch('/api/release-calendar',{signal:ac.signal}).then(r=>{if(!r.ok)throw Error('CALENDAR_HTTP_'+r.status);return r.json()}).then(data=>setCalendar(data)).catch(()=>{});
    return()=>ac.abort();
  },[expanded]);
  const event=now===null?null:fomcState(now);
  const upcoming=now===null?[]:upcomingSchedule(now,calendar);
  const title=`연준 공식 예정 일정 · 한국시간 · 일정 변경 가능 · 확인 ${FOMC_CHECKED_AT} · ${FOMC_SOURCE}`;
  const toggle=()=>setExpanded(v=>!v);
  const keyDown=(e:KeyboardEvent<HTMLDivElement>)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle()}};
  return <div className={'zg-fomc-bar'+(expanded?' zg-fomc-expanded':'')} aria-label="연준 금리 발표 일정" title={title} role="button" tabIndex={0} aria-expanded={expanded} aria-controls="zg-schedule-dropdown" onClick={toggle} onKeyDown={keyDown}>
    <svg className="zg-fomc-toggle-icon zg-fomc-toggle-left" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded?'M3 12l9-8 9 8 M3 20l9-8 9 8':'M3 4l9 8 9-8 M3 12l9 8 9-8'}/></svg>
    <div className="zg-fomc-center">
      <svg className="zg-fomc-bank" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m2 7 8-5 8 5H2Zm1 10h14M5 9v6m5-6v6m5-6v6"/></svg>
      <strong>연준 금리 발표</strong>
      {event?<><time dateTime={event.at} aria-label={`${new Date(event.at).getUTCFullYear()}년 ${fomcKst(event.at)} 한국시간`}>{fomcKst(event.at)} <span className="zg-fomc-zone">KST</span></time>
      {event.reached?<span className="zg-fomc-reached">발표 시각 도달 · 결과 확인 중</span>:<span className={'zg-fomc-clock'+dayUrgencyClass(Number(event.days))} role="timer" aria-live="off" aria-label={`발표까지 ${event.days}일 ${event.hours}시간 ${event.minutes}분 ${event.seconds}초`}><span aria-hidden="true" className="zg-fomc-clock-inner"><Pair value={event.days}/><span className="zg-fomc-day">일</span><Pair value={event.hours}/><b>:</b><Pair value={event.minutes}/><b>:</b><Pair value={event.seconds}/></span></span>}</>:<span className="zg-fomc-pending">{now===null?'일정 확인 중':'다음 공식 일정 확인 필요'}</span>}
    </div>
    <svg className="zg-fomc-toggle-icon zg-fomc-toggle-right" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={expanded?'M3 12l9-8 9 8 M3 20l9-8 9 8':'M3 4l9 8 9-8 M3 12l9 8 9-8'}/></svg>
    <div className="zg-schedule-dropdown" id="zg-schedule-dropdown" hidden={!expanded} onClick={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
      <div className="zg-schedule-heading"><strong>핵심 경제지표 · 주요 기업 실적</strong><span>시간순 · KST · {upcoming.length}건</span></div>
      <div className="zg-schedule-list" role="region" aria-label="예정된 주요 발표 목록">
        {upcoming.length===0?<p className="zg-schedule-empty">확인된 주요 발표 일정이 없습니다.</p>:upcoming.map(item=><div className="zg-schedule-item" key={item.key}>
          <span className={'zg-schedule-kind '+(item.kind==='실적'?'is-earnings':item.kind==='연준'?'is-fed':'')}>{item.kind}</span>
          <span className="zg-schedule-name" title={item.name}><CompanyLogo logo={item.logo} ticker={item.ticker} domain={item.logoDomain}/><span className="zg-schedule-name-text">{item.name}</span></span>
          <ScheduleDate at={item.at} estimated={item.estimated} session={item.session}/>
          {now!==null&&<ScheduleTimer at={item.at} now={now} estimated={item.estimated}/>}
        </div>)}
      </div>
      <div className="zg-schedule-foot">중요 발표만 표시 · 기업 실적 ≈ 는 美 장전·장후 기준 예상 시각 (확정 아님) · 실적 콜 제외 · BEA · BLS</div>
    </div>
  </div>;
}
