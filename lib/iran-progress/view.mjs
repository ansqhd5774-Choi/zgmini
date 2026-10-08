import {validatePublicIran} from '../../worker/iran-progress-public.mjs';
import {visibleIranFacts} from './facts.mjs';
export function iranView(data,now=Date.now()){
 const facts=visibleIranFacts(data?.factsSnapshot,now);
 const content={facts,contentState:facts.length?'AVAILABLE':'PENDING',currentStateVerified:false};
 if(['READY','STALE'].includes(data?.status)&&validatePublicIran({...data,status:'READY'},now)){
  const age=now-Math.min(data.observationAt,data.lastVerifiedAt);
  if(age<=3*86400000)return {status:age>86400000?'STALE':'READY',score:data.score,history:data.history,
   observationAt:data.observationAt,domains:data.domains,relations:data.relations,overallEnded:data.overallEnded,
   message:age>86400000?'갱신 지연':'저장 자료',transit:data.transit??null,...content};
 }
 return {status:data?.status==='PENDING'?'PENDING':'UNAVAILABLE',score:null,history:[],observationAt:null,
  domains:null,relations:null,overallEnded:false,transit:null,...content,message:facts.length?'공식 발표 기록 · 현재 상태 미확인':data?.status==='PENDING'?'검증 자료 대기':'자료 확인 불가'};
}
