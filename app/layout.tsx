import type { Metadata } from "next";
import { Merriweather, Heebo, M_PLUS_1_Code } from "next/font/google";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { app } from "@/lib/app-config";

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin"],
  display: "swap",
});

const mPlus1Code = M_PLUS_1_Code({
  variable: "--font-m-plus-1-code",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: app.name,
    template: `%s · ${app.name}`,
  },
  description: app.tagline,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${merriweather.variable} ${heebo.variable} ${mPlus1Code.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
