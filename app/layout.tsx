import type { Metadata } from "next";
import NaverAnalytics from "./naver-analytics";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZGmini | 미국·한국 공포탐욕지수와 경제지표",
  description: "미국·한국 공포탐욕지수 차트와 물가·고용·금리·자금흐름 등 주요 경제지표를 확인하세요. 지표별 관측일과 데이터 제공 상태를 함께 보여주는 ZGmini.",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ZGmini | 미국·한국 공포탐욕지수와 경제지표",
    description: "미국·한국 공포탐욕지수 차트와 주요 경제지표를 관측일·데이터 제공 상태와 함께 확인하세요.",
    url: "https://zgmini.kr/",
    type: "website",
    siteName: "ZGmini",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZGmini | 미국·한국 공포탐욕지수와 경제지표",
    description: "미국·한국 공포탐욕지수 차트와 주요 경제지표를 관측일·데이터 제공 상태와 함께 확인하세요.",
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
      description: "미국·한국 공포탐욕지수 차트와 물가·고용·금리·자금흐름 등 주요 경제지표를 확인하세요. 지표별 관측일과 데이터 제공 상태를 함께 보여주는 ZGmini.",
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
