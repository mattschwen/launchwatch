import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import RegisterServiceWorker from "./register-sw";
import AppShell from "@/components/layout/AppShell";

const launchSans = localFont({
  variable: "--font-geist-sans",
  display: "swap",
  src: [
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../node_modules/@fontsource/space-grotesk/files/space-grotesk-latin-700-normal.woff2",
      weight: "700",
    },
  ],
});

const launchMono = localFont({
  variable: "--font-geist-mono",
  display: "swap",
  src: [
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2",
      weight: "600",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff2",
      weight: "700",
    },
  ],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.launchwatch.io"),
  title: "LaunchWatch",
  description: "Track upcoming launches, official coverage, and mission telemetry from SpaceX and Launch Library 2.",
  keywords: ["rocket launches", "SpaceX", "NASA", "space", "livestream", "mission control", "launch watch"],
  manifest: "/manifest.json",
  icons: {
    icon: [
      {
        url: "/favicon.ico",
        type: "image/x-icon",
        sizes: "16x16 32x32 48x48",
      },
      { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "LaunchWatch",
  },
  openGraph: {
    title: "LaunchWatch",
    description: "Track upcoming launches, official coverage, and mission telemetry from SpaceX and Launch Library 2.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LaunchWatch",
    description: "Track upcoming launches, official coverage, and mission telemetry from SpaceX and Launch Library 2.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#05060a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${launchSans.variable} ${launchMono.variable} antialiased relative`}
      >
        <RegisterServiceWorker />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
