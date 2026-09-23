import type { Metadata } from "next";
import { Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], variable: "--font-pixel" });
const term = VT323({ weight: "400", subsets: ["latin"], variable: "--font-term" });

export const metadata: Metadata = {
  title: "DevServer RPG",
  description: "RPG pixel art para devs",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${pixel.variable} ${term.variable}`}>
      <body>{children}</body>
    </html>
  );
}
