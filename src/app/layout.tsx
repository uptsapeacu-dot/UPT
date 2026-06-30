import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import PWARegister from "@/components/PWARegister";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-outfit",
});

export const viewport: Viewport = {
  themeColor: "#ea580c",
};

export const metadata: Metadata = {
  title: "TESTES ALPHA",
  description: "Ficha de Matrícula - Secretaria Municipal de Educação",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Matrícula UPT",
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <PWARegister />
        {children}
      </body>
    </html>
  );
}

