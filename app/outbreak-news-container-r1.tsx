"use client";

import {useEffect,useState} from "react";
import {useStoredIndex} from "../components/use-stored-index";
import {visibleIranNewsItems} from "../lib/iran-progress/news-display-r1.mjs";
import OutbreakNewsUI,{type OutbreakNewsItem} from "./outbreak-news-r57";
import OutbreakNewsMetadataR41,{type IranNewsMetadataItemR41} from "./outbreak-news-metadata-r41";

// Only this display-only container requests the separately published news key.
// Iran chart, scoring, R3/R5 collector, and the original news UI remain untouched.
export default function OutbreakNewsContainer({eventId}:{eventId:string}){
 const [currentTime,setCurrentTime]=useState(()=>Date.now());
 useEffect(()=>{
  const timer=window.setInterval(()=>setCurrentTime(Date.now()),60_000);
  return()=>window.clearInterval(timer);
 },[]);
 const {payload,loading,error}=useStoredIndex<{status:string;items:OutbreakNewsItem[]}>("/api/outbreak-news/iran");
 // R41 is an independent, metadata-only read model. Retain R1 fallback
 // for empty or unavailable R41 responses, not for a zero-news publisher.
 const newer=useStoredIndex<{status:string;sourceCount:number;itemCount:number;
  items:IranNewsMetadataItemR41[]}>("/api/outbreak-news/iran/r41");
 if(newer.payload?.status==="READY"&&
  newer.payload.itemCount>0&&Array.isArray(newer.payload.items)&&
  newer.payload.items.length===newer.payload.itemCount)
  return <OutbreakNewsMetadataR41 eventId={eventId} items={newer.payload.items}/>;
 const items:Array<OutbreakNewsItem>=Array.isArray(payload?.items)?visibleIranNewsItems(payload.items,{now:currentTime}):[];
 const newsState=error?"error":loading?"loading":payload?.status==="PENDING"?"pending":payload?.status==="UPDATE_DELAYED"?"delayed":"ready";
 return <OutbreakNewsUI eventId={eventId} items={items} newsState={newsState}/>;
}
