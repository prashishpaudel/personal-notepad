import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Notepad",
  description: "A fast local notepad with light and dark mode."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
