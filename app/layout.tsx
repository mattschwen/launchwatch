import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LaunchWatch 🚀 - Track NASA & SpaceX Rocket Launches",
  description: "Track upcoming rocket launches, watch live streams, and discover fascinating facts about space exploration. Real-time updates from NASA and SpaceX.",
  keywords: ["rocket launches", "SpaceX", "NASA", "space", "livestream", "rocket facts"],
  openGraph: {
    title: "LaunchWatch 🚀",
    description: "Track upcoming rocket launches and watch live streams",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        {children}
      </body>
    </html>
  );
}
