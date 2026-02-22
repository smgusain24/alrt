import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
    <html lang="en">
      <body className={`${inter.variable} font-body antialiased`}>
        {children}
      </body>
    </html>
  );
}
