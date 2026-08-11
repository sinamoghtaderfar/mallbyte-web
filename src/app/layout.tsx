import type { Metadata } from "next";
import "./globals.css";

import { AuthProvider } from "@/features/auth/auth-provider";

export const metadata: Metadata = {
  title: "MallByte",
  description: "A modern marketplace platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
