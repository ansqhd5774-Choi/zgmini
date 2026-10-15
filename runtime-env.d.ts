/// <reference types="vite/client" />

// Optional existing diagnostic bindings. This declaration provisions no secrets.
interface Env {
 FMP_API_KEY?:string;
 KFG_V2_CANARY_OPERATOR_EMAIL?:string;
}
declare namespace Cloudflare {
 interface Env {
  FMP_API_KEY?:string;
  KFG_V2_CANARY_OPERATOR_EMAIL?:string;
 }
}
