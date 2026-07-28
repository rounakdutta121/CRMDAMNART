import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";
import { Providers } from "@/components/layout/providers";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const archiveSans = IBM_Plex_Sans({
  variable: "--font-archive-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const archiveSerif = Source_Serif_4({
  variable: "--font-archive-serif",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const archiveMono = IBM_Plex_Mono({
  variable: "--font-archive-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
