"use client";
import {useEffect,useSyncExternalStore} from 'react';
export type Point={date:string;score:number|null;displayScore?:number|null;stageCode?:string|null;stageLabel?:string|null};
export type Indicator={id:string;name:string;status:'READY'|'STALE'|'WARMUP'|'UNAVAILABLE';score:number|null;observationDate:string|null;previousObservationDate:string|null;changePoints:number|null;history:Point[];briefExplanation:string};
export type Composite=Omit<Indicator,'briefExplanation'>&{methodologyVersion:string;displayScore:number|null;stageCode:string|null;stageLabel:string|null;staleReason:string|null;briefMethodology:string;components:{id:string;inputScore:number;orientedScore:number;weight:number;weightedContribution:number}[]};
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
  state={loading:false,indicators:Array.isArray(d.indicators)?d.indicators:[],composite:d.composite?.methodologyVersion==='kr-fg-2f-1.0.0'?d.composite:null};
 }).catch(()=>{state={loading:false,indicators:[],composite:null};}).finally(()=>{clearTimeout(timer);loaded=true;inFlight=null;listeners.forEach(fn=>fn());});
}
export function useKoreaFunds(){const data=useSyncExternalStore(subscribe,snapshot,()=>empty);useEffect(()=>{load();},[]);return data;}
