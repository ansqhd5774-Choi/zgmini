import type { Metadata } from "next";
import NaverAnalytics from "./naver-analytics";
import GoogleAnalytics from "./google-analytics";
import {ScoreArrowProvider} from '../components/score-arrow-provider';
import AboutIntroPopup from './about-intro-popup';
import "./globals.css";
import "./responsive.css";
import '../components/live-score-motion.css';

export const metadata: Metadata = {
  title: "ZGmini 지그미니 | 공포탐욕지수·공탐 지수·미국 증시·경제지표",
  description: "미국 주식·한국 증시의 공포탐욕지수(공탐 지수), 종합 시장 점수와 기간별 차트를 확인하세요. 경기침체·물가·고용·금리·기업 실적·유동성·수급과 섹터·테마 ETF 투자심리를 함께 살펴봅니다. CPI·PCE·FOMC 발표 일정은 한국시간 안내로 연결합니다.",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {images: [{url:"https://zgmini.kr/zgmini-search-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],
    title: "ZGmini 지그미니 | 공포탐욕지수·공탐 지수·미국 증시·경제지표",
    description: "미국 주식·한국 증시의 공포탐욕지수(공탐 지수), 종합 시장 점수와 기간별 차트를 확인하세요. 경기침체·물가·고용·금리·기업 실적·유동성·수급과 섹터·테마 ETF 투자심리를 함께 살펴봅니다. CPI·PCE·FOMC 발표 일정은 한국시간 안내로 연결합니다.",
    url: "https://zgmini.kr/",
    type: "website",
    siteName: "ZGmini",
  },
  twitter: {images:["https://zgmini.kr/zgmini-search-share.png"],
    card: "summary_large_image",
    title: "ZGmini 지그미니 | 공포탐욕지수·공탐 지수·미국 증시·경제지표",
    description: "미국 주식·한국 증시의 공포탐욕지수(공탐 지수), 종합 시장 점수와 기간별 차트를 확인하세요. 경기침체·물가·고용·금리·기업 실적·유동성·수급과 섹터·테마 ETF 투자심리를 함께 살펴봅니다. CPI·PCE·FOMC 발표 일정은 한국시간 안내로 연결합니다.",
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
      alternateName: ["지그미니", "zgmini.kr"],
      description: "미국 주식·한국 증시의 공포탐욕지수(공탐 지수), 종합 시장 점수와 기간별 차트를 확인하세요. 경기침체·물가·고용·금리·기업 실적·유동성·수급과 섹터·테마 ETF 투자심리를 함께 살펴봅니다. CPI·PCE·FOMC 발표 일정은 한국시간 안내로 연결합니다.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": "https://zgmini.kr/#organization",
      logo: "https://zgmini.kr/zgmini-logo.png",
      name: "ZGmini",
      alternateName: "지그미니",
      url: "https://zgmini.kr/",
      sameAs: [
        "https://shareyourstartup.com/s/zgmini",
        "https://twelve.tools/zgmini-kr",
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/><ScoreArrowProvider>{children}</ScoreArrowProvider><AboutIntroPopup /><NaverAnalytics /><GoogleAnalytics /></body></html>;
}
