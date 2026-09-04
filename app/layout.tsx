import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "매크로보드 | 경제지표로 시장을 읽다",
  description: "미국 주요 경제지표의 실제값, 예상치, 중요도와 시장 영향을 한눈에 확인하는 시황 대시보드",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body className="antialiased">{children}</body></html>;
}
