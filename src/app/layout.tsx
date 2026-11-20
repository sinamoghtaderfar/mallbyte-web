import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

import { AuthProvider } from "@/features/auth/auth-provider";

// Self-hosted (SIL OFL) variable fonts: no runtime font CDN request.
const geist = localFont({
  src: "./fonts/geist-latin-wght.woff2",
  variable: "--font-geist",
  weight: "100 900",
  display: "swap",
});
const geistMono = localFont({
  src: "./fonts/geist-mono-latin-wght.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
});
const instrument = localFont({
  src: [
    { path: "./fonts/instrument-serif-latin-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MallByte — Independent makers, one considered marketplace", template: "%s · MallByte" },
  description: "Shop considered goods from independent sellers with secure checkout, order tracking and easy returns.",
};

export const viewport: Viewport = {
  themeColor: "#f7f5f0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
