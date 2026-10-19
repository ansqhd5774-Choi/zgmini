"use client";
import {useEffect,useState} from "react";
import {Star} from "lucide-react";
// Local UI preference only: no API, DB or publisher writes.
export function EconomicFavoriteButton({domainId,indicatorId,label}:{domainId:string;indicatorId:string;label:string}){
 const key="zgmini:economic:favorites:v1",id=domainId+":"+indicatorId;
 const [favorite,setFavorite]=useState(false);
 useEffect(()=>{try{const parsed=JSON.parse(localStorage.getItem(key)??"[]");setFavorite(Array.isArray(parsed)&&parsed.includes(id));}catch{}},[id]);
 const toggle=()=>{
  try{
   const parsed=JSON.parse(localStorage.getItem(key)??"[]");
   const list=Array.isArray(parsed)?parsed.filter((x):x is string=>typeof x==="string"):[];
   const next=list.includes(id)?list.filter(x=>x!==id):[...list,id];
   localStorage.setItem(key,JSON.stringify(next));setFavorite(next.includes(id));
  }catch{}
 };
 return <button type="button" className="economic-favorite" title={label+" 즐겨찾기 "+(favorite?"해제":"등록")} aria-label={label+" 즐겨찾기 "+(favorite?"해제":"등록")} aria-pressed={favorite} onClick={toggle}>
  <Star size={14} fill={favorite?"#f5bc45":"none"} aria-hidden="true"/>
 </button>;
}