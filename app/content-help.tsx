"use client";
import {useEffect,useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';import {Info} from 'lucide-react';
import './content-help.css';
export function ContentHelp({label,children,trigger}:{label:string;children:ReactNode;trigger?:ReactNode}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState({left:12,top:12}),id=useId();
 const root=useRef<HTMLSpanElement>(null),tip=useRef<HTMLDivElement>(null),pointer=useRef('');
 const desktop=()=>matchMedia('(hover: hover) and (pointer: fine)').matches;
 useLayoutEffect(()=>{if(!open)return;const place=()=>{const r=root.current?.getBoundingClientRect(),t=tip.current?.getBoundingClientRect();if(!r||!t)return;
  const left=Math.max(12,Math.min(r.left,innerWidth-t.width-12));
  const below=r.bottom+8,top=below+t.height<=innerHeight-12?below:Math.max(12,r.top-t.height-8);
  setPosition({left,top});};place();addEventListener('resize',place);addEventListener('scroll',place,true);return()=>{removeEventListener('resize',place);removeEventListener('scroll',place,true);};},[open]);
 useEffect(()=>{if(!open)return;const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node)&&!tip.current?.contains(e.target as Node))setOpen(false);};const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[open]);
 return <span ref={root} className="zg-help" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')setOpen(false);e.stopPropagation();}}
  onPointerEnter={e=>{if(e.pointerType==='mouse'&&desktop())setOpen(true);}} onPointerLeave={e=>{if(e.pointerType==='mouse'&&desktop())setOpen(false);}}
  onBlur={e=>{if(!root.current?.contains(e.relatedTarget)&&!tip.current?.contains(e.relatedTarget))setOpen(false);}}>
  <button type="button" className="zg-help-trigger" aria-label={label} aria-expanded={open} aria-describedby={open?id:undefined}
   onPointerDown={e=>{pointer.current=e.pointerType;e.stopPropagation();}} onKeyDown={()=>{pointer.current='keyboard';}}
   onFocus={()=>{if(pointer.current!=='touch')setOpen(true);}}
   onClick={()=>{if(desktop()&&pointer.current!=='touch')setOpen(true);else setOpen(v=>!v);}}>{trigger??<Info size={15} aria-hidden="true"/>}</button>
  {open&&createPortal(<div ref={tip} id={id} role="tooltip" className="zg-help-popover" style={position} onClick={e=>e.stopPropagation()}><strong>{label.replace(/ 도움말$| 안내$| 산출 근거$| 해석 방향$/,'')}</strong><div>{children}</div></div>,document.body)}
 </span>;
}
