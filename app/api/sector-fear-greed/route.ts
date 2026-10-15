import {env} from "cloudflare:workers";
import {readSectorFearGreedR3} from "../../../worker/sector-fear-greed-r3-public.mjs";

export async function GET(){
  return readSectorFearGreedR3(env.DB);
}
