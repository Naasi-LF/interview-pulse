import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

// 1. Alibaba PuHuiTi - Main Body Text (Sans)
const alibabaPuHui = localFont({
  src: "../../assets/Alibaba_PuHuiTi.ttf",
  variable: "--font-alibaba",
  display: "swap",
});

// 2. Alimama ShuHeiTi - Headings / Bold Titles
const alimamaShuHei = localFont({
  src: "../../assets/AlimamaShuHeiTi-Bold.ttf",
  variable: "--font-shuhei",
  display: "swap",
});

// 3. Alimama FangYuanTi - Rounded / Decorative / Numbers
const alimamaFangYuan = localFont({
  src: "../../assets/AlimamaFangYuanTiVF-Thin.ttf",
  variable: "--font-fangyuan",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InterviewPulse",
  description: "Minimalist Luxury AI Interview Preparation",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "InterviewPulse",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={`${alibabaPuHui.variable} ${alimamaShuHei.variable} ${alimamaFangYuan.variable} font-sans antialiased bg-background text-foreground`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
