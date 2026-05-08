import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ghost Job Detector",
  description: "Analyze job posts for ghost jobs, scams, and suspicious signals."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
