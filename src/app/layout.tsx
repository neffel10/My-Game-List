import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AuthProvider from '@/components/providers/AuthProvider';
import LanguageProvider from '@/components/providers/LanguageProvider';
import { getLocale } from '@/lib/i18n-server';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Game List - Register and track your favorite games",
  description: "The best app to register and track your favorite games",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className="bg-[#07090e] text-zinc-100 antialiased">
        <AuthProvider>
          <LanguageProvider initialLocale={locale}>
            {children}
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}