import type { Metadata, Viewport } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Gỡ Rối Tâm", template: "%s · Gỡ Rối Tâm" },
  description: "Nơi chia sẻ điều khó nói, hiểu giáo lý Phật giáo và thực hành mỗi ngày để chuyển hóa.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#faf6ee" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
