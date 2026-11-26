// Display-only join for the 19 inflation research inputs and the existing
// /api/release-calendar stored result. Does not collect, score, or write data.
// Dates come only from the stored official calendar event. If a later refresh
// fails, preserve the last verified future date with an explicit warning;
// never present an old verification as a freshly confirmed release.

export const INFLATION_RESEARCH_RELEASE_MAPPING=Object.freeze({
  '5':Object.freeze({source:'bls',eventId:'ppi'}),
  '6':Object.freeze({source:'bls',eventId:'ppi'}),
  '7':Object.freeze({source:'bls',eventId:'ppi'}),
  '8':Object.freeze({source:'bls',eventId:'ppi'}),
  '9':Object.freeze({source:'bls',eventId:'ppi'}),
  '10':Object.freeze({source:'bls',eventId:'ppi'}),
  '11':Object.freeze({source:'bls',eventId:'ppi'}),
  '12':Object.freeze({source:'bls',eventId:'employment'}),
  '13':Object.freeze({source:'bls',eventId:'eci'}),
  '14':Object.freeze({source:'bls',eventId:'productivity'}),
  '19':Object.freeze({source:'bls',eventId:'import-export-prices'}),
  '25':Object.freeze({source:'bls',eventId:'ppi'}),
  '26':Object.freeze({source:'bea',eventId:'pce'}),
  // Prepared for future PC calendar sources. No UI redeploy is required when
  // the existing stored feed begins publishing these source/event IDs.
  '4':Object.freeze({source:'eia_epm',eventId:'eia-epm'}),
  '21':Object.freeze({source:'nyfed',eventId:'nyfed-gscpi',sourceUrl:'https://www.newyorkfed.org/research/policy/gscpi'}),
  '31':Object.freeze({source:'nyfed',eventId:'nyfed-sce',sourceUrl:'https://www.newyorkfed.org/microeconomics/calendar.html'}),
});

const EXCEPTIONS=Object.freeze({
  '1':Object.freeze({status:'UNSCHEDULED_SPOT',text:'현물가격 월간 집계 · 정기 발표일 없음'}),
  '3':Object.freeze({status:'UNSCHEDULED_DAILY',text:'일간 현물가격 · 정기 발표일 없음'}),
  '18':Object.freeze({status:'UNSCHEDULED_DAILY',text:'일간 달러지수 · 정기 발표일 없음'}),
});

const SOURCE_URLS=Object.freeze({
  bls:'https://www.bls.gov/schedule/',
  bea:'https://www.bea.gov/news/schedule',
  eia_epm:'https://www.eia.gov/electricity/monthly/index.php',
  nyfed:'https://www.newyorkfed.org/research/data_indicators',
});
const MAX_SOURCE_AGE_MS=48*60*60*1000;
const SHORT_LABELS=Object.freeze({
  UNSCHEDULED_SPOT:'정기 없음',UNSCHEDULED_DAILY:'정기 없음',
  SOURCE_NOT_CONNECTED:'미연결',SOURCE_UNVERIFIED:'확인 전',
  SOURCE_FAILED:'조회 실패',SOURCE_STALE:'갱신 지연',
  NO_CONFIRMED:'일정 미정',INVALID_REFERENCE_DATE:'날짜 확인',
  UNKNOWN_RESEARCH_ID:'미등록',
});
const validDate=value=>typeof value==='string'&&/^20\d\d-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)&&
  Number.isFinite(Date.parse(value+'T00:00:00Z'))&&
  new Date(value+'T00:00:00Z').toISOString().slice(0,10)===value;

const result=(status,text,{nextReleaseDate=null,sourceUrl=null,basis='unverified'}={})=>{
  const day=nextReleaseDate?`${Number(nextReleaseDate.slice(5,7))}.${nextReleaseDate.slice(8)}`:null;
  const shortText=status==='CONFIRMED'?day:
    status==='LAST_CONFIRMED_SOURCE_FAILED'&&day?day+' · 실패':
    status==='LAST_CONFIRMED_STALE'&&day?day+' · 지연':
    SHORT_LABELS[status]??text;
  return {status,text,shortText,nextReleaseDate,sourceUrl,basis};
};
const dateText=date=>`${Number(date.slice(5,7))}.${date.slice(8)}`;

