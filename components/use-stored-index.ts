"use client";
import {startTransition,useEffect,useState} from 'react';
import {acceptsStoredUpdate,startStoredRefresh} from '../lib/market-score/live-refresh.mjs';
import {nextStoredIndexPublicationOrder} from '../lib/market-score/stored-index-publication-order-r4.mjs';
export function useStoredIndex<T>(url:string,initial:T|null=null,enabled=true){
 const [payload,setPayload]=useState<T|null>(initial);
 const [loading,setLoading]=useState(!initial);
 const [error,setError]=useState<string|null>(null);
 // Only the explicit D1-derived publication header is a publication instant.
 // A source/retrieval timestamp must never be substituted for this value.
 const [publishedAt,setPublishedAt]=useState<string|null>(null);
 useEffect(()=>{
  if(!enabled)return;
  let live=true,accepted=initial,lastOrder:null|{publication:number|null;snapshot:number|null}=null;
  const stop=startStoredRefresh(async(signal:AbortSignal)=>{
   try{
    const response=await fetch(url,{cache:'no-store',signal});
    if(!response.ok){if(response.status===503){const body=await response.json() as {reason?:string};if(live&&!signal.aborted&&/STALE|EXPIRED/.test(body.reason??'')){accepted=null;setPayload(null);setPublishedAt(null);}}throw Error('UPDATE_FAILED');}
    const body=await response.json() as T;
    const publishedHeader=response.headers.get('x-projection-published-at');
    const publishedTimestamp=publishedHeader?Date.parse(publishedHeader):NaN;
    const verifiedPublishedAt=publishedHeader&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(publishedHeader)&&
     Number.isFinite(publishedTimestamp)&&new Date(publishedTimestamp).toISOString()===publishedHeader
      ?publishedHeader:null;
    const sourceStamp=response.headers.get('x-data-snapshot-at')??response.headers.get('x-projection-source-at')??response.headers.get('x-market-snapshot-at');
    const order=nextStoredIndexPublicationOrder(lastOrder,{publishedAt:verifiedPublishedAt,snapshotAt:sourceStamp});
    if(live&&!signal.aborted&&order!==null&&acceptsStoredUpdate(accepted,body)){
     accepted=body;lastOrder=order;
     startTransition(()=>{setPayload(body);setPublishedAt(verifiedPublishedAt);setError(null);});
    }
   }catch{if(live)setError('UPDATE_FAILED');}
   finally{if(live)startTransition(()=>setLoading(false));}
  });
  return()=>{live=false;stop();};
 },[url,enabled]);
 return {payload,loading,error,publishedAt};
}
