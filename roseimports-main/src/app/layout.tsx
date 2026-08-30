import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { site } from "@/lib/config/site";
import { CartProvider } from "@/features/cart/cart-context";
import "./globals.css";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
});

const socialImage = new URL("/og.png", site.url).toString();

export const metadata: Metadata = {
  metadataBase: new URL(site.url),

  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s · ${site.name}`,
  },

  description: site.description,

  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: site.name,
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [
      {
        url: socialImage,
        width: 1536,
        height: 864,
        alt: "Rose Imports — Perfumes e cosméticos importados",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: `${site.name} — ${site.tagline}`,
    description: site.description,
    images: [socialImage],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={nunito.variable}>
      <body className="font-sans antialiased">
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}