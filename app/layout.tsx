import type { Metadata } from "next";
import NaverAnalytics from "./naver-analytics";
import "./globals.css";
import "./responsive.css";

export const metadata: Metadata = {
  title: "공포탐욕지수 한눈에 | 미국·한국 차트 - ZGmini",
  description: "지금 시장 분위기가 궁금한가요? 미국·한국 공포탐욕지수와 기간별 차트를 한곳에서 살펴보세요. 주요 경제지표와 관측일도 함께 확인할 수 있어요.",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {images: [{url:"https://zgmini.kr/zgmini-share.png",width:1200,height:630,alt:"ZGmini · 미국과 한국 시장 분위기를 한눈에"}],
    title: "공포탐욕지수 한눈에 | 미국·한국 차트 - ZGmini",
    description: "시장이 불안할 때도, 분위기가 좋을 때도. 미국·한국 공포탐욕지수와 차트를 ZGmini에서 편하게 살펴보세요.",
    url: "https://zgmini.kr/",
    type: "website",
    siteName: "ZGmini",
  },
  twitter: {images:["https://zgmini.kr/zgmini-share.png"],
    card: "summary_large_image",
    title: "공포탐욕지수 한눈에 | 미국·한국 차트 - ZGmini",
    description: "시장이 불안할 때도, 분위기가 좋을 때도. 미국·한국 공포탐욕지수와 차트를 ZGmini에서 편하게 살펴보세요.",
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
      alternateName: "즈그미니",
      description: "지금 시장 분위기가 궁금한가요? 미국·한국 공포탐욕지수와 기간별 차트를 한곳에서 살펴보세요. 주요 경제지표와 관측일도 함께 확인할 수 있어요.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": "https://zgmini.kr/#organization",
      logo: "https://zgmini.kr/zgmini-logo.png",
      name: "ZGmini",
      alternateName: "즈그미니",
      url: "https://zgmini.kr/",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>{children}<NaverAnalytics /></body></html>;
}
