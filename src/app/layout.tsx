import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IWK RT 11 - Sistem Iuran & Manajemen Kegiatan RT 11 Pradha Ciganitri",
  description:
    "Sistem informasi keuangan dan manajemen kegiatan RT 11 Komplek Pradha Ciganitri. Transparansi 100% untuk warga.",
  keywords: [
    "IWK RT 11",
    "Iuran Wajib Komplek",
    "RT 11",
    "Pradha Ciganitri",
    "Manajemen Kegiatan RT",
    "Keuangan RT",
  ],
  authors: [{ name: "RT 11 Pradha Ciganitri" }],
  openGraph: {
    title: "IWK RT 11 - Sistem Iuran & Manajemen Kegiatan",
    description: "Transparansi 100% untuk warga RT 11 Komplek Pradha Ciganitri",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-[#f5f7fa] text-gray-900`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
