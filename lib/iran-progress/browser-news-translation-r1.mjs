// Browser-only translation of publicly displayed article metadata.
// No paid API, credentials, server writes, or changes to news collection/scoring.
export const FREE_TRANSLATION_PROVIDER='MyMemory';
export const FREE_TRANSLATION_DAILY_CHARS=4000;
const TRANSLATION_ENDPOINT='https://api.mymemory.translated.net/get';
const CACHE_PREFIX='zgmini:outbreak:news-ko:r1:';
const CACHE_TTL_MS=30*86400000;
const MAX_CHUNK_BYTES=450; // MyMemory Get accepts up to 500 UTF-8 bytes.
const MAX_CHUNKS=4;
const utf8=new TextEncoder();

export function needsKoreanTranslation(value){
 return typeof value==='string'&&!/[가-힣]/.test(value)&&/[A-Za-z]{3,}/.test(value);
}

export function splitNewsTranslationText(value,maxBytes=MAX_CHUNK_BYTES){
 if(typeof value!=='string'||!value.trim()||!Number.isInteger(maxBytes)||maxBytes<20)return [];
 const words=value.trim().split(/\s+/),chunks=[];
 let current='';
 for(const word of words){
  if(utf8.encode(word).byteLength>maxBytes)return [];
  const candidate=current?`${current} ${word}`:word;
  if(utf8.encode(candidate).byteLength<=maxBytes){current=candidate;continue;}
  if(current)chunks.push(current);
  current=word;
 }
 if(current)chunks.push(current);
 return chunks.length<=MAX_CHUNKS?chunks:[];
}

function storageRead(storage,key){try{return storage?.getItem(key)??null;}catch{return null;}}
function storageWrite(storage,key,value){try{storage?.setItem(key,value);return true;}catch{return false;}}
function kstDate(now){return new Date(now+9*3600000).toISOString().slice(0,10);}
function reserveFreeChars(storage,characters,now){
 if(!storage||!Number.isInteger(characters)||characters<1)return false;
 const key=`${CACHE_PREFIX}budget:${kstDate(now)}`;
 const previous=Number(storageRead(storage,key)??'0');
 if(!Number.isSafeInteger(previous)||previous<0||previous+characters>FREE_TRANSLATION_DAILY_CHARS)return false;
 return storageWrite(storage,key,String(previous+characters));
}

function cachedTranslation(storage,cacheId,text,now){
 const raw=storageRead(storage,`${CACHE_PREFIX}text:${cacheId}`);
 if(!raw)return null;
 try{
  const value=JSON.parse(raw);
  return value?.source===text&&typeof value.translation==='string'&&/[가-힣]/.test(value.translation)
   &&Number.isFinite(value.savedAt)&&now-value.savedAt>=0&&now-value.savedAt<=CACHE_TTL_MS?value.translation:null;
 }catch{return null;}
}

function validTranslation(response){
 if(response?.responseStatus!==200||response?.quotaFinished===true||typeof response?.responseData?.translatedText!=='string')return null;
 const translated=response.responseData.translatedText.replace(/&quot;/g,'"').replace(/&#(?:39|x27);/gi,"'").replace(/&amp;/g,'&').trim();
 return translated.length>0&&/[가-힣]/.test(translated)?translated:null;
}

/**
 * Automatic, free-only English-to-Korean translation. A failure preserves the original.
 * @param {string} text
 * @param {{cacheId?:string,storage?:Storage|null,fetcher?:typeof fetch,now?:number}} [options]
 */
export async function translateEnglishNewsText(text,{cacheId,storage,fetcher=fetch,now=Date.now()}={}){
 if(!needsKoreanTranslation(text)||typeof cacheId!=='string'||!/^[a-zA-Z0-9:_-]{1,150}$/.test(cacheId))return null;
 const saved=cachedTranslation(storage,cacheId,text,now);
 if(saved)return saved;
 const chunks=splitNewsTranslationText(text);
 if(!chunks.length)return null;
 const translated=[];
 for(const chunk of chunks){
  // Limit the originating browser below the provider's anonymous free daily allowance.
  if(!reserveFreeChars(storage,utf8.encode(chunk).byteLength,now))return null;
  const url=new URL(TRANSLATION_ENDPOINT);
  url.searchParams.set('q',chunk);
  url.searchParams.set('langpair','en|ko');
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetcher(url.toString(),{method:'GET',mode:'cors',credentials:'omit',signal:controller.signal});
   if(!response.ok)return null;
   const value=validTranslation(await response.json());
   if(!value)return null;
   translated.push(value);
  }catch{return null;}
  finally{clearTimeout(timeout);}
 }
 const result=translated.join(' ').trim();
 if(result)storageWrite(storage,`${CACHE_PREFIX}text:${cacheId}`,JSON.stringify({source:text,translation:result,savedAt:now}));
 return result||null;
}
