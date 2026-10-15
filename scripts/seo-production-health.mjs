import {readFileSync} from 'node:fs';
import {parseSitemap,waitForCloudflare} from './indexnow-notify.mjs';

const SITE_ORIGIN='https://zgmini.kr';
const REQUEST_TIMEOUT_MS=20_000;
const EXPECTED_PUBLIC_URLS=16;

function attrs(tag){
  const result={};
  for(const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gs)) result[match[1].toLowerCase()]=match[3];
  return result;
}

function tags(html,name){
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, 'gi'))].map(match=>match[0]);
}

function meta(html,key){
  const needle=key.toLowerCase();
  for(const tag of tags(html,'meta')){
    const a=attrs(tag);
    if((a.name??'').toLowerCase()===needle || (a.property??'').toLowerCase()===needle) return a.content??'';
  }
  return '';
}

function canonicalLinks(html){
  const out=[];
  for(const tag of tags(html,'link')){
    const a=attrs(tag);
    const rel=(a.rel??'').toLowerCase().split(/\s+/);
    if(rel.includes('canonical') && a.href) out.push(a.href);
  }
  return out;
}

function stripTags(value){
  return value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
}

function firstTextElement(html,name){
  const match=html.match(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`,'i'));
  return match?stripTags(match[1]):'';
}

export function jsonLdTypes(html){
  const found=new Set();
  for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
    const a=attrs(match[1]);
    if((a.type??'').toLowerCase()!=='application/ld+json') continue;
    let value;
    try{ value=JSON.parse(match[2]); }catch{ continue; }
    const walk=node=>{
      if(Array.isArray(node)){ for(const item of node) walk(item); return; }
      if(!node || typeof node!=='object') return;
      const type=node['@type'];
      if(Array.isArray(type)) for(const item of type) found.add(String(item));
      else if(type) found.add(String(type));
      if(Array.isArray(node['@graph'])) walk(node['@graph']);
    };
    walk(value);
  }
  return found;
}

export function inspectHtml(html,expectedUrl){
  const title=firstTextElement(html,'title');
  const description=meta(html,'description');
  const robots=meta(html,'robots').toLowerCase();
  const canonical=canonicalLinks(html);
  const h1=firstTextElement(html,'h1');
  const types=jsonLdTypes(html);
  const path=new URL(expectedUrl).pathname;
  const errors=[];

  if(!title) errors.push('title_missing');
  if(!description) errors.push('description_missing');
  if(!robots.includes('index') || !robots.includes('follow')) errors.push(`robots_invalid:${robots||'missing'}`);
  if(canonical.length!==1) errors.push(`canonical_count:${canonical.length}`);
  else if(canonical[0]!==expectedUrl) errors.push(`canonical_mismatch:${canonical[0]}`);
  if(!meta(html,'og:title')) errors.push('og_title_missing');
  if(!meta(html,'og:description')) errors.push('og_description_missing');
  if(meta(html,'og:url')!==expectedUrl) errors.push(`og_url_mismatch:${meta(html,'og:url')||'missing'}`);
  if(!meta(html,'twitter:title')) errors.push('twitter_title_missing');
  if(!meta(html,'twitter:description')) errors.push('twitter_description_missing');
  if(!h1) errors.push('h1_missing');

  if(path==='/'){
    if(!types.has('WebSite')) errors.push('jsonld_website_missing');
    if(!types.has('Organization')) errors.push('jsonld_organization_missing');
  }else{
    if(!types.has('WebPage')) errors.push('jsonld_webpage_missing');
    if(!types.has('BreadcrumbList')) errors.push('jsonld_breadcrumb_missing');
    if(path.startsWith('/guides/') && !types.has('Article')) errors.push('jsonld_article_missing');
  }

  return {title,description,robots,canonical,h1,types:[...types],errors};
}

export function liveSitemapEntries(xml){
  const result=new Map();
  for(const match of xml.matchAll(/<url>\s*<loc>(https:\/\/zgmini\.kr\/[^<]*)<\/loc>\s*<lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod>\s*<\/url>/g)){
    result.set(match[1],match[2]);
  }
  return result;
}

async function fetchText(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{cache:'no-store',headers:{'cache-control':'no-cache','user-agent':'zgmini-seo-production-health-r2'},signal:controller.signal});
    const text=await response.text();
    return {status:response.status,contentType:response.headers.get('content-type')??'',text};
  }finally{
    clearTimeout(timeout);
  }
}

async function checkPage(url,sha){
  const live=new URL(url);
  live.searchParams.set('seo_health',sha.slice(0,12));
  const response=await fetchText(live.href);
  const errors=[];
  if(response.status!==200) errors.push(`http_${response.status}`);
  if(!response.contentType.toLowerCase().includes('text/html')) errors.push(`content_type:${response.contentType||'missing'}`);
  const inspected=inspectHtml(response.text,url);
  errors.push(...inspected.errors);
  return {url,errors};
}

async function main(){
  const repository=process.env.GITHUB_REPOSITORY;
  const sha=process.env.GITHUB_SHA;
  const token=process.env.SEO_HEALTH_GITHUB_TOKEN;
  if(!repository || !sha || !token) throw new Error('SEO_HEALTH_ENV_MISSING');

  const localSitemap=readFileSync('public/sitemap.xml','utf8');
  const publicUrls=parseSitemap(localSitemap);
  if(publicUrls.length!==EXPECTED_PUBLIC_URLS) throw new Error(`SEO_HEALTH_PUBLIC_URL_COUNT:${publicUrls.length}`);

  const check=await waitForCloudflare({repository,sha,token});
  console.log(`SEO_HEALTH_CLOUDFLARE_PASS=${check.id}`);

  const sitemapResponse=await fetchText(`${SITE_ORIGIN}/sitemap.xml?seo_health=${sha.slice(0,12)}`);
  if(sitemapResponse.status!==200) throw new Error(`SEO_HEALTH_SITEMAP_HTTP_${sitemapResponse.status}`);
  const liveEntries=liveSitemapEntries(sitemapResponse.text);
  const sitemapErrors=[];
  for(const url of publicUrls){
    if(!liveEntries.has(url)) sitemapErrors.push(`missing:${url}`);
  }
  if(liveEntries.size!==EXPECTED_PUBLIC_URLS) sitemapErrors.push(`count:${liveEntries.size}`);
  if(sitemapErrors.length) throw new Error(`SEO_HEALTH_SITEMAP_FAIL:${sitemapErrors.join(',')}`);
  console.log(`SEO_HEALTH_SITEMAP_PASS=${liveEntries.size}`);

  const failures=[];
  for(let offset=0;offset<publicUrls.length;offset+=4){
    const batch=publicUrls.slice(offset,offset+4);
    const results=await Promise.all(batch.map(url=>checkPage(url,sha).catch(error=>({url,errors:[`fetch:${error?.name??'Error'}:${error?.message??String(error)}`]}))));
    for(const result of results){
      if(result.errors.length){
        failures.push(`${result.url}=>${result.errors.join('|')}`);
        console.error(`SEO_HEALTH_URL_FAIL=${result.url} ${result.errors.join('|')}`);
      }else{
        console.log(`SEO_HEALTH_URL_PASS=${result.url}`);
      }
    }
  }

  if(failures.length) throw new Error(`SEO_HEALTH_FAILED=${failures.length}\n${failures.join('\n')}`);
  console.log(`SEO_HEALTH_PASS=${publicUrls.length}`);
}

if(import.meta.url===new URL(process.argv[1], 'file:').href){
  main().catch(error=>{
    console.error(error?.stack??String(error));
    process.exitCode=1;
  });
}
