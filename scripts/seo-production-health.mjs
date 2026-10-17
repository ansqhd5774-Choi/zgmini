import {readFileSync} from 'node:fs';
import {parseSitemap,waitForCloudflare} from './indexnow-notify.mjs';

const SITE_ORIGIN='https://zgmini.kr';
const REQUEST_TIMEOUT_MS=20_000;
const EXPECTED_PUBLIC_URLS=16;

export const SEO_RUNTIME_MARKERS=new Map([
  [`${SITE_ORIGIN}/`,{titleIncludes:'미국·한국 공포탐욕지수와 경제지표'}],
  [`${SITE_ORIGIN}/about/`,{descriptionIncludes:'ZGMINI를 소개합니다'}],
  [`${SITE_ORIGIN}/fear-greed/korea/`,{descriptionIncludes:'504개 유효 관측치 기준창'}],
  [`${SITE_ORIGIN}/fear-greed/usa/`,{descriptionIncludes:'원시값과 환산점수의 차이'}],
  [`${SITE_ORIGIN}/sector-fear-greed/`,{descriptionIncludes:'5개 핵심 신호와 252거래일 데이터'}],
  [`${SITE_ORIGIN}/inflation/`,{htmlIncludes:['미국 CPI·근원 CPI·PCE·근원 PCE와 기대물가 등 주요 물가 지표']}],
  [`${SITE_ORIGIN}/recession/`,{htmlIncludes:['미국 경기침체 지표를 실업률 기반 Sahm Rule, 비농업고용, 실질 GDP, 산업생산, 소비·소득, 장단기 금리차와 신용여건으로 분석합니다.']}],
  [`${SITE_ORIGIN}/liquidity-crisis/`,{htmlIncludes:['미국 금융시장의 현금 부족과 유동성 위기 위험을 분석합니다.']}],
  [`${SITE_ORIGIN}/credit-risk/`,{htmlIncludes:['미국 회사채 시장의 신용 위험과 기업 자금조달 환경을 확인하세요.']}],
  [`${SITE_ORIGIN}/earnings-recession/`,{descriptionIncludes:'현재 실적 안전점수와 관측일, 기간별 흐름',htmlIncludes:['미국 기업 실적의 둔화와 침체 위험을 EPS 성장']}],
  [`${SITE_ORIGIN}/asset-bubble/`,{htmlIncludes:['미국 자산시장의 버블 위험을 밸류에이션 압력']}],
  [`${SITE_ORIGIN}/debt-risk/`,{htmlIncludes:['미국 가계와 기업의 부채 부담을 DSR, 부채/GDP']}],
  [`${SITE_ORIGIN}/supply-shock/`,{htmlIncludes:['미국 공급 충격 위험을 공급망 압력과 유가·원자재 변화로 살펴봅니다.']}],
  [`${SITE_ORIGIN}/guides/fear-greed-buying/`,{descriptionIncludes:'매수 신호로 사용할 때의 한계'}],
  [`${SITE_ORIGIN}/guides/cpi-pce-release/`,{descriptionIncludes:'CPI·PCE 공식 발표 일정의 한국시간',htmlIncludes:['확인 당시 다음 공식 일정']}],
  [`${SITE_ORIGIN}/guides/fomc/`,{descriptionIncludes:'FOMC 공식 일정과 한국시간 발표 시각',htmlIncludes:['확인 당시 다음 공식 일정']}],
]);

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

function includesOrError(errors,label,value,needle){
  if(needle && !value.includes(needle)) errors.push(`${label}_stale:${needle}`);
}

