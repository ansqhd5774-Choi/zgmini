"use client";

import {useStoredIndex} from "../components/use-stored-index";
import {visibleIranNewsItems} from "../lib/iran-progress/news-display-r1.mjs";
import OutbreakNewsUI,{type OutbreakNewsItem} from "./outbreak-news-r57";

// Only this display-only container requests the separately published news key.
// Iran chart, scoring, R3/R5 collector, and the original news UI remain untouched.
export default function OutbreakNewsContainer({eventId}:{eventId:string}){
 const {payload,loading,error}=useStoredIndex<{status:string;items:OutbreakNewsItem[]}>("/api/outbreak-news/iran");
 const items:Array<OutbreakNewsItem>=Array.isArray(payload?.items)?visibleIranNewsItems(payload.items,{now:Date.now()}):[];
 const newsState=error?"error":loading?"loading":payload?.status==="PENDING"?"pending":payload?.status==="UPDATE_DELAYED"?"delayed":"ready";
 return <OutbreakNewsUI eventId={eventId} items={items} newsState={newsState}/>;
}
