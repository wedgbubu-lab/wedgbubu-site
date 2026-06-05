import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Vercel 환경변수 우선순위:
//   1) NEXT_PUBLIC_SITE_URL — 운영자가 명시한 도메인
//   2) VERCEL_PROJECT_PRODUCTION_URL — 프로젝트의 production 도메인 (모든 배포에서 동일)
//   3) VERCEL_URL — 현재 배포 URL (preview 등 일시적)
// OG 이미지는 1·2가 안전. 3은 deployment-hash URL이 들어와 외부 크롤러 401.
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "웨지부부 구독방 정보",
  description: "웨지부부 구독자에게만 제공되는 큐레이션 정보",
  openGraph: {
    title: "웨지부부 구독방 정보",
    description: "웨지부부 구독자에게만 제공되는 큐레이션 정보",
    images: [{ url: "/main_photo.jpg", width: 1024, height: 1024, alt: "웨지부부" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