export function inspectHtml(html,expectedUrl){
  const title=firstTextElement(html,'title');
  const description=meta(html,'description');
  const robots=meta(html,'robots').toLowerCase();
  const canonical=canonicalLinks(html);
  const ogTitle=meta(html,'og:title');
  const ogDescription=meta(html,'og:description');
  const twitterTitle=meta(html,'twitter:title');
  const twitterDescription=meta(html,'twitter:description');
  const h1=firstTextElement(html,'h1');
  const types=jsonLdTypes(html);
  const path=new URL(expectedUrl).pathname;
  const errors=[];

  if(!title) errors.push('title_missing');
  if(!description) errors.push('description_missing');
  if(!robots.includes('index') || !robots.includes('follow')) errors.push(`robots_invalid:${robots||'missing'}`);
  if(canonical.length!==1) errors.push(`canonical_count:${canonical.length}`);
  else if(canonical[0]!==expectedUrl) errors.push(`canonical_mismatch:${canonical[0]}`);
  if(!ogTitle) errors.push('og_title_missing');
  else if(ogTitle!==title) errors.push(`og_title_mismatch:${ogTitle}`);
  if(!ogDescription) errors.push('og_description_missing');
  else if(ogDescription!==description) errors.push('og_description_mismatch');
  if(meta(html,'og:url')!==expectedUrl) errors.push(`og_url_mismatch:${meta(html,'og:url')||'missing'}`);
  if(!twitterTitle) errors.push('twitter_title_missing');
  else if(twitterTitle!==title) errors.push(`twitter_title_mismatch:${twitterTitle}`);
  if(!twitterDescription) errors.push('twitter_description_missing');
  else if(twitterDescription!==description) errors.push('twitter_description_mismatch');
  if(!h1) errors.push('h1_missing');

  const contract=SEO_RUNTIME_MARKERS.get(expectedUrl);
  if(!contract){
    errors.push('runtime_contract_missing');
  }else{
    includesOrError(errors,'title',title,contract.titleIncludes);
    includesOrError(errors,'description',description,contract.descriptionIncludes);
    for(const marker of contract.htmlIncludes??[]) includesOrError(errors,'html',html,marker);
  }

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
  for(const match of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/g)){
    const block=match[1];
    const loc=block.match(/<loc>(https:\/\/zgmini\.kr\/[^<]*)<\/loc>/);
    if(!loc) continue;
    const lastmod=block.match(/<lastmod>([^<]+)<\/lastmod>/);
    result.set(loc[1],lastmod?.[1]??null);
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

async function fetchRedirect(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{cache:'no-store',redirect:'manual',headers:{'cache-control':'no-cache','user-agent':'zgmini-seo-production-health-r2'},signal:controller.signal});
    return {status:response.status,location:response.headers.get('location')??''};
  }finally{
    clearTimeout(timeout);
  }
}

export function inspectCanonicalRedirect(result,expectedLocation){
  const errors=[];
  if(result.status!==301 && result.status!==308) errors.push(`http_${result.status}`);
  if(result.location!==expectedLocation) errors.push(`location:${result.location||'missing'}`);
  return errors;
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
  if(SEO_RUNTIME_MARKERS.size!==EXPECTED_PUBLIC_URLS) throw new Error(`SEO_HEALTH_RUNTIME_CONTRACT_COUNT:${SEO_RUNTIME_MARKERS.size}`);
  for(const url of publicUrls) if(!SEO_RUNTIME_MARKERS.has(url)) throw new Error(`SEO_HEALTH_RUNTIME_CONTRACT_MISSING:${url}`);

  const check=await waitForCloudflare({repository,sha,token});
  console.log(`SEO_HEALTH_CLOUDFLARE_PASS=${check.id}`);

  const redirectToken=sha.slice(0,12);
  const redirectCases=[
    [`http://zgmini.kr/?seo_redirect=${redirectToken}`,`https://zgmini.kr/?seo_redirect=${redirectToken}`],
    [`http://zgmini.kr/recession/?seo_redirect=${redirectToken}`,`https://zgmini.kr/recession/?seo_redirect=${redirectToken}`],
  ];
  for(const [source,expected] of redirectCases){
    const result=await fetchRedirect(source);
    const errors=inspectCanonicalRedirect(result,expected);
    if(errors.length) throw new Error(`SEO_HEALTH_REDIRECT_FAIL:${source}:${errors.join('|')}`);
    console.log(`SEO_HEALTH_REDIRECT_PASS=${source}=>${expected} status=${result.status}`);
  }

  const sitemapResponse=await fetchText(`${SITE_ORIGIN}/sitemap.xml?seo_health=${sha.slice(0,12)}`);
  if(sitemapResponse.status!==200) throw new Error(`SEO_HEALTH_SITEMAP_HTTP_${sitemapResponse.status}`);
  const liveEntries=liveSitemapEntries(sitemapResponse.text);
  const sitemapErrors=[];
  for(const url of publicUrls){
    if(!liveEntries.has(url)){
      sitemapErrors.push(`url_missing:${url}`);
      continue;
    }
    const lastmod=liveEntries.get(url);
    if(!lastmod) sitemapErrors.push(`lastmod_missing:${url}`);
    else if(!/^\d{4}-\d{2}-\d{2}$/.test(lastmod)) sitemapErrors.push(`lastmod_invalid:${url}:${lastmod}`);
  }
  if(liveEntries.size!==EXPECTED_PUBLIC_URLS) sitemapErrors.push(`url_count:${liveEntries.size}`);
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
