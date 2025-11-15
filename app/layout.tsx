import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";

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
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LaunchWatch",
  },
  openGraph: {
    title: "LaunchWatch 🚀",
    description: "Track upcoming rocket launches and watch live streams",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black`}
      >
        <RegisterServiceWorker />
        {children}
      </body>
    </html>
  );
}
