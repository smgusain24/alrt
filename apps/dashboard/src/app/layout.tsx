import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: "Alrt — Notification Services for Startups",
  description:
    "Send in-app, email, and Slack notifications through a single API. Visual workflow builder included.",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable}`}>
      <body>
        {children}
        <Script src="https://unpkg.com/@knadh/oat/oat.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
