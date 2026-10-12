"use client";
import {useEffect,useState} from 'react';
import {acceptsStoredUpdate,startStoredRefresh} from '../lib/market-score/live-refresh.mjs';
export function useStoredIndex<T>(url:string,initial:T|null=null){
 const [payload,setPayload]=useState<T|null>(initial);
 const [loading,setLoading]=useState(!initial);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let live=true,accepted=initial,lastPublication=0;
  const stop=startStoredRefresh(async(signal:AbortSignal)=>{
   try{
    const response=await fetch(url,{cache:'no-store',signal});
    if(!response.ok){if(response.status===503){const body=await response.json() as {reason?:string};if(live&&!signal.aborted&&/STALE|EXPIRED/.test(body.reason??'')){accepted=null;setPayload(null);}}throw Error('UPDATE_FAILED');}
    const body=await response.json() as T;
    const published=Date.parse(response.headers.get('x-data-snapshot-at')??response.headers.get('x-projection-source-at')??response.headers.get('x-market-snapshot-at')??'');
    if(live&&!signal.aborted&&(!Number.isFinite(published)||published>=lastPublication)&&acceptsStoredUpdate(accepted,body)){
     accepted=body;if(Number.isFinite(published))lastPublication=published;
     setPayload(body);setError(null);
    }
   }catch{if(live)setError('UPDATE_FAILED');}
   finally{if(live)setLoading(false);}
  });
  return()=>{live=false;stop();};
 },[url]);
 return {payload,loading,error};
}
