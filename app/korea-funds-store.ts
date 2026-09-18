"use client";
import {useEffect,useSyncExternalStore} from 'react';
export type Point={date:string;score:number|null;displayScore?:number|null;stageCode?:string|null;stageLabel?:string|null};
export type Indicator={id:string;name:string;status:'READY'|'STALE'|'WARMUP'|'UNAVAILABLE';score:number|null;observationDate:string|null;previousObservationDate:string|null;changePoints:number|null;history:Point[];briefExplanation:string};
export type CompositeComponent={id:string;role?:'CORE'|'PENALTY';inputScore:number;orientedScore:number;weight:number;weightedContribution:number;penaltyPoints?:number;stressZ?:number;windowDays?:number};
export type Composite=Omit<Indicator,'briefExplanation'>&{methodologyVersion:string;activeMethodologyVersion?:string;displayScore:number|null;stageCode:string|null;stageLabel:string|null;staleReason:string|null;briefMethodology:string;components:CompositeComponent[];historyMode:'RECONSTRUCTED_CURRENT_VINTAGE';pointInTimeVerified:false;sourcePublishedAt:null;sourceAttribution:string;stagePolicy:string;fallbackApplied?:boolean;fallbackReason?:string|null;baseScore?:number|null;corporateStressPenalty?:number|null;corporateStressZ?:number|null;corporateStressCompanyCount?:number|null};
type State={loading:boolean;indicators:Indicator[];composite:Composite|null};
const empty:State={loading:true,indicators:[],composite:null};
let state=empty,inFlight:Promise<void>|null=null,loaded=false;
const listeners=new Set<()=>void>();
const subscribe=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn);};};
const snapshot=()=>state;
function load(){
 if(loaded||inFlight)return;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),95000);
 inFlight=fetch('/api/indicators/korea-funds',{signal:controller.signal}).then(async r=>{if(!r.ok)throw Error();return r.json() as Promise<{indicators?:Indicator[];composite?:Composite}>;}).then(d=>{
  const version=d.composite?.methodologyVersion;
  const accepted=version==='kr-fg-2f-cs-2.0.0'||version==='kr-fg-2f-1.0.0';
  state={loading:false,indicators:Array.isArray(d.indicators)?d.indicators:[],composite:accepted?d.composite??null:null};
 }).catch(()=>{state={loading:false,indicators:[],composite:null};}).finally(()=>{clearTimeout(timer);loaded=true;inFlight=null;listeners.forEach(fn=>fn());});
}
export function useKoreaFunds(){const data=useSyncExternalStore(subscribe,snapshot,()=>empty);useEffect(()=>{load();},[]);return data;}
