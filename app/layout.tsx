import type { Metadata } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import "./globals.css";

const notoSansMono = Noto_Sans_Mono({
  variable: "--font-noto-sans-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
  preload: true
});

export const metadata: Metadata = {
  title: "moxiphy - CSV Completion & Enrichment Tool",
  description: "Generate and enhance mock data for Maxiphy company with AI and image enrichment",
  keywords: ["CSV", "data enrichment", "OpenAI", "mock data", "Maxiphy", "moxiphy"],
  authors: [{ name: "Maxiphy Team" }],
};

import { AuthProvider } from './context/AuthContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={notoSansMono.variable}>
      <body className="font-sans antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
