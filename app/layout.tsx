import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "즤그미니! | 글로벌 경제지표와 시장 심리",
  description: "미국·한국·중국·일본·유럽 경제지표와 글로벌·섹터·테마별 공포탐욕을 한눈에 확인하는 시황 대시보드",
  metadataBase: new URL("https://zgmini.kr"),
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
