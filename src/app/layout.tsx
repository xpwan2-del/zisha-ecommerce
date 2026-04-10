import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { LanguageProvider } from "@/components/LanguageProvider";
import { CartProvider } from "@/lib/contexts/CartContext";
import { AuthProvider } from "@/lib/contexts/AuthContext";
import { CurrencyProvider } from "@/lib/contexts/CurrencyContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

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
    <html lang="zh-CN">
      <body className="antialiased bg-[#FAFAF9] text-[#0C0A09]">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <CartProvider>
                <CurrencyProvider>
                  <Navbar />
                  <main className="pt-16">
                    {children}
                  </main>
                  <Footer />
                </CurrencyProvider>
              </CartProvider>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
