import type {Metadata} from "next";
import EconomicDetailPage from "../economic-detail-page";
import {economicDetailById} from "../../../lib/economic-detail-catalog";
const detail=economicDetailById("growth")!;
const title=`${detail.searchTitle} - ZGmini`;
const description=`${detail.description} 저장된 0~100점과 과거 추이, 구성지표의 현재값·관측일을 확인하세요.`;
const url="https://zgmini.kr/economic-indicators/growth/";
export const metadata:Metadata={title,description,alternates:{canonical:url},robots:{index:true,follow:true},openGraph:{title,description,url,type:"website",siteName:"ZGmini",images:[{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:`ZGmini 미국 ${detail.name} 시장지표`}]},twitter:{card:"summary_large_image",title,description,images:["https://zgmini.kr/zgmini-share.png"]}};
export default function Page(){return <EconomicDetailPage id="growth"/>;}
