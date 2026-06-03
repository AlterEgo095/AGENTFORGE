import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AgentForge — AI Agent Orchestration Platform",
  description: "Unified AI agent orchestration system with MoA Kernel, Reflection Agent, and 3-Level Auto-Fix Engine. Orchestrate 7 specialized agents for code, slides, docs, data, research, email, and marketing.",
  keywords: ["AgentForge", "AI Agents", "Orchestration", "MoA", "Next.js", "TypeScript"],
  authors: [{ name: "AgentForge Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
