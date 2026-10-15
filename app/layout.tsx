import type { Metadata } from "next";
import NaverAnalytics from "./naver-analytics";
import {ScoreArrowProvider} from '../components/score-arrow-provider';
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "ZGmini 지그미니 | 미국·한국 공포탐욕지수와 경제지표",
  description: "미국·한국 공포탐욕지수의 최근 점수와 기간별 차트를 확인하세요. 물가·고용·금리 등 주요 경제지표와 데이터 관측일을 함께 제공합니다.",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {images: [{url:"https://zgmini.kr/zgmini-search-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],
    title: "ZGmini 지그미니 | 미국·한국 공포탐욕지수와 경제지표",
    description: "미국·한국 공포탐욕지수의 최근 점수와 기간별 차트를 확인하세요. 물가·고용·금리 등 주요 경제지표와 데이터 관측일을 함께 제공합니다.",
    url: "https://zgmini.kr/",
    type: "website",
    siteName: "ZGmini",
  },
  twitter: {images:["https://zgmini.kr/zgmini-search-share.png"],
    card: "summary_large_image",
    title: "ZGmini 지그미니 | 미국·한국 공포탐욕지수와 경제지표",
    description: "미국·한국 공포탐욕지수의 최근 점수와 기간별 차트를 확인하세요. 물가·고용·금리 등 주요 경제지표와 데이터 관측일을 함께 제공합니다.",
  },
  icons: { icon: "/zgmini-logo.png", shortcut: "/zgmini-logo.png", apple: "/zgmini-logo.png" },
  other: {
    "naver-site-verification": "10e32247f072c5f7363357583fee172ef5259f83",
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://zgmini.kr/#website",
      url: "https://zgmini.kr/",
      name: "ZGmini",
      alternateName: "지그미니",
      description: "미국·한국 공포탐욕지수의 최근 점수와 기간별 차트를 확인하세요. 물가·고용·금리 등 주요 경제지표와 데이터 관측일을 함께 제공합니다.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": "https://zgmini.kr/#organization",
      logo: "https://zgmini.kr/zgmini-logo.png",
      name: "ZGmini",
      alternateName: "지그미니",
      url: "https://zgmini.kr/",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/><ScoreArrowProvider>{children}</ScoreArrowProvider><NaverAnalytics /></body></html>;
}
