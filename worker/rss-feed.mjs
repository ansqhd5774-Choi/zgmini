const paths=new Set(['/rss','/rss.xml','/feed.xml']);
export function rssResponse(request,xml){
 const path=new URL(request.url).pathname.replace(/\/+$/,'').toLowerCase();
 if(!paths.has(path))return null;
 const headers={'content-type':'application/rss+xml; charset=utf-8','cache-control':'public, max-age=300','x-content-type-options':'nosniff'};
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{allow:'GET, HEAD'}});
 return new Response(request.method==='HEAD'?null:xml,{headers});
}
