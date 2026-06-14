import type { Metadata } from "next";
import localFont from "next/font/local";

import { SiteHeader } from "@/components/SiteHeader";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://dyna-mo-ptm.org"),
  title: {
    default: "Dyna-MO PTM",
    template: "%s | Dyna-MO PTM",
  },
  description:
    "A systematic molecular dynamics database of post-translationally modified proteins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="min-h-screen bg-background">
            <SiteHeader />
            <main>{children}</main>
            <footer className="border-t bg-muted/30">
              <div className="container flex flex-col gap-2 py-6 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
                <p>
                  Dyna-MO PTM database interface. DOI placeholder pending
                  publication.
                </p>
                <p>CHARMM36-jul2022, TIP3P, 310 K, 10 ns x 3 replicas.</p>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
