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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  var theme = localStorage.getItem("personal-notepad:theme");
                  if (!theme && window.matchMedia("(prefers-color-scheme: dark)").matches) {
                    theme = "dark";
                  }
                  if (theme) {
                    document.documentElement.dataset.theme = theme;
                  }
                } catch (error) {}
              })();
            `
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
