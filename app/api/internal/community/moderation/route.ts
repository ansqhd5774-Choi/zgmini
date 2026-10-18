import {env} from "cloudflare:workers";
import {communityChatApi} from "../../../../../worker/community-chat-api-r1.mjs";
export const runtime="edge";
export function GET(request:Request){return communityChatApi(request,env);}
export function POST(request:Request){return communityChatApi(request,env);}
