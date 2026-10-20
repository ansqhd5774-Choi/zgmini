import {validatePublicIran} from '../../worker/iran-progress-public.mjs';
import {visibleIranFacts} from './facts.mjs';
import {validateReferenceFlow} from './reference-public.mjs';
import {validateReferenceFlowR2} from './reference-public-r2.mjs';
import {validateReferenceFlowR3} from './reference-public-r3.mjs';
import {validateIranR5Public} from './daily-public-r5.mjs';
import {dailyReferenceHistory,kstCalendarDate} from './chart-history.mjs';
import {provisionalIran19Backcast} from './provisional-19-backcast-r1.mjs';
export function iranView(data,now=Date.now()){
 const facts=visibleIranFacts(data?.factsSnapshot,now);
 const content={facts,contentState:facts.length?'AVAILABLE':'PENDING',currentStateVerified:false};
 if(validateIranR5Public(data,now)){
  const history=data.history.map(p=>({...p,at:Date.parse(p.date+'T00:00:00Z')}));
  return {...content,status:'PROVISIONAL',reference:true,methodVersion:'R5',
   collectionState:null,lastSignalDate:history.filter(p=>p.reportedEvents>0).at(-1)?.date??null,
   collectionCheckedAt:data.collectionCheckedAt,observedDomains:[],unobservedDomains:[],
   saturatedDomains:[],newsCollection:null,
   score:data.score,rawScore:data.score,displayEstimate:null,dailyAnchorEstimate:true,
   displaySensitivity:1,history,chartHistory:history,events:[],
   observationAt:data.publishedAt,chartEndAt:Date.parse(data.asOfDate+'T00:00:00Z'),
   domains:null,relations:null,overallEnded:false,transit:null,
   message:'당일 잠정 종전 진전도 · R5',verifiedWarState:false};
 }
 const r3=validateReferenceFlowR3(data,now),r2=validateReferenceFlowR2(data,now),staged=r3||r2;
 if(staged||validateReferenceFlow(data,now)){
 const factor=staged?1:[3,3.5].includes(data.displaySensitivity)?data.displaySensitivity:1;
 // Extend the display horizon at midnight KST, without editing the stored UTC R3 snapshot.
 const chartDate=r3?kstCalendarDate(now):data.asOfDate;
 const chartSource=r3&&chartDate>data.asOfDate?{...data,asOfDate:chartDate}:data;
 const backcast=r3?provisionalIran19Backcast(chartSource):null;
 const display=value=>Number(Math.max(0,Math.min(100,50+factor*(value-50))).toFixed(2));
 return {...content,status:data.status,reference:true,methodVersion:r3?'R3':r2?'R2':'R1',collectionState:staged?data.newsCollection.status:null,lastSignalDate:staged?data.lastSignalDate:null,collectionCheckedAt:data.collectionCheckedAt??null,observedDomains:r3?data.observedDomains:[],unobservedDomains:r3?data.unobservedDomains:[],saturatedDomains:r3?data.saturatedDomains:[],newsCollection:staged?data.newsCollection:null,score:backcast?backcast.score:display(data.score),rawScore:data.score,displayEstimate:backcast,displaySensitivity:factor,
  history:data.history.map(p=>({...p,value:backcast?Number(Math.max(0,Math.min(100,p.value+backcast.score-data.score)).toFixed(2)):display(p.value),at:Date.parse(p.date+'T00:00:00Z')})),chartHistory:backcast?backcast.history:dailyReferenceHistory(chartSource,{hidePreEventCarry:r3}).map(p=>({...p,value:display(p.value)})),events:data.events,
  observationAt:data.publishedAt,chartEndAt:Date.parse(chartSource.asOfDate+'T00:00:00Z'),domains:data.domains,relations:null,overallEnded:false,transit:null,
  message:data.status==='UPDATE_DELAYED'?'갱신 지연 · 마지막 참고 점수':backcast?'잠정 19점 기준 · 14일 역산 참고 흐름':r3?'R3 · 이란·주변 분쟁 보도 흐름':r2?'R2 · 보도 흐름 참고 점수':'보도 흐름 참고 점수'};
 }
 if(['READY','STALE'].includes(data?.status)&&validatePublicIran({...data,status:'READY'},now)){
  const age=now-Math.min(data.observationAt,data.lastVerifiedAt);
  if(age<=3*86400000)return {status:age>86400000?'STALE':'READY',score:data.score,history:data.history,
   observationAt:data.observationAt,domains:data.domains,relations:data.relations,overallEnded:data.overallEnded,
   message:age>86400000?'갱신 지연':'저장 자료',transit:data.transit??null,...content};
 }
 return {status:data?.status==='PENDING'?'PENDING':'UNAVAILABLE',score:null,history:[],observationAt:null,
  domains:null,relations:null,overallEnded:false,transit:null,...content,message:facts.length?'공식 발표 기록 · 현재 상태 미확인':data?.status==='PENDING'?'검증 자료 대기':'자료 확인 불가'};
}
