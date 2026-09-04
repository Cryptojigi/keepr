import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk, Libre_Baskerville } from "next/font/google";
import { Toaster } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { KeeprHydrate } from "@/components/keepr-hydrate";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-prose",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://keepr-eta.vercel.app"),
  title: "Keepr · Private Subscriptions on STRK20",
  description:
    "Private subscriptions for AI agents and digital creators on STRK20. Shield, subscribe, auto-renew via keepers, and prove tier access without wallet scanning.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Keepr · Private Subscriptions on STRK20",
    description:
      "Private subscriptions for AI agents and digital creators on STRK20. Shield, subscribe, auto-renew via keepers, and prove tier access without wallet scanning.",
    images: ["/og.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${ibmPlexMono.variable} ${libreBaskerville.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <KeeprHydrate />
        <SiteHeader />
        <div className="flex-1 relative z-[2]">{children}</div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "var(--color-raised2)",
              color: "var(--color-ink)",
              border: "1px solid var(--color-line)",
              borderRadius: "0px",
              fontFamily: "var(--font-mono)",
              fontSize: "0.8125rem",
            },
          }}
        />
      </body>
    </html>
  );
}
