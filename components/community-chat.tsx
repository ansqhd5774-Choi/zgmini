"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Flag,MessageCircle,Send,X} from "lucide-react";
import "./community-chat.css";

type ChatMessage={id:string;nickname:string;body:string;created_at:string};
type ChatResponse={messages?:ChatMessage[];writeEnabled?:boolean;siteKey?:string|null;error?:string};
type TurnstileApi={render:(element:HTMLElement,options:Record<string,unknown>)=>string;reset:(id:string)=>void;remove:(id:string)=>void};
declare global {interface Window {turnstile?:TurnstileApi}}
const REFRESH_MS=5000;
function displayTime(iso:string){const date=new Date(iso);return Number.isNaN(date.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",hour:"2-digit",minute:"2-digit",hour12:false}).format(date);}
export default function CommunityChat({enabled}:{enabled:boolean}){
 const [open,setOpen]=useState(false);
 const [everOpened,setEverOpened]=useState(false);
 const [nickname,setNickname]=useState("");
 const [draft,setDraft]=useState("");
 const [messages,setMessages]=useState<ChatMessage[]>([]);
 const [status,setStatus]=useState<"loading"|"ready"|"offline">("loading");
 const [writeEnabled,setWriteEnabled]=useState(false);
 const [siteKey,setSiteKey]=useState<string|null>(null);
 const [captchaToken,setCaptchaToken]=useState("");
 const captchaMount=useRef<HTMLDivElement>(null);
 const captchaWidget=useRef<string|null>(null);
 const [sending,setSending]=useState(false);
 const [error,setError]=useState("");
 const [reported,setReported]=useState<string[]>([]);
 const listRef=useRef<HTMLDivElement>(null);
 const inputRef=useRef<HTMLInputElement>(null);
 const inFlight=useRef(false);
 const lastMessageId=useRef<string|null>(null);
 useEffect(()=>{
  try{const key="zgmini-community-chat-nick-r1";let value=sessionStorage.getItem(key);
   if(!value){const random=crypto.getRandomValues(new Uint32Array(1))[0]%9000+1000;value="익명"+random;sessionStorage.setItem(key,value);}
   setNickname(value);
  }catch{setNickname("익명방문자");}
 },[]);
 useEffect(()=>{if(open){setEverOpened(true);requestAnimationFrame(()=>inputRef.current?.focus());}else{setCaptchaToken("");}},[open]);
 useEffect(()=>{if(!open)return;const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};window.addEventListener("keydown",onKey);return()=>window.removeEventListener("keydown",onKey);},[open]);
 useEffect(()=>{
  if(!enabled||!open)return;
  let stopped=false;
  async function load(){
   if(inFlight.current)return;inFlight.current=true;
   try{
    const response=await fetch("/api/community/messages",{cache:"no-store",headers:{accept:"application/json"}});
    if(!response.ok)throw new Error("SERVER_UNAVAILABLE");
    const payload=(await response.json()) as ChatResponse;
    if(!stopped){
     setMessages(Array.isArray(payload.messages)?payload.messages:[]);
     setWriteEnabled(payload.writeEnabled===true);
     setSiteKey(typeof payload.siteKey==="string"?payload.siteKey:null);
     setStatus("ready");
     setError("");
     const last=payload.messages?.at(-1)?.id??null;
     if(last&&last!==lastMessageId.current){lastMessageId.current=last;requestAnimationFrame(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;});}
    }
   }catch{if(!stopped){setStatus("offline");setWriteEnabled(false);setError("서버 연결 준비 중");}}
   finally{inFlight.current=false;}
  }
  void load();const timer=window.setInterval(()=>void load(),REFRESH_MS);
  return()=>{stopped=true;window.clearInterval(timer);};
 },[enabled,open]);

 useEffect(()=>{
  if(!open||!writeEnabled||!siteKey)return;
  let active=true;
  function mount(){
   const api=window.turnstile;
   if(!active||!api||!captchaMount.current||captchaWidget.current)return;
   captchaWidget.current=api.render(captchaMount.current,{sitekey:siteKey,theme:"dark",callback:(token:unknown)=>{if(active)setCaptchaToken(typeof token==="string"?token:"");},"expired-callback":()=>{if(active)setCaptchaToken("");},"error-callback":()=>{if(active)setCaptchaToken("");}});
  }
  let script=document.querySelector<HTMLScriptElement>("#zg-community-turnstile");
  if(!script){script=document.createElement("script");script.id="zg-community-turnstile";script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;script.defer=true;document.head.appendChild(script);}
  script.addEventListener("load",mount);
  mount();
  return()=>{active=false;script?.removeEventListener("load",mount);if(captchaWidget.current&&window.turnstile)window.turnstile.remove(captchaWidget.current);captchaWidget.current=null;};
 },[open,writeEnabled,siteKey]);

 async function report(messageId:string){
  if(reported.includes(messageId))return;
  try{const response=await fetch("/api/community/reports",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messageId,reason:"inappropriate"})});
   if(response.ok)setReported(current=>[...current,messageId]);else setError("신고 접수에 실패했습니다.");
  }catch{setError("신고 접수에 실패했습니다.");}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const body=draft.trim();
  if(!body||[...body].length>300||sending||status!=="ready"||!writeEnabled||!captchaToken)return;
  setSending(true);setError("");
  try{
   const response=await fetch("/api/community/messages",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nickname,body,turnstileToken:captchaToken})});
   if(!response.ok){setError(response.status===429?"잠시 후 다시 작성해 주세요.":"메시지 전송에 실패했어요.");return;}
   setDraft("");
   const result=await fetch("/api/community/messages",{cache:"no-store"});
   if(result.ok){const payload=(await result.json()) as ChatResponse;setMessages(payload.messages??[]);requestAnimationFrame(()=>{if(listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;});}
  }catch{setError("연결을 확인하고 다시 시도해 주세요.");}
  finally{setSending(false);setCaptchaToken("");if(captchaWidget.current&&window.turnstile)window.turnstile.reset(captchaWidget.current);}
 }
 if(!enabled)return null;
 return <div className="zg-community-root">
  <div id="zg-community-chat-panel" className={`zg-community-panel ${open?"is-open":everOpened?"is-closed was-open":"is-closed"}`} aria-label="ZGMINI 시장 채팅" aria-hidden={!open} inert={!open}>
   <div className="zg-community-head"><strong>시장 채팅</strong><span>{status==="ready"?(writeEnabled?"대화 가능":"읽기 전용"):"연결 대기"}</span><button type="button" aria-label="채팅창 닫기" onClick={()=>setOpen(false)}><X size={17}/></button></div>
   <div className="zg-community-messages" ref={listRef} role="log" aria-label="시장 채팅 메시지">
    {messages.length===0&&<p className="zg-community-empty">{status==="ready"?"아직 대화가 없어요. 시장에 대한 생각을 남겨 보세요.":"현재 채팅 서비스를 준비하고 있습니다."}</p>}
    {messages.map(m=><article className="zg-community-item" key={m.id}>
     <div className="zg-community-line">
      <div className="zg-community-copy"><b>{m.nickname}</b><span className="zg-community-separator">{" : "}</span><span className="zg-community-body" title={m.body}>{m.body}</span><time dateTime={m.created_at}>{` ${displayTime(m.created_at)}`}</time></div>
      <button type="button" className="zg-community-report" aria-label={reported.includes(m.id)?"신고 완료":"메시지 신고"} disabled={reported.includes(m.id)} onClick={()=>void report(m.id)}><Flag size={13} aria-hidden="true"/></button>
     </div>
    </article>)}
   </div>
   <form className="zg-community-compose" onSubmit={submit}>
    <label htmlFor="zg-community-input">{nickname||"익명"} · 공개 채팅</label>
    {writeEnabled&&siteKey&&<div className={`zg-community-captcha${captchaToken?" is-verified":""}`} ref={captchaMount} aria-label="봇 방지 인증" aria-hidden={Boolean(captchaToken)}/>}
    <div><input id="zg-community-input" ref={inputRef} value={draft} onChange={event=>setDraft(event.target.value)} placeholder={writeEnabled?"시장에 대한 의견 입력":"채팅 연결 후 입력 가능"} maxLength={300} disabled={status!=="ready"||!writeEnabled||sending} autoComplete="off"/><button type="submit" aria-label="메시지 전송" disabled={status!=="ready"||!writeEnabled||sending||!captchaToken||!draft.trim()}><Send size={16}/></button></div>
    <small role="status">{error||"누구나 볼 수 있는 공개 채팅입니다. 개인정보를 공유하지 마세요."}</small>
   </form>
  </div>
  <button type="button" className="zg-community-toggle" aria-controls="zg-community-chat-panel" aria-expanded={open} aria-label={open?"시장 채팅 닫기":"시장 채팅 열기"} onClick={()=>setOpen(v=>!v)}><MessageCircle size={21}/><span aria-hidden="true">채팅</span></button>
 </div>;
}
