const CANONICAL_HOST='zgmini.kr';

export function canonicalHttpsRedirect(request){
  const url=new URL(request.url);
  if(url.hostname.toLowerCase()!==CANONICAL_HOST || url.protocol!=='http:') return null;
  url.protocol='https:';
  return new Response(null,{status:308,headers:{location:url.href}});
}
