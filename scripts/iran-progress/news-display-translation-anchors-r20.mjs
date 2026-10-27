// Source-bound translation anchors. Their exact preservation is mandatory;
// any missing/duplicated anchor blocks the draft instead of guessing a fact.

const MONTHS={january:1,february:2,march:3,april:4,may:5,june:6,
 july:7,august:8,september:9,october:10,november:11,december:12};
const MONTH_NAMES=Object.keys(MONTHS).join('|');
const ANCHOR_ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TERM_MAP=[
 [/\bMs\s+Ann\s+Snow\s+MBE\b/gi,'앤 스노(MBE)'],
 [/\bMs\s+Abda\s+Sharif\s+OBE\b/gi,'압다 샤리프(OBE)'],
 [/\bEd\s+Miliband\b/gi,'에드 밀리밴드'],
 [/\bAttorney\s+General['’]s\b/gi,'법무장관의'],
 [/\bAttorney\s+General\b/gi,'법무장관'],
 [/\bKingdom\s+of\s+Saudi\s+Arabia\b/gi,'사우디아라비아 왕국'],
 [/\bRepublic\s+of\s+T(?:ü|u)rkiye\b/gi,'튀르키예 공화국'],
 [/\bArab\s+Republic\s+of\s+Egypt\b/gi,'이집트 아랍 공화국'],
 [/\bIslamic\s+Republic\s+of\s+Pakistan\b/gi,'파키스탄 이슬람 공화국'],
 [/\bRepublic\s+of\s+Yemen\b/gi,'예멘 공화국'],
 [/\bStrait\s+of\s+Hormuz\b/gi,'호르무즈 해협'],
 [/\bUN\s+Security\s+Council\b/gi,'유엔 안전보장이사회'],
 [/\bUnited\s+Kingdom\b/gi,'영국'],
 [/\bUnited\s+States\b/gi,'미국'],
 [/\bTwo.state\s+solution\b/gi,'두 국가 해법'],
 [/\bnuclear\s+safeguards\b/gi,'핵 안전조치'],
 [/\bcommercial\s+ships\b/gi,'상선'],
 [/\bdeterrence\b/gi,'억지력'],
 [/\bHouthis?\b/gi,'후티'],
 [/\bEl\s+Ni(?:n|ñ)o\b/gi,'엘니뇨'],
 [/\bCOVID(?:-19)?\b/gi,'코로나19'],
 [/\bDPRK['’]s\b/gi,'북한의'],
 [/\bDPRK\b/gi,'북한'],
 [/\bUK['’]s\b/gi,'영국의'],
 [/\bUK\b/gi,'영국'],
 [/\bU\.S\.\b/gi,'미국'],
 [/\bIran['’]s\b/gi,'이란의'],
 [/\bRussia['’]s\b/gi,'러시아의'],
 [/\bSaudi\s+Arabia\b/gi,'사우디아라비아'],
 [/\bTürkiye\b/gi,'튀르키예'],
 [/\bYemen\b/gi,'예멘'],
 [/\bIran\b/gi,'이란'],
 [/\bRussia\b/gi,'러시아'],
 [/\bUkraine\b/gi,'우크라이나'],
 [/\bFrance\b/gi,'프랑스'],
 [/\bGermany\b/gi,'독일'],
 [/\bItaly\b/gi,'이탈리아'],
 [/\bIsraelis\b/gi,'이스라엘인'],
 [/\bPalestinians\b/gi,'팔레스타인인'],
 [/\bTrump\b/gi,'트럼프'],
];

function anchorName(index){
 if(!Number.isSafeInteger(index)||index<0||index>=676)
  throw Error('R20_TOO_MANY_ANCHORS');
 return 'ZXANCHOR'+ANCHOR_ALPHABET[Math.floor(index/26)]+ANCHOR_ALPHABET[index%26]+'XZ';
}

export function protectEnglishNewsTextR20(original){
 if(typeof original!=='string'||original.length>1600||!original.trim())
  throw Error('R20_SOURCE_TEXT_INVALID');
 const anchors=[];
 const add=korean=>{
  const id=anchorName(anchors.length);
  anchors.push({id,korean});
  return id;
 };
 let text=original;
 const datePattern=new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})(?:\\s+(\\d{4}))?\\b`,'gi');
 text=text.replace(datePattern,(_whole,day,month,year)=>{
  const monthNumber=MONTHS[month.toLowerCase()];
  if(Number(day)<1||Number(day)>31)return _whole;
  return add(year?`${year}년 ${monthNumber}월 ${Number(day)}일`:`${monthNumber}월 ${Number(day)}일`);
 });
 for(const [pattern,korean] of TERM_MAP)text=text.replace(pattern,()=>add(korean));
 return {original,prepared:text,anchors};
}

export function restoreProtectedTranslationR20(output,protectedText){
 if(typeof output!=='string'||!protectedText||!Array.isArray(protectedText.anchors))
  throw Error('R20_MODEL_TEXT_INVALID');
 let restored=output;
 const missing=[];
 for(const anchor of protectedText.anchors){
  const escaped=anchor.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const regex=new RegExp(escaped,'gi');
  const occurrences=(restored.match(regex)??[]).length;
  if(occurrences!==1){missing.push(anchor.id);continue;}
  restored=restored.replace(regex,anchor.korean);
 }
 if(/ZXANCHOR[A-Z]{2}XZ/i.test(restored))missing.push('UNKNOWN_ANCHOR_LEFTOVER');
 return {text:restored.trim(),missing};
}

export function numericFactTokensR20(text,{sourceEnglish=false}={}){
 if(typeof text!=='string')return [];
 let normalized=text;
 if(sourceEnglish){
  const datePattern=new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_NAMES})(?:\\s+(\\d{4}))?\\b`,'gi');
  normalized=normalized.replace(datePattern,(_,day,month,year)=>
   `${year??''} ${MONTHS[month.toLowerCase()]} ${Number(day)}`);
  for(const [month,index] of Object.entries(MONTHS)){
   normalized=normalized.replace(new RegExp('\\b'+month+'\\b','gi'),String(index));
  }
  normalized=normalized.replace(/\b(?:First)\s+Committee\b/gi,'1 Committee');
  normalized=normalized.replace(/\bCOVID(?:-19)?\b/gi,'COVID19');
 }else{
  normalized=normalized.replace(/\b(?:코로나|코비드)\s*19\b/g,'COVID19');
 }
 return (normalized.match(/\d+/g)??[]).sort((a,b)=>Number(a)-Number(b));
}

export function compareNumericFactsR20(english,korean){
 const source=numericFactTokensR20(english,{sourceEnglish:true});
 const target=numericFactTokensR20(korean);
 return {matched:source.join('|')===target.join('|'),source,target};
}

export function semanticWarningsR20(english,korean){
 if(typeof english!=='string'||typeof korean!=='string')return ['TEXT_INVALID'];
 const issues=[];
 const add=(bad,tag)=>{if(bad)issues.push(tag);};
 add(/\b(?:unable to|cannot|could not)\b/i.test(english)&&
  !/불가능|할 수 없|못하|못했|통과할 수 없|항해할 수 없/.test(korean),'MISSING_INABILITY');
 add(/\brising\b/i.test(english)&&
  !/상승|증가|오르|높아|급등/.test(korean),'MISSING_INCREASE');
 add(/\bEl\s+Ni(?:n|ñ)o\b/i.test(english)&&!/엘니뇨/.test(korean),'MISSING_EL_NINO');
 add(!/\bcyber\b/i.test(english)&&/사이버/.test(korean),'UNSUPPORTED_CYBER');
 add(!/\b(?:sanction|penali[sz]|restrictive measure)\b/i.test(english)&&/제재/.test(korean),'UNSUPPORTED_SANCTION');
 add(!/\b(?:doctor|dr\.|phd|ph\.d\.)\b/i.test(english)&&/박사/.test(korean),'UNSUPPORTED_DOCTOR');
 add(!/\b(?:end|stop|halt|cease|terminate|discontinue|shut down)\b/i.test(english)&&
  /중단시키|중지시키/.test(korean),'UNSUPPORTED_TERMINATION');
 add(/\bnon.compliance\b/i.test(english)&&
  !/불이행|미준수|준수하지|위반/.test(korean),'MISSING_NONCOMPLIANCE');
 return issues;
}
