import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";


import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/provider/theme-provider";
import { AuthProvider } from "@/context/auth-context";
import { AuthOverlay } from "@/components/core/auth/auth-overlay";
import { AdminProvider } from "@/context/admin-context";
import { ContributorProvider } from "@/context/contributor-context";
import { UiProvider } from "@/context/ui-context";
import { Toaster } from "@/components/ui/sonner";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenTier",
  description: "OpenTier is a Rag with Scraping capabilities in a nutshell.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${jetbrainsMono.variable} scroll-smooth`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <AuthOverlay />
            <AdminProvider>
              <ContributorProvider>
                <UiProvider>
                  <TooltipProvider>
                    {children}
                  </TooltipProvider>
                </UiProvider>
              </ContributorProvider>
            </AdminProvider>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
