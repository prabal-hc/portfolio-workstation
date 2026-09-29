import type { Metadata, Viewport } from "next";
import { Sora, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Sora({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const sans = Inter({ variable: "--font-inter", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono-face", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

const SITE = "https://prabalholla-workstation.netlify.app";
const TITLE = "Prabal Holla — Frontend Developer";
const DESCRIPTION =
  "Step inside my 3D workstation: an interactive portfolio built with React, Next.js, TypeScript and Three.js. Scroll to sit down at the desk.";

export const metadata: Metadata = {
  // resolves the generated preview image (app/opengraph-image.tsx) to a full URL for LinkedIn & co.
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: "Prabal Holla", url: SITE }],
  keywords: ["Prabal Holla", "Frontend Developer", "React", "Next.js", "TypeScript", "Three.js", "Portfolio", "Bangalore"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Prabal Holla",
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  themeColor: "#05070b",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-loading is removed by <Loader/> once the scene is ready
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-loading="">
      <body>
        <noscript>
          <style>{`.loader{display:none}.copy,.screen{opacity:1!important;position:relative!important;inset:auto!important;width:auto!important;height:auto!important}.copy-hero>*,.copy-hero .hero-word{opacity:1!important;transform:none!important}`}</style>
        </noscript>
        {children}
      </body>
    </html>
  );
}
