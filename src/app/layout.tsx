import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gfox Gráfica - Gráfica Rápida & Estamparia",
  description:
    "Faça seu orçamento instantâneo de camisas, canecas, adesivos e impressos online na Gfox Gráfica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body suppressHydrationWarning className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}