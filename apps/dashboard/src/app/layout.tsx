import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-brand",
});

export const metadata: Metadata = {
  title: "Alrt — Notification Services for Startups",
  description:
    "Send in-app, email, and Slack notifications through a single API. Visual workflow builder included.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-background text-text-primary">
        {children}
      </body>
    </html>
  );
}
