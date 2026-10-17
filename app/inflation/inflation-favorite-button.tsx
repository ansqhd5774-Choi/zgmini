"use client";
import {useEffect,useRef,useState} from "react";
import {Star} from "lucide-react";
import "./inflation-favorite-r1.css";

const STORAGE_KEY="zgmini:inflation:favorites:v1";
const CHANGE_EVENT="zgmini:inflation-favorites-change";
const CONTAINER_SELECTOR=".inflation-r2-indicators tbody, .inflation-r2-mobile-list";
const HOST_SELECTOR="tr, article.inflation-r2-mobile-card";
const REORDER_DURATION_MS=420;
let reorderFrame:number|null=null;

function readFavorites(){
 try{
  const parsed=JSON.parse(window.localStorage.getItem(STORAGE_KEY)??"[]");
  return new Set<string>(Array.isArray(parsed)?parsed.filter((value):value is string=>typeof value==="string"):[]);
 }catch{return new Set<string>();}
}
function persistFavorites(favorites:Set<string>){
 try{window.localStorage.setItem(STORAGE_KEY,JSON.stringify([...favorites]));}catch{}
}
function reorderFavoriteContainer(container:HTMLElement,favorites:string[]){
 const nodes=Array.from(container.children).filter((node):node is HTMLElement=>node instanceof HTMLElement);
 if(nodes.length<2)return;
 nodes.forEach((node,index)=>{
  if(node.dataset.favoriteBaseOrder===undefined)node.dataset.favoriteBaseOrder=String(index);
 });
 const rank=(node:HTMLElement)=>{
  const id=node.dataset.favoriteId;
  const favoriteIndex=id?favorites.indexOf(id):-1;
  return favoriteIndex>=0?favoriteIndex:Number.MAX_SAFE_INTEGER;
 };
 const sorted=[...nodes].sort((left,right)=>{
  const leftRank=rank(left),rightRank=rank(right);
  if(leftRank!==rightRank)return leftRank-rightRank;
  return Number(left.dataset.favoriteBaseOrder??0)-Number(right.dataset.favoriteBaseOrder??0);
 });
 if(sorted.every((node,index)=>node===nodes[index]))return;
 const before=new Map(nodes.map(node=>[node,node.getBoundingClientRect().top]));
 sorted.forEach(node=>container.appendChild(node));
 if(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)return;
 sorted.forEach(node=>{
  const previousTop=before.get(node);
  if(previousTop===undefined||typeof node.animate!=="function")return;
  const deltaY=previousTop-node.getBoundingClientRect().top;
  if(Math.abs(deltaY)<1)return;
  node.animate(
   [{transform:`translateY(${deltaY}px)`},{transform:"translateY(0)"}],
   {duration:REORDER_DURATION_MS,easing:"cubic-bezier(.22,.8,.2,1)"},
  );
 });
}
function reorderFavoriteRows(){
 const favorites=[...readFavorites()];
 document.querySelectorAll<HTMLElement>(CONTAINER_SELECTOR).forEach(container=>reorderFavoriteContainer(container,favorites));
}
function scheduleFavoriteReorder(){
 if(reorderFrame!==null)window.cancelAnimationFrame(reorderFrame);
 reorderFrame=window.requestAnimationFrame(()=>{
  reorderFrame=null;
  reorderFavoriteRows();
 });
}

export function InflationFavoriteHeaderIcon(){
 return <span className="inflation-favorite-header-icon" aria-hidden="true"><Star/></span>;
}

export function InflationFavoriteButton({id,label}:{id:string;label:string}){
 const [active,setActive]=useState(false);
 const buttonRef=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  const host=buttonRef.current?.closest(HOST_SELECTOR);
  if(host instanceof HTMLElement)host.dataset.favoriteId=id;
  const sync=()=>{
   setActive(readFavorites().has(id));
   scheduleFavoriteReorder();
  };
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
  scheduleFavoriteReorder();
 };
 const action=active?"즐겨찾기 해제":"즐겨찾기 추가";
 return <button ref={buttonRef} type="button" className={`inflation-favorite-button${active?" is-active":""}`} aria-pressed={active} aria-label={`${label} ${action}`} title={action} onClick={toggle}>
  <Star className="inflation-favorite-icon" aria-hidden="true"/>
 </button>;
}
