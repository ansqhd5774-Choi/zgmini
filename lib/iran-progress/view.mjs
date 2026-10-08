import {validatePublicIran} from '../../worker/iran-progress-public.mjs';
export function iranView(data,now=Date.now()){
 if(['READY','STALE'].includes(data?.status)&&validatePublicIran({...data,status:'READY'},now)){
  const age=now-Math.min(data.observationAt,data.lastVerifiedAt);
  if(age<=3*86400000)return {status:age>86400000?'STALE':'READY',score:data.score,history:data.history,
   observationAt:data.observationAt,domains:data.domains,relations:data.relations,overallEnded:data.overallEnded,
   message:age>86400000?'갱신 지연':'저장 자료',transit:data.transit??null};
 }
 return {status:data?.status==='PENDING'?'PENDING':'UNAVAILABLE',score:null,history:[],observationAt:null,
  domains:null,relations:null,overallEnded:false,transit:null,message:data?.status==='PENDING'?'검증 자료 대기':'자료 확인 불가'};
}
