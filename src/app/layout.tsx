import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/lib/contexts/CartContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { CurrencyProvider } from "@/lib/contexts/CurrencyContext";
import { Header } from "@/components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Zisha Pottery | Premium Teaware",
  description: "Authentic Chinese Zisha pottery for tea enthusiasts in the Middle East",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CartProvider>
                <CurrencyProvider>
                  <Header />
                  <main>
                    {children}
                  </main>
                </CurrencyProvider>
              </CartProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
