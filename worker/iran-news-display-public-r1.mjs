import {IRAN_NEWS_DISPLAY_KEY,readIranNewsSnapshot} from '../lib/iran-progress/news-display-r1.mjs';

const headers={'cache-control':'no-store','content-type':'application/json; charset=utf-8'};
export async function storedIranNewsResponse(request,{db,now=Date.now()}={}){
 if(request.method!=='GET')return Response.json({status:'UNAVAILABLE',reason:'METHOD_NOT_ALLOWED',items:[]},{status:405,headers});
 if(!db)return Response.json({status:'UNAVAILABLE',reason:'NEWS_DATABASE_UNAVAILABLE',items:[]},{status:503,headers});
 let row;
 try{row=await db.prepare('SELECT body,stored_at FROM market_public_snapshots_v1 WHERE snapshot_key=?').bind(IRAN_NEWS_DISPLAY_KEY).first();}
 catch{return Response.json({status:'UNAVAILABLE',reason:'NEWS_READ_FAILED',items:[]},{status:503,headers});}
 if(!row)return Response.json({status:'PENDING',itemCount:0,items:[]},{headers});
 let projected;
 try{
  const saved=JSON.parse(row.body);
  if(Number(row.stored_at)!==saved.publishedAt)throw Error('NEWS_SNAPSHOT_STORED_AT_MISMATCH');
  projected=readIranNewsSnapshot(saved,{now});
 }catch{return Response.json({status:'UNAVAILABLE',reason:'NEWS_SNAPSHOT_INVALID',items:[]},{status:503,headers});}
 return Response.json(projected,{headers:{...headers,'x-data-snapshot-at':new Date(projected.publishedAt).toISOString()}});
}
