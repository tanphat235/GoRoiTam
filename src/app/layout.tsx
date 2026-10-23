import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, Lora, Playfair_Display } from "next/font/google";
import { Shell } from "@/components/shell";
import { themeScript } from "@/components/theme-toggle";
import "./globals.css";

// Both fonts ship the Vietnamese subset so stacked diacritics (ố, ề, ữ...) render correctly.
const sans = Be_Vietnam_Pro({ subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"], variable: "--font-be-vietnam", display: "swap" });
const serif = Lora({ subsets: ["latin", "vietnamese"], variable: "--font-lora", display: "swap" });
// Brand wordmark only.
const brand = Playfair_Display({ subsets: ["latin", "vietnamese"], weight: ["600"], variable: "--font-playfair", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Gỡ Rối Tâm", template: "%s · Gỡ Rối Tâm" },
  description: "Hỏi · Hiểu · An Lạc. Nơi chia sẻ điều khó nói, hiểu giáo lý Phật giáo và thực hành mỗi ngày.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f7f1" },
    { media: "(prefers-color-scheme: dark)", color: "#141814" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${sans.variable} ${serif.variable} ${brand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
