import type { Metadata } from "next";
import localFont from "next/font/local";
import { Providers } from "@/components/layout/providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const archiveSans = localFont({
  src: [
    { path: "../fonts/IBMPlexSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/IBMPlexSans-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/IBMPlexSans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-archive-sans",
  display: "swap",
});

const archiveSerif = localFont({
  src: [
    { path: "../fonts/SourceSerif4-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/SourceSerif4-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/SourceSerif4-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-archive-serif",
  display: "swap",
});

const archiveMono = localFont({
  src: [
    { path: "../fonts/IBMPlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-archive-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Multi-website lead management, sales management and customer conversion tracking for DamnArt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archiveSans.variable} ${archiveSerif.variable} ${archiveMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
