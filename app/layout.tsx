import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PWAManager } from "./components/PWAManager";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chia Tiền Điện - 100F Lê Văn Duyệt",
  description: "Ứng dụng tính và chia tiền điện sinh hoạt 6 bậc EVN chính xác, nhanh chóng cho các hộ gia đình.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tiền Điện",
  },
  appleWebAppMobileWebAppCapable: "yes",
  other: {
    mobileOptimizer: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
  },
  keywords: ["tiền điện", "EVN", "chia tiền", "hóa đơn", "kWh", "điện sinh hoạt"],
  authors: [{ name: "100F Lê Văn Duyệt" }],
  openGraph: {
    title: "Chia Tiền Điện",
    description: "Ứng dụng chia tiền điện hàng tháng cho các hộ gia đình",
    type: "website",
    locale: "vi_VN",
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <meta name="theme-color" content="#0d9488" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-full flex flex-col">
        <PWAManager>{children}</PWAManager>
      </body>
    </html>
  );
}
