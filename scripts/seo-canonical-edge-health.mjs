const REQUEST_TIMEOUT_MS=20_000;

async function fetchRedirect(url){
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  try{
    const response=await fetch(url,{cache:'no-store',redirect:'manual',headers:{'cache-control':'no-cache','user-agent':'zgmini-seo-canonical-edge-health-r1'},signal:controller.signal});
    return {status:response.status,location:response.headers.get('location')??''};
  }finally{
    clearTimeout(timeout);
  }
}

export function inspectEdgeRedirect(result,expectedLocation){
  const errors=[];
  if(result.status!==301 && result.status!==308) errors.push(`http_${result.status}`);
  if(result.location!==expectedLocation) errors.push(`location:${result.location||'missing'}`);
  return errors;
}

async function main(){
  const sha=process.env.GITHUB_SHA;
  if(!sha) throw new Error('SEO_EDGE_HEALTH_SHA_MISSING');
  const token=sha.slice(0,12);
  const cases=[
    [`https://www.zgmini.kr/?seo_edge=${token}`,`https://zgmini.kr/?seo_edge=${token}`],
    [`https://www.zgmini.kr/recession/?seo_edge=${token}`,`https://zgmini.kr/recession/?seo_edge=${token}`],
    [`http://www.zgmini.kr/recession/?seo_edge=${token}`,`https://zgmini.kr/recession/?seo_edge=${token}`],
  ];
  for(const [source,expected] of cases){
    const result=await fetchRedirect(source);
    const errors=inspectEdgeRedirect(result,expected);
    if(errors.length) throw new Error(`SEO_EDGE_REDIRECT_FAIL:${source}:${errors.join('|')}`);
    console.log(`SEO_EDGE_REDIRECT_PASS=${source}=>${expected} status=${result.status}`);
  }
  console.log(`SEO_EDGE_HEALTH_PASS=${cases.length}`);
}

if(import.meta.url===new URL(process.argv[1],'file:').href){
  main().catch(error=>{
    console.error(error?.stack??String(error));
    process.exitCode=1;
  });
}
