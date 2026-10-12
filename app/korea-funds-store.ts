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
function load(signal?:AbortSignal){
 if(signal?.aborted)return Promise.resolve();
 if(inFlight)return inFlight.then(()=>load(signal));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),95000);
 inFlight=fetch('/api/indicators/korea-funds',{cache:'no-store',signal:signal??controller.signal})
  .then(async r=>{if(!r.ok){if(r.status===503){const failure=await r.json() as {reason?:string};if(!signal?.aborted&&/STALE|EXPIRED/.test(failure.reason??'')){lastPayload=null;state={loading:false,indicators:[],composite:null};}}throw Error();}return r.json() as Promise<{indicators?:Indicator[];composite?:Composite}>;})
  .then(d=>{
   if(signal?.aborted||!acceptsStoredUpdate(lastPayload,d))return;
   lastPayload=d;
   const accepted=d.composite?.methodologyVersion==='kr-fg-cnn-r7-1.0.0';
   state={loading:false,indicators:Array.isArray(d.indicators)?d.indicators:[],composite:accepted?d.composite??null:null};
  })
  .catch(()=>{state={...state,loading:false};})
  .finally(()=>{clearTimeout(timer);inFlight=null;listeners.forEach(fn=>fn());});
 return inFlight;
}
export function useKoreaFunds(){const data=useSyncExternalStore(subscribe,snapshot,()=>empty);useEffect(()=>{subscribers++;if(!stopRefresh)stopRefresh=startStoredRefresh(load);return()=>{subscribers--;if(!subscribers){stopRefresh?.();stopRefresh=null;}};},[]);return data;}
