export const shellRoutes=Object.freeze(['/','/inflation/','/recession/','/liquidity-crisis/','/credit-risk/','/earnings-recession/','/asset-bubble/','/debt-risk/','/supply-shock/','/guides/fear-greed-buying/','/guides/cpi-pce-release/','/guides/fomc/','/sector-fear-greed/']);
export function shellArtifact(path,rsc=false){return `/__candidate_shells/${path==='/'?'index':path.slice(1,-1)}.${rsc?'rsc':'html'}`;}
export async function staticShell(request,env){
 const url=new URL(request.url);let path=url.pathname;
 if(!path.endsWith('/')&&shellRoutes.includes(path+'/')){url.pathname=path+'/';return new Response(null,{status:308,headers:{location:url.toString()}});}
 if(!shellRoutes.includes(path))return null;
 const rsc=request.headers.get('rsc')==='1'||request.headers.get('accept')?.includes('text/x-component');
 const artifact=shellArtifact(path,!!rsc);url.pathname=artifact;url.search='';
 const result=env.ASSETS?await env.ASSETS.fetch(new Request(url,{method:request.method})):null;
 if(!result||result.status!==200)return Response.json({status:'unavailable',reason:'CANDIDATE_STATIC_SHELL_MISSING'},{status:503});
 const headers=new Headers(result.headers);
 headers.set('content-type',rsc?'text/x-component; charset=utf-8':'text/html; charset=utf-8');
 headers.set('vary','RSC, Accept');headers.set('x-zgmini-render-mode','static-shell');headers.set('x-zgmini-ssr','bypassed');headers.set('x-zgmini-shell-artifact',artifact);
 return new Response(request.method==='HEAD'?null:result.body,{status:200,headers});
}
