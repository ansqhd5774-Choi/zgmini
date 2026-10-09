import {validatePublicIran} from '../../worker/iran-progress-public.mjs';
import {visibleIranFacts} from './facts.mjs';
import {validateReferenceFlow} from './reference-public.mjs';
import {dailyReferenceHistory} from './chart-history.mjs';
export function iranView(data,now=Date.now()){
 const facts=visibleIranFacts(data?.factsSnapshot,now);
 const content={facts,contentState:facts.length?'AVAILABLE':'PENDING',currentStateVerified:false};
 if(validateReferenceFlow(data,now)){
 const factor=data.displaySensitivity===3?3:1;
 const display=value=>Number(Math.max(0,Math.min(100,50+factor*(value-50))).toFixed(2));
 return {...content,status:data.status,reference:true,score:display(data.score),rawScore:data.score,displaySensitivity:factor,
  history:data.history.map(p=>({...p,value:display(p.value),at:Date.parse(p.date+'T00:00:00Z')})),chartHistory:dailyReferenceHistory(data).map(p=>({...p,value:display(p.value)})),events:data.events,
  observationAt:data.publishedAt,chartEndAt:Date.parse(data.asOfDate+'T00:00:00Z'),domains:data.domains,relations:null,overallEnded:false,transit:null,
  message:data.status==='UPDATE_DELAYED'?'갱신 지연 · 마지막 참고 점수':'보도 흐름 참고 점수'};
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
