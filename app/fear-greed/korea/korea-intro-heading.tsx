"use client";
import {Info} from "lucide-react";
import {useId,useState,type ReactNode} from "react";

/* Korea's original introduction and methodology stay visible on desktop.
 * On mobile, only their presentation changes to the title's info disclosure. */
export default function KoreaIntroHeading({children}:{children:ReactNode}){
 const [expanded,setExpanded]=useState(false);
 const introId=useId();
 return <>
  <button type="button" className="zg-fg-intro-button" aria-label="한국 공포탐욕지수 소개" aria-controls={introId} aria-expanded={expanded} onClick={()=>setExpanded(was=>!was)}>
   <Info size={15} strokeWidth={2} aria-hidden="true"/>
  </button>
  <div id={introId} className={`zg-fg-korea-intro-content${expanded?" zg-fg-korea-intro-content--expanded":""}`}>
   {children}
  </div>
 </>;
}
