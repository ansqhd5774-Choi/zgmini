import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

function compileMetadata(){
 const path=new URL('../app/outbreak-news-metadata-r41.tsx',import.meta.url);
 const source=readFileSync(path,'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{
  jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const mod={exports:{}};
 const nativeRequire=createRequire(path);
 new Function('require','module','exports',code)(id=>{
  if(id==='lucide-react')return {ExternalLink:()=>null,Newspaper:()=>null,ChevronDown:()=>null};
  if(id==='../lib/iran-progress/browser-news-translation-r1.mjs')return {
   needsKoreanTranslation:value=>/[A-Za-z]{3,}/.test(value)&&!/[가-힣]/.test(value),
   translateEnglishNewsText:async()=>{throw Error('SSR must not request translation');}
  };
  return nativeRequire(id);
 },mod,mod.exports);
 return {Component:mod.exports.default,source};
}

test('R41 news metadata carries the free title translator without fabricating a summary',()=>{
 const {Component,source}=compileMetadata();
 assert.match(source,/needsKoreanTranslation\(item\.title\)/);
 assert.match(source,/translateEnglishNewsText\(task\.value,\{cacheId:task\.cacheId,storage\}\)/);
 assert.match(source,/shown\.map\(item=>/);
 assert.match(source,/attemptedTranslations\.current\.has/);
 const item={id:'a'.repeat(64),source:'DW',title:'Iran talks with regional partners',
  publishedAt:'2026-10-28T06:00:00.000Z',sourceUrl:'https://www.dw.com/en/example'};
 const html=renderToStaticMarkup(React.createElement(Component,{eventId:'iran',items:[item]}));
 assert.match(html,/<h4>Iran talks with regional partners<\/h4>/);
 assert.match(html,/https:\/\/www\.dw\.com\/en\/example/);
 assert.match(html,/무료 자동 번역을 시도/);
 assert.doesNotMatch(html,/기사 핵심 요약|긍정 영향|부정 영향/);
});
