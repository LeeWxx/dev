import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import 'highlight.js/styles/github-dark.css';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Crusia",
  description: "Next 블로그",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark">
      <body className={`${inter.className}`}>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
      </body>
    </html>
  );
}
