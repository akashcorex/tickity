import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import Header from "@/components/Header";
import { ClerkProvider } from "@clerk/nextjs";
import SyncUserWithConvex from "@/components/SyncUserWithConvex";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const viewport: Viewport = {
  themeColor: '#2563eb',
};

export const metadata: Metadata = {
  title: "Tickity",
  description:
    "Tickity is your trusted marketplace for buying and selling event tickets. Secure, fast, and easy ticketing for concerts, sports, and more.",
  applicationName: "Tickity",
  creator: "Tickity Team",
  publisher: "Tickity Team",
  robots: {
    index: true,
    follow: true,
    nocache: false,
  },
  metadataBase: new URL('https://tickity.com'),
  openGraph: {
    title: "Tickity | Buy & Sell Event Tickets",
    description:
      "Securely buy and sell tickets for your favorite events on Tickity.",
    url: "https://tickity.com",
    siteName: "Tickity",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Tickity Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tickity | Buy & Sell Event Tickets",
    description:
      "Securely buy and sell tickets for your favorite events on Tickity.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <ClerkProvider>
            <Header />
            <SyncUserWithConvex />
            {children}
            <Analytics />
            <Toaster />
          </ClerkProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}