import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "前哨AI智能体体验舱",
  description: "前哨科技 - 企业 AI 转型演示平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen gradient-bg antialiased">{children}</body>
    </html>
  );
}
