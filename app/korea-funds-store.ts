"use client";
import {acceptsStoredUpdate,startStoredRefresh} from '../lib/market-score/live-refresh.mjs';
import {useEffect,useSyncExternalStore} from 'react';
export type Point={date:string;score:number|null;displayScore?:number|null;stageCode?:string|null;stageLabel?:string|null};
export type Indicator={id:string;name:string;status:'READY'|'STALE'|'WARMUP'|'UNAVAILABLE';score:number|null;observationDate:string|null;previousObservationDate:string|null;changePoints:number|null;history:Point[];briefExplanation:string;direction?:1|-1;weight?:number};
export type CompositeComponent={id:string;label?:string;score:number|null;direction?:1|-1;weight:number;weightedContribution:number|null};
export type Composite=Omit<Indicator,'briefExplanation'>&{
 methodologyVersion:string;activeMethodologyVersion?:string;displayScore:number|null;
 stageCode:string|null;stageLabel:string|null;staleReason:string|null;briefMethodology:string;
 components:CompositeComponent[];weights?:Record<string,number>;
 historyMode:'RECONSTRUCTED_CURRENT_VINTAGE';pointInTimeVerified:false;
 researchOnly?:boolean;productionEligible?:boolean;sourcePublishedAt:null;
 sourceAttribution:string;stagePolicy:string;fallbackApplied?:boolean;fallbackReason?:string|null;
};
type State={loading:boolean;indicators:Indicator[];composite:Composite|null};
const empty:State={loading:true,indicators:[],composite:null};
let state=empty,inFlight:Promise<void>|null=null;
let lastPayload:unknown=null,stopRefresh:(()=>void)|null=null,subscribers=0;
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
const snapshot=()=>state;
function load(signal?:AbortSignal):Promise<void>{
 if(signal?.aborted)return Promise.resolve();
 if(inFlight)return inFlight.then(()=>load(signal));
 const controller=new AbortController();
 const onAbort=()=>controller.abort();
 signal?.addEventListener('abort',onAbort,{once:true});
 if(signal?.aborted)controller.abort();
 const timer=setTimeout(()=>controller.abort(),95000);
 // Cancellation must release the shared slot even if fetch ignores AbortSignal.
 let cancelHandler:()=>void;
 const cancelled=new Promise<void>(resolve=>{
  cancelHandler=()=>resolve();
  controller.signal.addEventListener('abort',cancelHandler,{once:true});
  if(controller.signal.aborted)resolve();
 });
 const request=Promise.resolve().then(()=>fetch('/api/indicators/korea-funds',{cache:'no-store',signal:controller.signal}))
  .then(async r=>{if(!r.ok){if(r.status===503){const failure=await r.json() as {reason?:string};if(!controller.signal.aborted&&/STALE|EXPIRED/.test(failure.reason??'')){lastPayload=null;state={loading:false,indicators:[],composite:null};}}throw Error();}return r.json() as Promise<{indicators?:Indicator[];composite?:Composite}>;})
  .then(d=>{
   if(controller.signal.aborted||!acceptsStoredUpdate(lastPayload,d))return;
   lastPayload=d;
   const accepted=d.composite?.methodologyVersion==='kr-fg-cnn-r7-1.0.0';
   state={loading:false,indicators:Array.isArray(d.indicators)?d.indicators:[],composite:accepted?d.composite??null:null};
  })
  .catch(()=>{if(!controller.signal.aborted)state={...state,loading:false};});
 const running=Promise.race([request,cancelled]).finally(()=>{
  signal?.removeEventListener('abort',onAbort);
  controller.signal.removeEventListener('abort',cancelHandler);
  clearTimeout(timer);
  if(inFlight===running)inFlight=null;
  if(state.loading)state={...state,loading:false};
  listeners.forEach(fn=>fn());
 });
 inFlight=running;
 return running;
}
export function useKoreaFunds(){const data=useSyncExternalStore(subscribe,snapshot,()=>empty);useEffect(()=>{subscribers++;if(!stopRefresh)stopRefresh=startStoredRefresh(load);return()=>{subscribers--;if(!subscribers){stopRefresh?.();stopRefresh=null;}};},[]);return data;}
