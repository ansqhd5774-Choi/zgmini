import test from 'node:test';
import assert from 'node:assert/strict';
import {FREE_TRANSLATION_DAILY_CHARS,needsKoreanTranslation,splitNewsTranslationText,translateEnglishNewsText} from '../lib/iran-progress/browser-news-translation-r1.mjs';

function memoryStorage(){
 const values=new Map();
 return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value),values};
}
const clock=Date.parse('2026-10-28T02:00:00Z');
const translated={ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'영국, 이란에 핵 사찰 허용 촉구'}})};

test('translate only English metadata, never overwrite existing Korean news',()=>{
 assert.equal(needsKoreanTranslation('Iran must allow IAEA inspectors'),true);
 assert.equal(needsKoreanTranslation('영국, 이란에 핵 사찰 허용 촉구'),false);
 assert.equal(needsKoreanTranslation('2026-10-28'),false);
 assert.equal(needsKoreanTranslation('이란 IAEA nuclear inspectors'),false);
});

test('split text within the provider 500-byte request limit',()=>{
 const parts=splitNewsTranslationText('The UK calls on Iran to allow inspections. '.repeat(34));
 assert.equal(parts.length>1,true);
 assert.equal(parts.every(part=>new TextEncoder().encode(part).byteLength<=450),true);
 assert.deepEqual(splitNewsTranslationText('a'.repeat(501)),[]);
});

test('automatic translation uses no credentials and caches the Korean result',async()=>{
 const storage=memoryStorage(),calls=[];
 const fetcher=async(url,options)=>{calls.push({url,options});return translated;};
 const text='The UK calls on Iran to allow inspections';
 const args={cacheId:'gov-1:title',storage,fetcher,now:clock};
 assert.equal(await translateEnglishNewsText(text,args),'영국, 이란에 핵 사찰 허용 촉구');
 assert.equal(await translateEnglishNewsText(text,args),'영국, 이란에 핵 사찰 허용 촉구');
 assert.equal(calls.length,1);
 assert.equal(new URL(calls[0].url).searchParams.get('langpair'),'en|ko');
 assert.equal(calls[0].options.credentials,'omit');
 assert.equal('headers' in calls[0].options,false);
});

test('free daily allowance is guarded and failures return original via null',async()=>{
 const storage=memoryStorage(),calls=[];
 const fetcher=async()=>{calls.push(1);return translated;};
 for(let i=0;i<20;i++)await translateEnglishNewsText('The UK calls on Iran to allow inspections. '.repeat(7),{cacheId:`gov-${i}:title`,storage,fetcher,now:clock});
 const key=[...storage.values.keys()].find(key=>key.includes(':budget:'));
 assert.ok(Number(storage.getItem(key))<=FREE_TRANSLATION_DAILY_CHARS);
 assert.ok(calls.length<20);
 const failing=await translateEnglishNewsText('International inspection talks',{
  cacheId:'fail:title',storage:memoryStorage(),fetcher:async()=>({ok:false,status:429}),now:clock});
 assert.equal(failing,null);
});