/**
 * Resolve a research input's next US-local official release date.
 * @param {string|number} researchId - original 19-input research ID, e.g. '14'.
 * @param {object|null} calendar - saved /api/release-calendar response.
 * @param {string} today - YYYY-MM-DD in America/New_York, NOT observation date.
 * @param {number} now - current epoch milliseconds for freshness checks.
 * @returns {{status:string,text:string,shortText:string|null,nextReleaseDate:string|null,sourceUrl:string|null,basis:string}}
 */
export function inflationResearchReleaseInfo(researchId,calendar,today,now=Date.now()){
  const id=String(researchId);
  const exception=EXCEPTIONS[id];
  if(exception)return result(exception.status,exception.text,{basis:'not-scheduled'});

  const mapping=INFLATION_RESEARCH_RELEASE_MAPPING[id];
  if(!mapping)return result('UNKNOWN_RESEARCH_ID','등록되지 않은 연구 지표');
  const sourceUrl=mapping.sourceUrl??SOURCE_URLS[mapping.source];
  if(!validDate(today)||!Number.isFinite(now))
    return result('INVALID_REFERENCE_DATE','기준일 확인 필요',{sourceUrl});

  const sourceState=calendar?.sources?.[mapping.source];
  if((mapping.source==='eia_epm'||mapping.source==='nyfed')&&!sourceState)
    return result('SOURCE_NOT_CONNECTED','공식 일정 자동 연결 전',{sourceUrl,basis:'not-connected'});
  const status=sourceState?.status;
  if(status!=='READY'&&status!=='SOURCE_FAILED')
    return result('SOURCE_UNVERIFIED','공식 일정 미확인',{sourceUrl});

  const checkedAt=typeof sourceState.checkedAt==='string'?Date.parse(sourceState.checkedAt):NaN;
  // Without a trustworthy last-confirmed timestamp, even preserved events
  // cannot be claimed as previously verified official dates.
  if(!Number.isFinite(checkedAt)||checkedAt>now)
    return status==='SOURCE_FAILED'
      ?result('SOURCE_FAILED','공식 일정 조회 실패',{sourceUrl,basis:'source-failed'})
      :result('SOURCE_STALE','공식 일정 확인 시각 불명',{sourceUrl,basis:'stale'});

  const stale=now-checkedAt>MAX_SOURCE_AGE_MS;
  const next=(Array.isArray(calendar?.events)?calendar.events:[])
    .filter(event=>event&&event.source===mapping.source&&event.id===mapping.eventId&&
      validDate(event.date)&&event.date>=today)
    .sort((a,b)=>a.date.localeCompare(b.date))[0];

  if(next&&status==='SOURCE_FAILED')
    return result('LAST_CONFIRMED_SOURCE_FAILED',`${dateText(next.date)} · 마지막 확인 (조회 실패)`,{
      nextReleaseDate:next.date,sourceUrl,basis:'last-official-source-failed',
    });
  if(next&&stale)
    return result('LAST_CONFIRMED_STALE',`${dateText(next.date)} · 마지막 확인 (갱신 지연)`,{
      nextReleaseDate:next.date,sourceUrl,basis:'last-official-stale',
    });
  if(next)return result('CONFIRMED',`${dateText(next.date)} · 공식`,{
    nextReleaseDate:next.date,sourceUrl,basis:'official',
  });

  if(status==='SOURCE_FAILED')
    return result('SOURCE_FAILED','공식 일정 조회 실패',{sourceUrl,basis:'source-failed'});
  if(stale)
    return result('SOURCE_STALE','공식 일정 갱신 지연',{sourceUrl,basis:'stale'});
  return result('NO_CONFIRMED','확인된 다음 발표일 없음',{sourceUrl});
}
