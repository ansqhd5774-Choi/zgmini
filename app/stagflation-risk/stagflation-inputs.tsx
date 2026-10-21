'use client';
import {STAGFLATION_INPUT_SIGNALS} from '../../lib/diagnostic-layer/stagflation-inputs.mjs';
import {recessionReleaseInfo} from '../../lib/release-calendar.mjs';
import {useStoredIndex} from '../../components/use-stored-index';
import {InflationMiniChart,type InflationMiniTrendPoint} from '../inflation/inflation-mini-chart';
import {InflationFavoriteButton,InflationFavoriteHeaderIcon} from '../inflation/inflation-favorite-button';
import {ContentHelp} from '../content-help';
import {HelpText} from '../help-copy';

export type StagflationInput={id:string;status:string;value:number;score:number;observationMonth:string;previousValue:number;previousObservationMonth:string;releaseDate:string|null;trend:InflationMiniTrendPoint[]};
type Meta=typeof STAGFLATION_INPUT_SIGNALS[number];
const number=(value:unknown,unit:string)=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(2)+unit:'—';
const month=(date?:string)=>date?'관측 '+date.slice(0,7).replace('-','. '):'관측월 미확인';
function judgement(value?:number){return typeof value!=='number'||!Number.isFinite(value)?{label:'확인 필요',tone:'neutral'}:value>=60?{label:'긍정',tone:'positive'}:value>=40?{label:'중립',tone:'neutral'}:{label:'부정',tone:'negative'};}
function Help({meta}:{meta:Meta}){return <ContentHelp label={meta.label+' 도움말'}><HelpText copy={{meaning:meta.content,reading:'판단은 산식에 이미 사용된 신호의 안정성 평가입니다. 높을수록 위험 부담이 낮은 방향이며, 실제 수치는 표시한 단위로 읽으세요.',note:'현재·이전 날짜는 원자료 관측월입니다. 개별 발표일이 저장되지 않은 경우 관측월을 발표일로 바꾸지 않습니다. 미니차트는 현재 개정치로 재구성한 최근 1년입니다.'}}/></ContentHelp>;}

export default function StagflationInputs({inputs}:{inputs?:StagflationInput[]}){
 const {payload:calendar}=useStoredIndex<any>('/api/release-calendar');
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const byId=new Map((inputs??[]).map(row=>[row.id,row]));
 const release=(meta:Meta)=>meta.releaseId?recessionReleaseInfo(meta.releaseId,calendar,today):{cadence:'월간',next:null,text:'공식 일정 확인',sourceUrl:'https://fred.stlouisfed.org/series/'+meta.series};
 const schedule=(meta:Meta)=>{const info=release(meta);const days=info.next?Math.round((Date.parse(info.next+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000):null;return <><strong>{info.cadence}</strong><small>{info.next?info.next.slice(5).replace('-','.')+' · '+(days===0?'오늘':'D-'+days):info.text}</small></>};
 return <section className="inflation-indicator-section inflation-r2-indicators stagflation-inputs" aria-labelledby="stagflation-input-title">
  <header><div><p className="cnn-eyebrow">STAGFLATION INPUTS</p><h2 id="stagflation-input-title">위험 신호의 근거 · 10개 평가신호</h2></div><p>8개 원자료에서 산식에 실제 반영하는 신호입니다. 이전·현재 값과 1년 추이를 비교하세요. 날짜는 <b>관측월</b>이며 개별 발표일과 다릅니다. 모든 신호는 위 점수와 같은 공통 관측월 기준입니다.</p></header>
  <div className="inflation-table-wrap inflation-r2-table-wrap"><table className="inflation-indicator-table inflation-indicator-table-r2"><colgroup>{Array.from({length:10},(_,i)=><col key={i}/>)}</colgroup>
   <thead><tr><th className="inflation-r2-favorite-head"><span className="sr-only">즐겨찾기</span><InflationFavoriteHeaderIcon/></th><th>지표</th><th>내용</th><th>기준</th><th>이전</th><th>현재</th><th>발표</th><th>판단</th><th>미니차트(1Y)</th><th><span className="sr-only">도움말</span>ⓘ</th></tr></thead>
   <tbody>{STAGFLATION_INPUT_SIGNALS.map(meta=>{const row=byId.get(meta.id),j=judgement(row?.score);return <tr key={meta.id} data-judgement={j.tone}>
    <td className="inflation-r2-favorite-cell"><InflationFavoriteButton id={'stagflation:'+meta.id} label={meta.label}/></td>
    <th scope="row"><strong>{meta.label}</strong><small>{meta.series} · 월별 재구성</small></th><td>{meta.content}</td><td className="inflation-r2-criterion">{meta.criterion}</td>
    <td className="inflation-r2-value"><strong>{number(row?.previousValue,meta.unit)}</strong><small>{month(row?.previousObservationMonth)}</small></td><td className="inflation-r2-value"><strong>{number(row?.value,meta.unit)}</strong><small>{month(row?.observationMonth)}</small></td>
    <td className="inflation-r2-release">{schedule(meta)}</td><td><span className="inflation-judgement">{j.label}</span></td><td className="inflation-r2-spark-cell"><InflationMiniChart label={meta.label} points={row?.trend}/></td><td><Help meta={meta}/></td>
   </tr>})}</tbody></table></div>
  <div className="inflation-r2-mobile-list">{STAGFLATION_INPUT_SIGNALS.map(meta=>{const row=byId.get(meta.id),j=judgement(row?.score);return <article className="inflation-r2-mobile-card" key={meta.id} data-judgement={j.tone}>
   <div className="inflation-r2-mobile-head"><div className="inflation-r2-mobile-title"><InflationFavoriteButton id={'stagflation:'+meta.id} label={meta.label}/><div><strong>{meta.label}</strong><small>{meta.series} · 월별 재구성</small></div></div><div className="inflation-r2-mobile-actions"><span className="inflation-judgement">{j.label}</span><Help meta={meta}/></div></div>
   <p className="inflation-r2-mobile-content">{meta.content}</p><p className="inflation-r2-mobile-criterion"><span>기준</span>{meta.criterion}</p>
   <div className="inflation-r2-mobile-spark"><span>미니차트(1Y)</span><InflationMiniChart label={meta.label} points={row?.trend}/></div>
   <div className="inflation-r2-mobile-metrics"><div><span>이전</span><strong>{number(row?.previousValue,meta.unit)}</strong><small>{month(row?.previousObservationMonth)}</small></div><div><span>현재</span><strong>{number(row?.value,meta.unit)}</strong><small>{month(row?.observationMonth)}</small></div><div>{schedule(meta)}</div></div>
  </article>})}</div>
  <p className="inflation-r2-axis-note">현재 개정치로 월별 재구성한 값이며 발표 당시 점수나 위기 확률이 아닙니다. 발표 일정은 확인된 공식 일정만 표시합니다. ‘—’는 0이 아니라 확인할 수 없는 값입니다.</p>
 </section>;
}
