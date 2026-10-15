import {readFileSync} from 'node:fs';
import {basename} from 'node:path';
import {pathToFileURL} from 'node:url';

export const SITE_ORIGIN='https://zgmini.kr';
export const INDEXNOW_ENDPOINT='https://api.indexnow.org/indexnow';
export const CLOUDFLARE_CHECK_PREFIX='Workers Builds:';
const POLL_MS=5_000;
const MAX_WAIT_MS=10*60_000;

export function parseSitemap(xml){
  const urls=[];
  for(const match of xml.matchAll(/<loc>(https:\/\/zgmini\.kr\/[^<]*)<\/loc>/g)){
    const url=new URL(match[1]);
    if(url.origin===SITE_ORIGIN) urls.push(url.href);
  }
  return urls;
}

function addAll(target,urls){ for(const url of urls) target.add(url); }

export function deriveAffectedUrls(files,publicUrls){
  const affected=new Set();
  const routeUrls=publicUrls.filter(url=>new URL(url).pathname!=='/');
  const allFiles=new Set(files);

  const globalFiles=[
    'app/layout.tsx',
    'app/globals.css',
    'app/seo-jsonld.tsx',
    'app/detail-investor-notes.tsx',
    'app/detail-reading-guide.tsx',
    'public/zgmini-share.png',
    'public/zgmini-logo.png',
  ];
  if(globalFiles.some(file=>allFiles.has(file))) addAll(affected,publicUrls);

  if(allFiles.has('app/guides/guide-page.tsx')){
    addAll(affected,publicUrls.filter(url=>new URL(url).pathname.startsWith('/guides/')));
  }

  for(const file of files){
    if(file==='app/page.tsx'){
      affected.add(`${SITE_ORIGIN}/`);
      continue;
    }
    if(!file.startsWith('app/') || file.startsWith('app/api/')) continue;

    let matched=false;
    for(const url of routeUrls){
      const pathname=new URL(url).pathname;
      if(file.startsWith(`app${pathname}`)){
        affected.add(url);
        matched=true;
      }
    }

    if(!matched && /^app\/[^/]+\.(?:tsx?|css)$/.test(file)){
      // Unknown root-level app components can affect shared rendering; submit all rather than miss a public page.
      addAll(affected,publicUrls);
    }
  }

  return publicUrls.filter(url=>affected.has(url));
}

async function githubJson(path,token){
  const response=await fetch(`https://api.github.com${path}`,{
    headers:{
      accept:'application/vnd.github+json',
      authorization:`Bearer ${token}`,
      'x-github-api-version':'2022-11-28',
      'user-agent':'zgmini-indexnow-r1',
    },
  });
  if(!response.ok) throw new Error(`GITHUB_HTTP_${response.status}:${path}`);
  return response.json();
}

export async function fetchChangedFiles({repository,sha,before,token}){
  if(before && !/^0+$/.test(before)){
    const files=[];
    for(let page=1;page<=10;page++){
      const result=await githubJson(`/repos/${repository}/compare/${before}...${sha}?per_page=100&page=${page}`,token);
      const batch=(result.files??[]).map(item=>item.filename).filter(Boolean);
      files.push(...batch);
      if(batch.length<100) break;
    }
    return [...new Set(files)];
  }
  const commit=await githubJson(`/repos/${repository}/commits/${sha}`,token);
  return [...new Set((commit.files??[]).map(item=>item.filename).filter(Boolean))];
}

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

export async function waitForCloudflare({repository,sha,token,maxWaitMs=MAX_WAIT_MS,pollMs=POLL_MS}){
  const started=Date.now();
  while(Date.now()-started<maxWaitMs){
    const result=await githubJson(`/repos/${repository}/commits/${sha}/check-runs?per_page=100`,token);
    const checks=(result.check_runs??[])
      .filter(check=>check?.app?.slug==='cloudflare-workers-and-pages' && String(check.name??'').startsWith(CLOUDFLARE_CHECK_PREFIX))
      .sort((a,b)=>(b.id??0)-(a.id??0));
    const check=checks[0];
    if(!check){ await sleep(pollMs); continue; }
    if(check.status!=='completed'){ await sleep(pollMs); continue; }
    if(check.conclusion!=='success') throw new Error(`CLOUDFLARE_${String(check.conclusion??'UNKNOWN').toUpperCase()}`);
    return check;
  }
  throw new Error('CLOUDFLARE_STATE_UNKNOWN_TIMEOUT');
}

export async function verifyPublishedKey(key){
  const url=`${SITE_ORIGIN}/${key}.txt?indexnow_verify=${Date.now()}`;
  const response=await fetch(url,{headers:{'cache-control':'no-cache','user-agent':'zgmini-indexnow-r1'}});
  const text=await response.text();
  if(response.status!==200 || text.trim()!==key) throw new Error(`INDEXNOW_KEY_NOT_LIVE:${response.status}`);
  return true;
}

export async function submitIndexNow({key,urlList}){
  const response=await fetch(INDEXNOW_ENDPOINT,{
    method:'POST',
    headers:{'content-type':'application/json; charset=utf-8','user-agent':'zgmini-indexnow-r1'},
    body:JSON.stringify({
      host:'zgmini.kr',
      key,
      keyLocation:`${SITE_ORIGIN}/${key}.txt`,
      urlList,
    }),
  });
  const text=await response.text();
  if(response.status!==200 && response.status!==202){
    throw new Error(`INDEXNOW_HTTP_${response.status}${text?`:${text.slice(0,160)}`:''}`);
  }
  return {status:response.status,body:text};
}

async function main(){
  const repository=process.env.GITHUB_REPOSITORY;
  const sha=process.env.GITHUB_SHA;
  const token=process.env.GITHUB_TOKEN;
  const eventPath=process.env.GITHUB_EVENT_PATH;
  if(!repository || !sha || !token || !eventPath) throw new Error('INDEXNOW_ENV_MISSING');

  const event=JSON.parse(readFileSync(eventPath,'utf8'));
  const sitemap=parseSitemap(readFileSync('public/sitemap.xml','utf8'));
  if(sitemap.length===0) throw new Error('INDEXNOW_SITEMAP_EMPTY');

  const keyPath=readFileSync('scripts/indexnow-key-path.txt','utf8').trim();
  const key=basename(keyPath,'.txt');
  const keyBody=readFileSync(keyPath,'utf8').trim();
  if(key!==keyBody) throw new Error('INDEXNOW_KEY_FILE_MISMATCH');

  const changedFiles=await fetchChangedFiles({repository,sha,before:event.before,token});
  const urlList=deriveAffectedUrls(changedFiles,sitemap);
  console.log(`INDEXNOW_CHANGED_FILES=${changedFiles.length}`);
  console.log(`INDEXNOW_URLS=${urlList.length}`);
  for(const url of urlList) console.log(`INDEXNOW_URL=${url}`);
  if(urlList.length===0){
    console.log('INDEXNOW_SKIP_NO_PUBLIC_PAGE_CHANGES');
    return;
  }

  const check=await waitForCloudflare({repository,sha,token});
  console.log(`CLOUDFLARE_DEPLOY_PASS=${check.id}`);
  await verifyPublishedKey(key);
  console.log('INDEXNOW_KEY_LIVE=PASS');
  const result=await submitIndexNow({key,urlList});
  console.log(`INDEXNOW_SUBMIT_STATUS=${result.status}`);
}

const invoked=process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href;
if(invoked){
  main().catch(error=>{
    console.error(error?.stack??String(error));
    process.exitCode=1;
  });
}
