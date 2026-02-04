import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MAXI AI Trading",
  description: "독립형 업비트 자동매매 시스템",
  openGraph: {
    title: "MAXI AI Trading",
    description: "독립형 업비트 자동매매 시스템",
    url: "http://43.201.239.150:3000",
    siteName: "MAXI AI Trading",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MAXI AI Trading",
    description: "독립형 업비트 자동매매 시스템",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className} bg-gray-950 text-white antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

