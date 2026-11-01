import {env} from "cloudflare:workers";
import {readEarningsRiskProvisional} from "../../../worker/earnings-risk-provisional-public.mjs";

// Public GET reads published results only; never collects or computes.
export async function GET(){return readEarningsRiskProvisional(env.DB);}
