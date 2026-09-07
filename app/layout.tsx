import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZGmini | 공포탐욕지수·글로벌 증시·경제지표 한눈에",
  description: "한국·미국·중국·일본·유럽 공포탐욕지수와 물가, 고용, 금리, 유가 등 주요 시장·경제지표를 한눈에 확인하는 글로벌 시황 대시보드 ZGmini.",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "ZGmini | 공포탐욕지수·글로벌 증시·경제지표 한눈에",
    description: "한국·미국·중국·일본·유럽 공포탐욕지수와 주요 시장·경제지표를 한눈에 확인하세요.",
    url: "https://zgmini.kr/",
    type: "website",
    siteName: "ZGmini",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZGmini | 공포탐욕지수·글로벌 증시·경제지표 한눈에",
    description: "한국·미국·중국·일본·유럽 공포탐욕지수와 주요 시장·경제지표를 한눈에 확인하세요.",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
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
      description: "한국·미국·중국·일본·유럽 공포탐욕지수와 물가, 고용, 금리, 유가 등 주요 시장·경제지표를 한눈에 확인하는 글로벌 시황 대시보드 ZGmini.",
      inLanguage: "ko-KR",
    },
    {
      "@type": "Organization",
      "@id": "https://zgmini.kr/#organization",
      name: "ZGmini",
      alternateName: "즈그미니",
      url: "https://zgmini.kr/",
    },
    {
      "@type": "WebPage",
      "@id": "https://zgmini.kr/#webpage",
      url: "https://zgmini.kr/",
      name: "ZGmini | 공포탐욕지수·글로벌 증시·경제지표 한눈에",
      description: "한국·미국·중국·일본·유럽 공포탐욕지수와 물가, 고용, 금리, 유가 등 주요 시장·경제지표를 한눈에 확인하는 글로벌 시황 대시보드 ZGmini.",
      isPartOf: { "@id": "https://zgmini.kr/#website" },
      about: { "@id": "https://zgmini.kr/#organization" },
      inLanguage: "ko-KR",
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}/>{children}</body></html>;
}
