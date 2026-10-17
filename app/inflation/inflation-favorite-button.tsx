"use client";
import {useEffect,useState} from "react";
import {Star} from "lucide-react";
import "./inflation-favorite-r1.css";

const STORAGE_KEY="zgmini:inflation:favorites:v1";
const CHANGE_EVENT="zgmini:inflation-favorites-change";

function readFavorites(){
 try{
  const parsed=JSON.parse(window.localStorage.getItem(STORAGE_KEY)??"[]");
  return new Set<string>(Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==="string"):[]);
 }catch{return new Set<string>();}
}
function persistFavorites(favorites:Set<string>){
 try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify([...favorites]));}catch{}
}

export function InflationFavoriteHeaderIcon(){
 return <span className="inflation-favorite-header-icon" aria-hidden="true"><Star/></span>;
}

export function InflationFavoriteButton({id,label}:{id:string;label:string}){
 const [active,setActive]=useState(false);
 useEffect(()=>{
  const sync=()=>setActive(readFavorites().has(id));
  const onStorage=(event:StorageEvent)=>{if(event.key===STORAGE_KEY)sync();};
  sync();
  window.addEventListener(CHANGE_EVENT,sync);
  window.addEventListener("storage",onStorage);
  return()=>{
   window.removeEventListener(CHANGE_EVENT,sync);
   window.removeEventListener("storage",onStorage);
  };
 },[id]);
 const toggle=()=>{
  const favorites=readFavorites();
  if(favorites.has(id))favorites.delete(id);else favorites.add(id);
  persistFavorites(favorites);
  setActive(favorites.has(id));
  window.dispatchEvent(new Event(CHANGE_EVENT));
 };
 const action=active?"즐겨찾기 해제":"즐겨찾기 추가";
 return <button type="button" className={`inflation-favorite-button${active?" is-active":""}`} aria-pressed={active} aria-label={`${label} ${action}`} title={action} onClick={toggle}>
  <Star className="inflation-favorite-icon" aria-hidden="true"/>
 </button>;
}
