import {env} from "cloudflare:workers";
import {readPublicFeed} from "../../../worker/public-feed-store.mjs";
export async function GET(){return readPublicFeed(env.DB, "nikkei-fear-greed");}
