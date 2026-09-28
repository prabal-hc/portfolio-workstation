import type { Metadata } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Prabal Holla — Workstation",
  description:
    "Portfolio of Prabal Holla, a frontend developer building with React, Next.js and TypeScript. Step inside the workstation: an interactive 3D desk with three screens.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-loading is removed when the visitor presses "Initialize"
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-loading="">
      <body>
        <noscript>
          <style>{`.intro{display:none}.panel,.copy{opacity:1!important;position:relative!important;inset:auto!important;width:auto!important;height:auto!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
