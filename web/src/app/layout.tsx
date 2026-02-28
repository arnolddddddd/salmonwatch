import type { Metadata, Viewport } from "next";
import { DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SalmonWatch BC",
  description:
    "Open-source Pacific salmon intelligence platform for British Columbia. 9,800+ populations, 100 years of data.",
  openGraph: {
    title: "SalmonWatch BC",
    description:
      "Interactive explorer for Pacific salmon populations across British Columbia.",
    siteName: "SalmonWatch BC",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SalmonWatch BC",
    description:
      "100 years of Pacific salmon data. 9,800+ populations. One interactive explorer.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${dmSans.variable} ${jetBrainsMono.variable}`}>
      <body className="bg-[#080c14] text-slate-200 antialiased">
        {children}
      </body>
    </html>
  );
}
