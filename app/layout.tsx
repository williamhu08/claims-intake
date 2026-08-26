import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clearway — Property claim triage",
  description:
    "Describe a property incident in plain language and receive an instant AI triage assessment. Triage only — this does not determine coverage, liability, or payment.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
