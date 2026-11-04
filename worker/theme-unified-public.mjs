import {readConfiguredThemes} from './theme-configured-public.mjs';
import {readThemeEtfOnly} from './theme-etf-only-public.mjs';

export async function readUnifiedPublicThemes(db,{readLegacy=readThemeEtfOnly,readConfigured=readConfiguredThemes}={}){
 const [legacy,configured]=await Promise.all([readLegacy(db),readConfigured(db)]);
 if(!configured.ok)return legacy;
 const {themes}=await configured.json();
 if(!themes.length)return legacy;
 const base=legacy.ok?await legacy.clone().json():{themes:[]};
 const ids=new Set(base.themes.map(theme=>theme.id).filter(Boolean));
 const labels=new Set(base.themes.map(theme=>theme.theme));
 const added=themes.filter(theme=>{
  if(ids.has(theme.id)||labels.has(theme.theme))return false;
  ids.add(theme.id);
  labels.add(theme.theme);
  return true;
 });
 if(!added.length)return legacy;
 const headers=new Headers(legacy.headers);
 headers.delete('content-length');
 return Response.json({...base,status:'READY',themes:[...base.themes,...added]},{headers});
}
