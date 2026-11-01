import type {Metadata} from 'next';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import OutbreakEvents from '../outbreak-events';
import {WebPageJsonLd} from '../seo-jsonld';

const title='아웃브레이크 | 금리 심리·이란 전쟁·러우 전쟁 - ZGmini';
const description='아웃브레이크에서 미국 시장금리 심리, 이란 전쟁 종전 진전 신호와 러우 전쟁의 공개된 분석 상태를 확인하세요. 관측일·출처·변동 이력을 구분하며 미산출 확률은 표시하지 않습니다.';
const url='https://zgmini.kr/outbreak/';
const image='https://zgmini.kr/zgmini-share.png';

export const metadata:Metadata={
 title,description,
 alternates:{canonical:url},
 robots:{index:true,follow:true},
 openGraph:{title,description,url,type:'website',siteName:'ZGmini',images:[{url:image,width:1200,height:630,alt:'ZGmini 아웃브레이크 시장 사건 분석'}]},
 twitter:{card:'summary_large_image',title,description,images:[image]},
};

export default function OutbreakPage(){
 return <main className="zg-app zg-dashboard min-h-screen" data-view="scenarios">
  <WebPageJsonLd name={title} description={description} path="/outbreak/"/>
  <SiteHeader/>
  <div className="zg-container">
   <OutbreakEvents/>
  </div>
  <SiteFooter/>
 </main>;
}
