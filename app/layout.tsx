import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claims Intake",
  description: "AI-assisted property claims intake",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
